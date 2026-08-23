import { useEffect, useState } from 'react';

type PdfStatus = 'checking' | 'available' | 'missing';

export function usePdfAvailable(src: string): PdfStatus {
  const [result, setResult] = useState<{ src: string; status: PdfStatus }>({
    src,
    status: 'checking',
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(src, { method: 'HEAD' });
        if (!cancelled) {
          setResult({ src, status: res.ok ? 'available' : 'missing' });
        }
      } catch {
        if (!cancelled) setResult({ src, status: 'missing' });
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return result.src === src ? result.status : 'checking';
}
