export interface SourceWord { text: string; x: number; width: number; confidence: number }
export interface SourceLine { text: string; x: number; y: number; width: number; height: number; confidence: number; uncertainWords?: string[]; words?: SourceWord[] }
export interface SourceLayout { version: 1; width: number; height: number; blocks: { text: string; lines: SourceLine[] }[] }
export const sourceImageFormats = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'gif', 'avif'];

/** Reject invalid geometry and fall back to the complete supplied text. */
export function validSourceLayout(value: unknown, text?: string): value is SourceLayout {
  if (!value || typeof value !== 'object') return false;
  const v = value as SourceLayout;
  return v.version === 1 && Number.isFinite(v.width) && v.width > 0 && Number.isFinite(v.height) && v.height > 0 && v.width / v.height > .05 && v.width / v.height < 20 &&
    Array.isArray(v.blocks) && v.blocks.length > 0 && v.blocks.length <= 5000 && v.blocks.reduce((sum, block) => sum + (Array.isArray(block?.lines) ? block.lines.length : 0), 0) <= 5000 && (text === undefined || v.blocks.every(block => block && typeof block.text === 'string') && v.blocks.map(block => block.text).join(' ').replace(/\s+/g, ' ').trim() === text.replace(/\s+/g, ' ').trim()) && v.blocks.every(block => block && typeof block.text === 'string' && Array.isArray(block.lines) && block.lines.length > 0 && block.lines.length <= 5000 && block.lines.every(line =>
      line && typeof line.text === 'string' && [line.x, line.y, line.width, line.height, line.confidence].every(Number.isFinite) && line.x >= 0 && line.y >= 0 && line.width > 0 && line.height > 0 && line.x + line.width <= 1.002 && line.y + line.height <= 1.002 && line.confidence >= 0 && line.confidence <= 1 &&
      (line.words === undefined || Array.isArray(line.words) && line.words.length <= 1000 && line.words.every(word => word && typeof word.text === 'string' && [word.x, word.width, word.confidence].every(Number.isFinite) && word.x >= 0 && word.width > 0 && word.x + word.width <= 1.002 && word.confidence >= 0 && word.confidence <= 1) && line.words.map(word => word.text).join(' ') === line.text) && (line.uncertainWords === undefined || Array.isArray(line.uncertainWords) && line.uncertainWords.every(word => typeof word === 'string'))));
}

/** Reflow only prose inside a supplied paragraph; retain lists, blanks and tabular rows. */
export function readableParagraph(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const fixed = (s: string) => /^\s*(?:[•●▪*+-]\s|\(?\d+[.)]\s|[A-D][.)]\s)/.test(s) || /\t|\S {3,}\S|_{2,}|…{2,}|\.{4,}/.test(s);
  return lines.reduce((out, line, index) => {
    const previous = lines[index - 1];
    const join = previous && previous.length >= 55 && line.trim() && !fixed(previous) && !fixed(line) && !previous.trimEnd().endsWith(':') && !/^\s*[A-Z\d\s:–—/-]{3,}$/.test(line);
    return out + (index ? join ? ' ' : '\n' : '') + line;
  }, '');
}

/** Prefer source positions for tables/forms or parallel columns in a photo. */
export function sourceHasColumns(value: unknown): boolean {
  if (!validSourceLayout(value)) return false;
  if (value.blocks.some(block => block.lines.some(line => line.words?.some((word,i,words) => i > 0 && word.x - words[i-1].x - words[i-1].width > .06)))) return true;
  const boxes = value.blocks.map(block => ({left:Math.min(...block.lines.map(l=>l.x)),right:Math.max(...block.lines.map(l=>l.x+l.width)),top:Math.min(...block.lines.map(l=>l.y)),bottom:Math.max(...block.lines.map(l=>l.y+l.height))}));
  return boxes.some((a,i)=>boxes.slice(i+1).some(b=>(a.right + .04 < b.left || b.right + .04 < a.left) && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top) >= Math.min(a.bottom-a.top,b.bottom-b.top)*.5));
}
