import { HighlightedReadingText } from './ReadingEvidence';

import type { Block } from '../lib/sourceBlocks';

export function StructuredSourceText({ blocks }: { blocks: Block[] }) {
  return <div className="material-readable-text recognised-reader structured-source">{blocks.map((block, index) => {
    if (block.kind === 'list') {
      const List = block.ordered ? 'ol' : 'ul';
      return <List key={index} start={block.ordered ? block.start : undefined}>{block.items.map((item, i) => <li key={i}><HighlightedReadingText text={item} /></li>)}</List>;
    }
    if (block.kind === 'table') return <div key={index} className="source-table-scroll" role="region" aria-label="Source table" tabIndex={0}><table><tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => {
      const CellTag = cell.header ? 'th' : 'td';
      return <CellTag key={c} colSpan={cell.colSpan} rowSpan={cell.rowSpan}><HighlightedReadingText text={cell.text} /></CellTag>;
    })}</tr>)}</tbody></table></div>;
    if (block.kind === 'pre') return <div className="recognised-fixed-scroll" key={index}><pre>{block.text}</pre></div>;
    const Tag = block.kind === 'heading' ? block.level === 2 ? 'h2' : block.level === 4 ? 'h4' : 'h3' : 'p';
    return <Tag key={index} dir="auto"><HighlightedReadingText text={block.text} /></Tag>;
  })}</div>;
}
