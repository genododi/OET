/** Source-labelled editions only. File timestamps and clinical dates are not production dates. */
export function sourceYear(name = '', tags = '') {
  const explicit = [...tags.matchAll(/(?:^|\s)(?:production[_-]?year|edition|year)::(19\d{2}|20\d{2})(?=\s|$)/gi)].map(match => Number(match[1]));
  const named = [...name.matchAll(/(?:^|[^\d])(19\d{2}|20\d{2})(?=[^\d]|$)/g)].map(match => Number(match[1]));
  const current = new Date().getFullYear();
  const years = [...new Set(explicit.length ? explicit : named)].filter(year => year >= 1990 && year <= current + 1).sort((a,b) => b-a);
  return { productionYear: years[0] ?? null, productionYears: years, yearEvidence: years.length ? [`${explicit.length ? 'Source edition tag' : 'Source filename'}: ${name}${explicit.length ? ` (${tags.match(/(?:production[_-]?year|edition|year)::\d{4}/gi)?.join(', ')})` : ''}`] : [] };
}
export function mergeSourceYears(before = {}, after = {}) {
  const years = [...new Set([...(before.productionYears ?? (before.productionYear ? [before.productionYear] : [])), ...(after.productionYears ?? (after.productionYear ? [after.productionYear] : []))])].sort((a,b)=>b-a);
  return { productionYear: years[0] ?? null, productionYears: years, yearEvidence: [...new Set([...(before.yearEvidence ?? []), ...(after.yearEvidence ?? [])])] };
}
