"""Read presentation paragraphs in slide order, with optional local image OCR."""
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from ocr_layout import from_vision

VERSION=2
NS={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
AUDIO={'.mp3','.m4a','.wav','.ogg','.flac','.aac','.webm'}

def plain_text(source):
    raw=source.read_bytes()
    for encoding in (['utf-16'] if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else ['utf-8-sig','cp1252']):
        try:return raw.decode(encoding)
        except UnicodeError:pass
    return raw.decode('utf-8',errors='replace')

def relationships(document,part):
    name=posixpath.join(posixpath.dirname(part),'_rels',posixpath.basename(part)+'.rels')
    if name not in document.namelist():return {}
    tree=ET.fromstring(document.read(name));result={}
    for row in tree:
        if row.get('TargetMode')=='External':continue
        target=posixpath.normpath(posixpath.join(posixpath.dirname(part),row.get('Target','')))
        if target.startswith('ppt/') and '..' not in PurePosixPath(target).parts:result[row.get('Id')]=target
    return result

def slide_paths(document):
    if 'ppt/presentation.xml' in document.namelist():
        tree=ET.fromstring(document.read('ppt/presentation.xml'));rels=relationships(document,'ppt/presentation.xml')
        names=[rels.get(node.get('{'+NS['r']+'}id')) for node in tree.findall('p:sldIdLst/p:sldId',NS)]
        if names and all(name in document.namelist() for name in names):return names
    return sorted((n for n in document.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)),key=lambda n:int(re.search(r'(\d+)\.xml$',n)[1]))

def paragraphs(tree):
    result=[]
    for paragraph in tree.findall('.//a:p',NS):
        chunks=[]
        for node in paragraph.iter():
            if node.tag=='{'+NS['a']+'}t':chunks.append(node.text or '')
            elif node.tag=='{'+NS['a']+'}br':chunks.append('\n')
        text=''.join(chunks).strip()
        if text:
            bullet=paragraph.find('a:pPr/a:buChar',NS)
            result.append((bullet.get('char','•')+' ' if bullet is not None else '')+text)
    return '\n'.join(result)

def image_text(data,suffix,root):
    binary=root/'tmp/oet-recognize-source';swift=root/'scripts/recognize-source-text.swift'
    if not binary.exists():
        if not shutil.which('swiftc'):return None
        binary.parent.mkdir(exist_ok=True);subprocess.run(['swiftc',str(swift),'-o',str(binary)],capture_output=True,check=True,timeout=120)
    with tempfile.TemporaryDirectory(prefix='oet-slide-') as temporary:
        image=Path(temporary)/('slide'+suffix);image.write_bytes(data)
        subprocess.run([str(binary),str(image)],capture_output=True,check=True,timeout=90)
        observations=json.loads(image.with_suffix('.vision.json').read_text())
        dimensions=subprocess.check_output(['sips','-g','pixelWidth','-g','pixelHeight',str(image)],text=True,timeout=30)
        width=int(re.search(r'pixelWidth:\s*(\d+)',dimensions)[1]);height=int(re.search(r'pixelHeight:\s*(\d+)',dimensions)[1])
        return from_vision(observations,width,height)

def presentation_text(source,sha,root,recognise=True):
    if source.suffix.lower()=='.ppt':
        interpreter=Path.home()/'Library/Application Support/OET Study/library-sync/presentation-tools/bin/python'
        if not interpreter.is_file():raise ValueError('Legacy PowerPoint text tools are not installed; keep the original for a later import.')
        data=json.loads(subprocess.check_output([str(interpreter),str(root/'scripts/read-legacy-ppt.py'),str(source)],timeout=90))
        return dict(sourceSha256=sha,formatExtractionVersion=VERSION,**data)
    pages=[]
    with zipfile.ZipFile(source) as document:
        for number,name in enumerate(slide_paths(document),1):
            tree=ET.fromstring(document.read(name));text=paragraphs(tree);page=dict(number=number,text=text,extraction='text' if text else 'none',label=f'Slide {number}')
            if not text and recognise:
                rels=relationships(document,name)
                images=[rels.get(node.get('{'+NS['r']+'}embed')) for node in tree.findall('.//a:blip',NS)]
                # A single full-slide picture has an unambiguous page layout.
                if len(images)==1 and images[0] in document.namelist():
                    try:
                        recognised=image_text(document.read(images[0]),Path(images[0]).suffix,root)
                        if recognised:
                            page.update(recognised,extraction='ocr')
                            preview=f'imported-resources/previews/{sha}-slide-{number}{Path(images[0]).suffix.lower()}'
                            target=root/'public'/preview;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(document.read(images[0]));page['previewPath']=preview
                    except (OSError,ValueError,TypeError,subprocess.SubprocessError):pass
            pages.append(page)
    return {'sourceSha256':sha,'formatExtractionVersion':VERSION,'text':'\n\f\n'.join(page['text'] for page in pages),'pages':pages}

def embedded_audio(document):
    """Only embedded regular media; never follow a presentation's external links."""
    return [entry for entry in document.infolist() if entry.filename.startswith('ppt/media/') and Path(entry.filename).suffix.lower() in AUDIO and 0<entry.file_size<=2*1024**3]
