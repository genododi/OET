import { Fragment } from 'react';
import { readableParagraph, validSourceLayout } from '../lib/sourceTextLayout';
import './recognisedSourceText.css';
export function RecognisedSourceText({ text, layout, pageLayout = false }: { text: string; layout?: unknown; pageLayout?: boolean }) {
  const valid = validSourceLayout(layout, text) ? layout : null;
  if (valid && pageLayout) return <div className="recognised-page-scroll" tabIndex={0} role="region" aria-label="Recognised text in page layout"><svg className="recognised-page" viewBox={`0 0 ${valid.width} ${valid.height}`} role="group" aria-label="Selectable text preserving the source page positions">
    {valid.blocks.flatMap((block, b) => block.lines.map((line, l) => <text key={`${b}-${l}`} x={line.x * valid.width} y={(line.y + line.height * .88) * valid.height} fontSize={line.height * valid.height * .94} {...(!line.words?.length ? {textLength: line.width * valid.width,lengthAdjust:'spacingAndGlyphs' as const} : {})} className={!line.words?.length && line.uncertainWords?.length ? 'recognised-uncertain' : undefined}>
      {line.words?.length ? line.words.map((word,w) => <Fragment key={w}>{w > 0 ? ' ' : null}<tspan x={word.x * valid.width} textLength={word.width * valid.width} lengthAdjust="spacingAndGlyphs" className={word.confidence < .6 ? 'recognised-uncertain' : undefined}>{word.confidence < .6 ? <title>Check original wording: {word.text}</title> : null}{word.text}</tspan></Fragment>) : <>{line.uncertainWords?.length ? <title>Check original wording: {line.uncertainWords.join(', ')}</title> : null}{line.text}</>}
    </text>))}

  </svg></div>;
  const uncertain = new Set(valid?.blocks.flatMap(block => block.lines.flatMap(line => line.uncertainWords ?? [])) ?? []);
  const uncertainParagraphs = new Set(valid?.blocks.filter(block => block.lines.some(line => line.uncertainWords?.includes(line.text))).map(block => block.text) ?? []);
  return <div className="material-readable-text recognised-reader">{(valid ? valid.blocks.map(block => block.text) : text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/)).map((paragraph, i) => paragraph.trim() ? <p key={i} dir="auto">{uncertainParagraphs.has(paragraph) ? <mark className="recognised-word-uncertain" title="Uncertain recognition: check the original">{readableParagraph(paragraph)}</mark> : readableParagraph(paragraph).split(/(\s+)/).map((word, index) => uncertain.has(word) ? <mark key={index} className="recognised-word-uncertain" title="Uncertain recognition: check the original">{word}</mark> : word)}</p> : null)}</div>;
}
