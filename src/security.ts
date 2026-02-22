const ENCRYPTION_SECRET_KEY = 'offline.encryption.secret.v1';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Uint8Array(bytes);
}

async function deriveAes256Key(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('tn-farmers-offline-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function getOrCreateEncryptionSecret(): string {
  const existingSecret = localStorage.getItem(ENCRYPTION_SECRET_KEY);
  if (existingSecret) {
    return existingSecret;
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const generatedSecret = bytesToBase64(randomBytes);
  localStorage.setItem(ENCRYPTION_SECRET_KEY, generatedSecret);
  return generatedSecret;
}

export async function encryptJson(value: unknown, secret: string): Promise<string> {
  const key = await deriveAes256Key(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedPayload = new TextEncoder().encode(JSON.stringify(value));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedPayload
  );

  return JSON.stringify({
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encryptedBuffer)),
  });
}

export async function decryptJson<T>(encryptedValue: string, secret: string): Promise<T> {
  const parsed = JSON.parse(encryptedValue) as { iv: string; payload: string };
  const key = await deriveAes256Key(secret);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(parsed.iv),
    },
    key,
    base64ToBytes(parsed.payload)
  );

  const decoded = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decoded) as T;
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(digest);
  let hex = '';

  for (let index = 0; index < bytes.length; index += 1) {
    hex += bytes[index].toString(16).padStart(2, '0');
  }

  return hex;
}