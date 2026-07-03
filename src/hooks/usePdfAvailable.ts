import { useEffect, useState } from 'react';

type PdfStatus = 'checking' | 'available' | 'missing';

export function usePdfAvailable(src: string): PdfStatus {
  const [status, setStatus] = useState<PdfStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(src, { method: 'HEAD' });
        if (!cancelled) {
          setStatus(res.ok ? 'available' : 'missing');
        }
      } catch {
        if (!cancelled) setStatus('missing');
      }
    }

    setStatus('checking');
    check();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return status;
}
