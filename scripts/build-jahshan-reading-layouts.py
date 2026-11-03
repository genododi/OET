#!/usr/bin/env python3
"""Create per-page source geometry for optional yellow study overlays."""
import argparse
import json
from pathlib import Path
from pdf_layout import pdf_display_pages
ROOT=Path(__file__).resolve().parents[1]
SHA='e41a1df70a74341806de8943a4a8c66be832f4513379e3f3ea92ae8ff633f6b4'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
    native=pdf_display_pages(args.source)
    stored=json.loads((ROOT/f'public/imported-resources/text/{SHA}.json').read_text())
    pages={p['number']:p for p in stored['pages']};output=ROOT/'public/jahshan-reading-layouts';output.mkdir(exist_ok=True)
    manifest=json.loads((ROOT/'src/data/jahshanReadingPages.json').read_text())
    wanted={p for t in manifest['tests'] for pages in t['parts'].values() for p in pages};written=0
    for number in sorted(wanted):
        page=pages.get(number,{});display=native[number-1] or page.get('display') or ({'text':page['text'],'layout':page['layout']} if page.get('layout') else None)
        if not display:continue
        (output/f'{number}.json').write_text(json.dumps(display,ensure_ascii=False,separators=(',',':')));written+=1
    print(json.dumps({'requestedPages':len(wanted),'geometryPages':written}))

if __name__=='__main__':main()
