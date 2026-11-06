"""Local, vocabulary-aware ASR without rewriting the recording's clinical facts.

Whisper retains its native speech-window boundaries. Printed keys are never
prompt input. Confidence is a replay cue, not a grade.
"""
import difflib
import math
import re
from pathlib import Path
import json

PROFILE = 'medical-english-v1'
SAMPLE_RATE = 16000
VOCABULARY = (
    'arrhythmia', 'tachyarrhythmia', 'bradycardia', 'tachycardia',
    'electrocardiogram', 'ECG', 'heart murmur', 'heart block', 'pacemaker',
    'Stokes-Adams', 'myocardial infarction', 'atrial fibrillation',
    'hypertension', 'hypotension', 'syncope', 'dyspnoea', 'dyspnea',
    'oedema', 'edema', 'haemoglobin', 'hemoglobin', 'anaemia', 'anemia',
    'hypothyroidism', 'hyperthyroidism', 'thyroxine', 'levothyroxine',
    'hypoglycaemia', 'hypoglycemia', 'hyperglycaemia', 'hyperglycemia',
    'diabetes', 'insulin', 'metformin', 'HbA1c', 'glucose',
    'sleep apnoea', 'sleep apnea', 'asthma', 'salbutamol', 'albuterol',
    'pneumonia', 'bronchodilator', 'corticosteroid', 'spirometry',
    'anaphylaxis', 'adrenaline', 'epinephrine', 'urticaria',
    'anticoagulant', 'warfarin', 'apixaban', 'clopidogrel',
    'amoxicillin', 'amoxicillin-clavulanate', 'penicillin', 'cefalexin',
    'paracetamol', 'acetaminophen', 'ibuprofen', 'omeprazole',
    'fluoxetine', 'sertraline', 'citalopram', 'amitriptyline',
    'rheumatoid arthritis', 'osteoarthritis', 'osteoporosis',
    'dysphagia', 'dysphasia', 'aphasia', 'haematuria', 'hematuria',
    'creatinine', 'eGFR', 'renal', 'urinary tract infection',
    'appendicitis', 'cholecystitis', 'gastro-oesophageal reflux',
    'colonoscopy', 'ileostomy', 'colostomy', 'biopsy', 'malignancy',
    'pre-eclampsia', 'gestation', 'postpartum', 'menorrhagia',
    'neuropathy', 'paraesthesia', 'paresthesia', 'sciatica',
    'thrombosis', 'pulmonary embolism', 'sepsis', 'cellulitis',
    'milligrams', 'micrograms', 'millilitres', 'milliliters', 'mmHg',
)
COMMON = ('arrhythmia', 'tachyarrhythmia', 'bradycardia', 'electrocardiogram', 'ECG', 'hypertension',
          'diabetes', 'hypoglycaemia', 'hypoglycemia', 'dyspnoea', 'dyspnea',
          'oedema', 'edema', 'paracetamol', 'acetaminophen', 'milligrams',
          'micrograms', 'millilitres', 'mmHg', 'hypothyroidism', 'hyperthyroidism',
          'haemoglobin', 'hemoglobin', 'salbutamol', 'albuterol', 'metformin', 'insulin', 'fluoxetine')
NORMAL = lambda text: re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()


def vocabulary(context=''):
    """Prefer terms present in the matched question, never the answer key."""
    text = ' ' + NORMAL(context) + ' '
    relevant = [term for term in VOCABULARY if ' ' + NORMAL(term) + ' ' in text]
    return list(dict.fromkeys([*relevant, *COMMON]))[:32]


def prompt_for(context='', dialect='auto'):
    region = {'uk': 'British English', 'australia': 'Australian English',
              'us': 'American English'}.get(dialect, 'British, Australian and American English')
    return f'Healthcare conversation in {region}. Vocabulary: ' + ', '.join(vocabulary(context)) + '.'


def recording_context(sha, root):
    """Read only question-side fields from this exact recording's practice sheet."""
    root = Path(root)
    try:
        index = json.loads((root/'public/material-practice/index.json').read_text())
        row = index['files'].get(sha, {})
        relative = row.get('sheetPath', '')
        if not relative.startswith('material-practice/sheets/') or '..' in Path(relative).parts:
            return ''
        sheet = json.loads((root/'public'/relative).read_text())
        if sheet.get('sourceSha256') != sha:
            return ''
        pieces = []
        for unit in sheet.get('units', []):
            pieces.append(str(unit.get('label', '')))
            for question in unit.get('questions', []):
                # No recursive traversal: nested answer/source-key text is excluded.
                for field in ('prompt', 'text', 'heading'):
                    if isinstance(question.get(field), str):
                        pieces.append(question[field])
        return '\n'.join(pieces)[:20000]
    except (OSError, ValueError, KeyError, TypeError):
        return ''


def review_terms(words):
    """Flag uncertain medical words and close spelling confusions; never replace."""
    terms = []
    single = {NORMAL(t): t for t in VOCABULARY if ' ' not in t}
    for word in words:
        heard = word.get('word', '').strip(' .,;:!?\"')
        token = NORMAL(heard)
        probability = word.get('probability')
        low = isinstance(probability, (float, int)) and math.isfinite(probability) and probability < .55
        near = []
        if len(token) >= 7 and token not in single:
            near = difflib.get_close_matches(token, single, n=2, cutoff=.82)
        if (token in single and low) or near:
            terms.append(heard)
        # Numbers, units and negation must be checked, never 'corrected' to a
        # plausible dose or a different positive/negative clinical statement.
        elif low and (re.search(r'\d', heard) or token in {'no', 'not', 'without', 'mg', 'mcg', 'ml', 'micrograms', 'milligrams'}):
            terms.append(heard)
    return list(dict.fromkeys(terms))


def local_model(model):
    if model == 'mlx-community/whisper-large-v3-turbo':
        local = Path.home()/'Library/Application Support/OET Study/local-ai/transcription/local-models/whisper-large-v3-turbo'
        if (local/'weights.safetensors').is_file() and (local/'config.json').is_file():
            return str(local)
    return model


def transcribe_medical(audio, *, model, context='', dialect='auto', transcribe=None, load_audio=None):
    if transcribe is None:
        import mlx_whisper
        transcribe = mlx_whisper.transcribe
    if load_audio is None:
        from mlx_whisper.audio import load_audio
    model = local_model(model)
    samples = load_audio(str(audio))
    duration = len(samples) / SAMPLE_RATE
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError('Empty or invalid recording')
    result = transcribe(samples, path_or_hf_repo=model, language='en',
        initial_prompt=prompt_for(context, dialect),
        condition_on_previous_text=False, temperature=0, word_timestamps=True,
        verbose=None)
    segments = []
    for segment in result.get('segments', []):
        text = segment.get('text', '').strip()
        start, end = float(segment['start']), float(segment['end'])
        if not text or not math.isfinite(start) or not math.isfinite(end) or end < start or start >= duration:
            continue
        row = {'start': round(max(0, start), 2), 'end': round(min(duration, end), 2), 'text': text}
        review = review_terms(segment.get('words', []))
        if review:
            row['reviewTerms'] = review
        segments.append(row)
    if not segments:
        raise ValueError('No aligned intelligible speech recognised; existing transcript preserved')
    return {'language': 'en', 'segments': segments, 'duration': duration,
            'recognitionProfile': {'id': PROFILE, 'dialectHint': dialect,
                'vocabulary': vocabulary(context), 'windowing': 'whisper-native',
                'wordTimestamps': True, 'clinicalTextAutoReplaced': False}}
