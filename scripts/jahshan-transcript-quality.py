"""Replace repetitive ASR failure loops with an explicit, seekable uncertainty marker."""
from itertools import groupby


def mark_uncertain_repetitions(segments):
    cleaned = []
    uncertain = []
    for text, items in groupby(segments, key=lambda segment: segment['text'].strip()):
        run = list(items)
        if len(run) >= 5 or not any(c.isalnum() for c in text):
            start, end = run[0]['start'], run[-1]['end']
            cleaned.append(dict(start=start, end=end, text='[Unclear interval — replay the original audio.]'))
            uncertain.append(dict(start=start, end=end, reason='Repetitive or nonverbal recognition output'))
        else:
            cleaned.extend(run)
    return cleaned, uncertain
