export function toImageUrl(baseUrl: string, relativeUrl: string | null | undefined): string | undefined {
  if (!relativeUrl) return undefined;
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) return relativeUrl;
  return `${baseUrl.replace(/\/+$/, '')}${relativeUrl}`;
}

export function baseUrlFromRequest(req: { protocol: string; headers: { host?: string } }): string {
  return `${req.protocol}://${req.headers.host ?? 'localhost:3000'}`;
}
