export const LOCAL_SOURCE_GATEWAY_ORIGIN = 'http://127.0.0.1:4318';

/**
 * The public app can never read /Volumes directly. This localhost URL is
 * handled by the read-only gateway installed on the learner's Mac.
 */
export function localSourceFileUrl(relativePath: string): string {
  return `${LOCAL_SOURCE_GATEWAY_ORIGIN}/file?path=${encodeURIComponent(relativePath)}`;
}


/** The HTTP gateway is only offered from an HTTP loopback app, never a hosted page. */
export function canConnectLocalSource(location: Pick<Location, 'protocol' | 'hostname'> = window.location): boolean {
  return location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}
