"""Build numbered question rows from the supplied, already-extracted paper text.

Question identity is (test, part, section order), with printed numbering retained in notes. Never infer answers from prose.
The source-page links retain access to diagrams and the original formatting.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'src/data/benchmarkCollection.json').read_text())


def clean(text):
    return re.sub(r'[ \t]+', ' ', text.replace('', '').replace('•', '')).strip()


def document(entry):
    pages = json.loads((ROOT / 'public' / entry['textPath']).read_text())['pages']
    text, locations = '', []
    for page in pages:
        # Remove only the final printed page number, not question-number lines.
        lines = page['text'].rstrip().splitlines()
        if lines and lines[-1].strip() == str(page['number']):
            lines.pop()
        locations.append((len(text), page['number']))
        text += '\n'.join(lines) + '\n\n'
    return text, locations


def extract(entry):
    text, locations = document(entry)
    questions = []
    notes = []
    reading_parts = {}

    def add(part, number, prompt, offset, group):
        prompt = clean(prompt)
        assert len(prompt) > 5, (entry['id'], part, number, prompt)
        page = next(p for pos, p in reversed(locations) if pos <= offset)
        questions.append(dict(part=part, number=number, prompt=prompt, sourcePage=page, group=group))

    if entry['skill'] == 'listening':
        headings = list(re.finditer(r'^Practice Test[^\n]*Part ([ABC])[^\n]*', text, re.M))
        assert len(headings) == 5, entry['id']
        for i, heading in enumerate(headings):
            end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
            body = text[heading.end():end]
            part = heading[1]
            group = re.search(r'Extract [12]', heading[0])
            group = group[0] if group else 'Short workplace conversations'
            if part == 'A':
                content, cursor = [], 0
                for gap in re.finditer(r'(?<![\d\-])\(?(\d{1,2})\)', body):
                    if not 1 <= int(gap[1]) <= 24:
                        continue
                    content.append({'text': re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', body[cursor:gap.start()].replace('', '•')))})
                    content.append({'number': int(gap[1])})
                    cursor = gap.end()
                content.append({'text': re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', body[cursor:].replace('', '•')))})
                notes.append({'group': group, 'content': content})
                for marker in re.finditer(r'(?<![\d\-])\(?(\d{1,2})\)', body):
                    number = int(marker[1])
                    if not 1 <= number <= 24:
                        continue
                    # Keep the complete paragraph around the blank, including wraps.
                    start = body.rfind('\n\n', 0, marker.start()) + 2
                    stop = body.find('\n\n', marker.end())
                    if stop < 0:
                        stop = len(body)
                    prompt = body[start:stop]
                    if clean(prompt) == marker[0]:
                        start = body.rfind('\n\n', 0, max(0, start - 2)) + 2
                        prompt = body[start:stop]
                    relative = marker.start() - start
                    prompt = prompt[:relative] + ' ____ ' + prompt[relative + len(marker[0]):]
                    prompt = re.sub(r'(?<![\d\-])\(?(\d{1,2})\)', r'[blank for Q\1]', prompt)
                    add(part, number, prompt, heading.end() + marker.start(), group)
            else:
                markers = list(re.finditer(r'^\s*[•]?\s*(\d{2})\s*$', body, re.M))
                for j, marker in enumerate(markers):
                    stop = markers[j + 1].start() if j + 1 < len(markers) else len(body)
                    prompt = body[marker.end():stop].strip()
                    prompt = re.sub(r'^\s*o\s+([ABC])', r'\1. ', prompt, flags=re.M)
                    prompt = re.sub(r'\n\s*o\s*$', '', prompt)
                    add(part, int(marker[1]), prompt, heading.end() + marker.start() + len(marker[0]) - len(marker[0].lstrip()), group)
    else:
        # Books 11 and 20 misprint a part heading. The three sections still occur
        # in A/B/C order, with their own complete expected numbering sequences.
        headings = list(re.finditer(r'^\s*PART [ABC]\s*$', text, re.M))
        assert len(headings) == 3, (entry['id'], len(headings))
        for i, heading in enumerate(headings):
            part = 'ABC'[i]
            stop = headings[i + 1].start() if i < 2 else len(text)
            body = text[heading.end():stop]
            section_start = 0 if part == 'A' else heading.start()
            reading_parts[part] = []
            for page_index, (page_start, page_number) in enumerate(locations):
                page_end = locations[page_index + 1][0] if page_index + 1 < len(locations) else len(text)
                excerpt = text[max(section_start, page_start):min(stop, page_end)].strip() if page_end > section_start and page_start < stop else ''
                if excerpt:
                    reading_parts[part].append({'number': page_number, 'text': excerpt})
            if part == 'A':
                first = re.search(r'Questions\s+1\s*[-–]\s*7', body)
                assert first, entry['id']
                start = first.start()
                pattern = r'^\s*(\d{1,2})(?!\d)[.)]?\s*(?=[A-Za-z_0-9])'
            elif part == 'B':
                markers = list(re.finditer(r'^\s*Questions?(?: [1-6][-–][1-6])?\s*$', body, re.M))
                assert len(markers) == 6, (entry['id'], 'B headers', len(markers))
                for j, marker in enumerate(markers):
                    end = markers[j + 1].start() if j + 1 < len(markers) else len(body)
                    prompt = re.split(r'^\s*TEXT\s+\d', body[marker.end():end], maxsplit=1, flags=re.M)[0].strip()
                    printed = re.match(r'(\d+)[.)]\s*', prompt)
                    if printed:
                        prompt = prompt[printed.end():]
                    add(part, j + 1, prompt, heading.end() + marker.end(), f'Text {j + 1}')
                    if not printed or int(printed[1]) != j + 1:
                        questions[-1]['numberingNote'] = f"Paper label: {printed[1] if printed else 'unnumbered'}. Saved as question {j + 1} for Text {j + 1}."
                continue
            else:
                start = 0
                pattern = r'^\s*(\d{1,2})[.)]\s+(?=\S)'
            markers = list(re.finditer(pattern, body[start:], re.M))
            for j, marker in enumerate(markers):
                number = j + 7 if part == 'C' else int(marker[1])
                if entry['id'] == 'reading-7' and part == 'A' and j == 14:
                    number = 15  # First of two consecutive questions printed as 16.
                end = markers[j + 1].start() + start if j + 1 < len(markers) else len(body)
                prompt = body[start + marker.end():end]
                # Stop before the following passage or instruction block.
                prompt = re.split(r'^\s*(?:TEXT\s+[A-D1-6]\b|Questions\s+\d|Question\s*$)', prompt, maxsplit=1, flags=re.M)[0]
                group = 'Match the text' if part == 'A' and number <= 7 else 'Short answers' if part == 'A' and number <= 14 else 'Complete the sentences' if part == 'A' else f'Text {number}' if part == 'B' else f'Text {1 if number <= 14 else 2}'
                add(part, number, prompt, heading.end() + start + marker.start() + len(marker[0]) - len(marker[0].lstrip()), group)
                if number != int(marker[1]):
                    questions[-1]['numberingNote'] = f'Paper label: {marker[1]}. Saved as question {number} in section order.'
    if entry['skill'] == 'reading':
        complete = ''.join(page['text'] for part in 'ABC' for page in reading_parts[part])
        assert re.sub(r'\s+', '', complete) == re.sub(r'\s+', '', text), entry['id']
    else:
        assert [node['number'] for block in notes for node in block['content'] if 'number' in node] == list(range(1, 25)), entry['id']
    for question in questions:
        if question['part'] == 'A':
            continue
        options = re.findall(r'^\s*([A-Da-d])[.)]\s', question['prompt'], re.M)
        if entry['id'] == 'reading-16' and question['part'] == 'B' and question['number'] == 6:
            labels = iter('ABC')
            question['prompt'] = re.sub(r'^\s*o\s+', lambda _: next(labels) + '. ', question['prompt'], flags=re.M)
            question['sourceNote'] = 'The paper uses unlabelled options; shown here as A–C in their printed order.'
            options = list('ABC')
        question['choices'] = [option.upper() for option in options]
        expected = list('ABCD' if entry['skill'] == 'reading' and question['part'] == 'C' else 'ABC')
        if entry['id'] == 'reading-18' and question['part'] == 'C' and question['number'] == 22:
            expected = list('ABC')
            question['sourceNote'] = 'Only three options are present in the supplied text. Use the original-question link to check the paper.'
        assert question['choices'] == expected, (entry['id'], question['part'], question['number'], options)
    for part, expected in [('A', range(1, 25 if entry['skill'] == 'listening' else 21)), ('B', range(25, 31) if entry['skill'] == 'listening' else range(1, 7)), ('C', range(31, 43) if entry['skill'] == 'listening' else range(7, 23))]:
        found = [q['number'] for q in questions if q['part'] == part]
        assert found == list(expected), (entry['id'], part, found)
    return dict(testId=entry['id'], sourceSha256=entry['sourceSha256'], questions=questions, notes=notes, readingParts=reading_parts)


if __name__ == '__main__':
    total = 0
    for entry in CATALOG['entries']:
        if entry['skill'] not in ('reading', 'listening'):
            continue
        result = extract(entry)
        path = ROOT / 'public/benchmark/questions' / (entry['id'] + '.json')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        total += len(result['questions'])
    print(f'Extracted {total} numbered questions from 40 source papers.')
