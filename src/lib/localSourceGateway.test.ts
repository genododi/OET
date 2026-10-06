import { expect, it } from 'vitest';
import { canConnectLocalSource } from './localSourceGateway';
it('never enables the HTTP gateway from HTTPS or remote HTTP origins', () => {
  for (const url of ['https://genododi.github.io/OET/', 'https://localhost/OET/', 'http://example.com/OET/']) {
    expect(canConnectLocalSource(new URL(url))).toBe(false);
  }
  expect(canConnectLocalSource(new URL('http://127.0.0.1:4173/OET/'))).toBe(true);
  expect(canConnectLocalSource(new URL('http://localhost:4173/OET/'))).toBe(true);
});
