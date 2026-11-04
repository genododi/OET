"""Preserve source notes and turn JSON data into readable, inert text."""
import json
import re
from presentation_text import plain_text

VERSION = 1

def label(value):
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', str(value)).replace('_', ' ').replace('-', ' ').strip().capitalize()

def json_lines(value, depth=0):
    if depth > 50: return [json.dumps(value, ensure_ascii=False)]
    if isinstance(value, dict):
        result=[]
        for key, item in value.items():
            if isinstance(item, (dict,list)):
                result.extend([label(key), *json_lines(item,depth+1), ''])
            else:result.append(label(key)+': '+('Not specified' if item is None else str(item).lower() if isinstance(item,bool) else str(item)))
        return result
    if isinstance(value,list):
        result=[]
        for index,item in enumerate(value):
            result.extend([f'Item {index+1}',*json_lines(item,depth+1),''] if isinstance(item,(dict,list)) else [f'{index+1}. '+str(item)])
        return result
    return ['Not specified' if value is None else str(value)]

def study_text(source,sha,format=None):
    content=plain_text(source);notice=''
    if (format or source.suffix.lstrip('.')).lower()=='json':
        try: content='\n'.join(json_lines(json.loads(content)))
        except (ValueError,RecursionError):notice='This JSON could not be decoded completely. The original text is shown for checking.'
    # Normalize line endings/empty lines, retaining indentation, doses, spelling,
    # numbered prompts and actual tabs. Literal backslash sequences stay literal.
    content=re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+','\n\n',content).strip('\n\ufeff')
    pages=[]
    for number,text in enumerate(content.split('\f'),1):
        entries=[]
        for paragraph in re.split(r'\n[ \t]*\n',text.strip()):
            if not paragraph.strip():continue
            table=sum('\t' in line for line in paragraph.splitlines())>=2
            heading=len(paragraph)<100 and '\n' not in paragraph and paragraph.isupper() and any(c.isalpha() for c in paragraph)
            entries.append({'kind':'pre' if table else 'heading' if heading else 'paragraph','text':paragraph,**({'level':3} if heading else {})})
        pages.append({'number':number,'text':text.strip(),'extraction':'text','blocks':entries})
    return {'sourceSha256':sha,'documentTextVersion':VERSION,'text':'\n\f\n'.join(p['text'] for p in pages),'pages':pages,**({'notice':notice} if notice else {})}
