import { afterEach, expect, it, vi } from 'vitest';
import { canonicalStudyUrl, isRepositoryStudyAsset, repositoryStudyUrl } from './repositoryAssets';
afterEach(()=>vi.unstubAllGlobals());
it('keeps documents, unrelated sites and desktop assets local while routing only declared originals',()=>{
 const file=`usmle-library/pages/${'a'.repeat(64)}.webp`;
 const asset=`${import.meta.env.BASE_URL}${file}`;
 expect(isRepositoryStudyAsset(file)).toBe(true);
 expect(isRepositoryStudyAsset('audio/listening/../private.mp3')).toBe(false);
 expect(isRepositoryStudyAsset('benchmark/files/listening.pdf')).toBe(false);
 expect(repositoryStudyUrl(asset)).toMatch(new RegExp(`^https://raw.githubusercontent.com/genododi/OET/(?:main|[a-f0-9]{40})/public/${file}$`));
 expect(repositoryStudyUrl(`https://unrelated.example/OET/${file}`)).toContain('unrelated.example');
 expect(repositoryStudyUrl('/OET/benchmark/files/listening.pdf')).toBe('/OET/benchmark/files/listening.pdf');
 vi.stubGlobal('oetDesktop',{});
 expect(repositoryStudyUrl(asset)).toBe(asset);
});
it('uses the same saved-media identity across source releases',()=>{
 const path='jahshan-audio/track.m4a';
 const first=`https://raw.githubusercontent.com/genododi/OET/${'a'.repeat(40)}/public/${path}`;
 const later=`https://raw.githubusercontent.com/genododi/OET/${'b'.repeat(40)}/public/${path}`;
 expect(canonicalStudyUrl(first)).toBe(`${window.location.origin}${import.meta.env.BASE_URL}${path}`);
 expect(canonicalStudyUrl(later)).toBe(canonicalStudyUrl(first));
});
