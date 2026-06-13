/* Edge-safe encoding helpers.
 *
 * Everything here runs in BOTH the Next.js edge runtime and Node (Vitest's
 * `node` env), so we avoid `Buffer` entirely and lean on the web globals
 * `btoa`/`atob` + `TextEncoder`/`TextDecoder`, which exist in both. */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** UTF-8 string -> bytes. */
export function utf8Bytes(s: string): Uint8Array {
  return encoder.encode(s);
}

/** bytes -> UTF-8 string. */
export function bytesUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

/** bytes -> binary "latin1" string (one char per byte) for btoa. */
function bytesToBinary(bytes: Uint8Array): string {
  let s = "";
  // Chunk to stay clear of call-stack limits on large inputs.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}

/** Base64url-encode a string (encoded as UTF-8) or raw bytes. No padding. */
export function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? utf8Bytes(input) : input;
  const b64 = btoa(bytesToBinary(bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url-decode to raw bytes. Throws on malformed input. */
export function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Base64url-decode straight to a UTF-8 string. */
export function b64urlDecodeToString(input: string): string {
  return bytesUtf8(b64urlDecode(input));
}

/** Constant-time equality over two byte arrays. Length mismatch -> false, but
 *  still walks the longer array so timing doesn't leak the length difference. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
