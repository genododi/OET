type Cell = { text: string; header: boolean; colSpan: number; rowSpan: number };
export type Block = { kind: 'heading' | 'paragraph' | 'pre'; text: string; level?: number } | { kind: 'list'; ordered: boolean; start: number; items: string[] } | { kind: 'table'; rows: Cell[][] };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
export function validSourceBlocks(value: unknown): value is Block[] {
  return Array.isArray(value) && value.length <= 20000 && value.every(block => {
    if (!record(block)) return false;
    if (['heading', 'paragraph', 'pre'].includes(String(block.kind))) return typeof block.text === 'string';
    if (block.kind === 'list') return typeof block.ordered === 'boolean' && Number.isSafeInteger(block.start) && Array.isArray(block.items) && block.items.every(item => typeof item === 'string');
    return block.kind === 'table' && Array.isArray(block.rows) && block.rows.every(row => Array.isArray(row) && row.every(cell => record(cell) && typeof cell.text === 'string' && typeof cell.header === 'boolean' && [cell.colSpan, cell.rowSpan].every(span => typeof span === 'number' && Number.isInteger(span) && span >= 1 && span <= 100)));
  });
}
