/**
 * Secure ID generator for share links and visitor identifiers
 */

export function generateShareId(length = 8): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz'; // readable characters without 0, 1, l, o ambiguity
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function generateVisitorId(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `Visitor-${num}`;
}

export function getOrCreateVisitorId(): string {
  const key = 'geovideo_visitor_id';
  let visitorId = localStorage.getItem(key);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(key, visitorId);
  }
  return visitorId;
}
