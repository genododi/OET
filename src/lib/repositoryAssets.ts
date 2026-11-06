// These unchanged originals stay in public GitHub source instead of the
// size-limited Pages artifact. The Mac keeps its complete local asset tree.
export function isRepositoryStudyAsset(path: string) {
  if (path.split('/').includes('..')) return false;
  return /^usmle-library\/pages\/[a-f0-9]{64}\.webp$/.test(path)
    || /^jahshan-audio\/[A-Za-z0-9_-]+\.m4a$/.test(path)
    || /^supplied-materials\/files\/[a-f0-9]{64}\.(mp3|m4a)$/.test(path)
    || /^audio\/listening\/[A-Za-z0-9_./-]+\.(mp3|m4a|wav|ogg)$/.test(path);
}

declare const __OET_RELEASE_COMMIT__: string;
export function canonicalStudyUrl(value: string) {
  const url = new URL(value, window.location.href);
  const source = url.origin === 'https://raw.githubusercontent.com' && /^\/genododi\/OET\/(?:main|[a-f0-9]{40})\/public\/(.+)$/.exec(url.pathname);
  return source && isRepositoryStudyAsset(source[1]) ? `${window.location.origin}${import.meta.env.BASE_URL}${source[1]}${url.search}` : url.href.split('#')[0];
}
export function repositoryStudyUrl(value: string) {
  if (typeof window === 'undefined' || window.oetDesktop) return value;
  if (/^(?:blob:|data:|oet:)/.test(value)) return value;
  const url = new URL(value, window.location.href);
  const base = import.meta.env.BASE_URL;
  if (url.origin !== window.location.origin || !url.pathname.startsWith(base)) return value;
  const path = url.pathname.slice(base.length);
  if (!isRepositoryStudyAsset(path)) return value;
  const revision = typeof __OET_RELEASE_COMMIT__ === 'string' ? __OET_RELEASE_COMMIT__ : 'main';
  return `https://raw.githubusercontent.com/genododi/OET/${revision}/public/${path}${url.search}${url.hash}`;
}
