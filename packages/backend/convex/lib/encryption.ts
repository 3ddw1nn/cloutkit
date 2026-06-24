// AES-256-GCM via the Web Crypto API (available in Convex's default V8
// runtime — no Node `crypto` module needed). Random IV generation requires
// `crypto.getRandomValues`, which Convex only allows inside actions, so
// every exported function here must be called from an action, never a
// query or mutation.

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getMasterKey(): Promise<CryptoKey> {
  const base64Key = process.env.APP_ENCRYPTION_KEY;
  if (!base64Key) throw new Error("APP_ENCRYPTION_KEY is not configured");

  return await crypto.subtle.importKey("raw", base64ToBytes(base64Key), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(
  plaintext: string,
): Promise<{ iv: string; ciphertext: string }> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptSecret(payload: { iv: string; ciphertext: string }): Promise<string> {
  const key = await getMasterKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

export function createSecretPreview(secret: string): string {
  if (secret.length <= 8) return `${secret.slice(0, 2)}...`;
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
