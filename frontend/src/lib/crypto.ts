// AES-256-GCM client-side encryption for report blobs.
// The server stores { iv, salt, ciphertext } — it cannot decrypt.
//
// Device key: a random 32-byte value generated once and stored in localStorage.
// Financial inputs are encrypted with this key before being sent to the server,
// so the server stores an opaque ciphertext it cannot read.

export function getOrCreateDeviceKey(): string {
  let key = localStorage.getItem('zkc_device_key')
  if (!key) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem('zkc_device_key', key)
  }
  return key
}

export async function encryptInputs(inputs: object): Promise<string> {
  return encryptReport(inputs, getOrCreateDeviceKey())
}

export async function decryptInputs(blob: string): Promise<object | null> {
  try {
    return await decryptReport(blob, getOrCreateDeviceKey())
  } catch {
    return null
  }
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptReport(data: object, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  )

  const payload = {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  }
  return JSON.stringify(payload)
}

export async function decryptReport(encrypted: string, password: string): Promise<object> {
  const { salt, iv, ciphertext } = JSON.parse(encrypted)

  const toBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const key = await deriveKey(password, toBytes(salt))

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBytes(iv) },
    key,
    toBytes(ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}
