// OAuth 1.0a signing for X (Twitter) API v2 user-context requests.
// X still requires OAuth 1.0a HMAC-SHA1 signatures for write operations,
// even though the request/response bodies use JSON (not form-encoded).

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

async function hmacSha1(key: string, message: string): Promise<string> {
  const keyData = new TextEncoder().encode(key);
  const messageData = new TextEncoder().encode(message);

  const hmacKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, [
    "sign",
  ]);

  const signature = await crypto.subtle.sign("HMAC", hmacKey, messageData);

  let base64 = "";
  const bytes = new Uint8Array(signature);
  for (const byte of bytes) {
    base64 += String.fromCharCode(byte);
  }
  return btoa(base64);
}

export async function buildOAuth1Header(params: {
  method: "GET" | "POST";
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  additionalParams?: Record<string, string>;
}): Promise<string> {
  const {
    method,
    url,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    additionalParams = {},
  } = params;

  const nonce = generateNonce();
  const timestamp = generateTimestamp();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...additionalParams };
  const sortedParams = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join("&");

  const baseString = `${method}&${percentEncode(url)}&${percentEncode(sortedParams)}`;

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, baseString);

  const authParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const authHeader = `OAuth ${Object.entries(authParams)
    .map(([k, v]) => `${k}="${percentEncode(v)}"`)
    .join(", ")}`;

  return authHeader;
}
