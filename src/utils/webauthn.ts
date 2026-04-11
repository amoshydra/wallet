import type { PasskeyCredential } from '../types/auth';

const CHALLENGE_LENGTH = 32;

export function isWebAuthnAvailable(): boolean {
  return !!window.PublicKeyCredential;
}

export async function canUsePasskey(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function toArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateChallenge(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(CHALLENGE_LENGTH) as Uint8Array<ArrayBuffer>);
}

export async function createPasskey(): Promise<PasskeyCredential> {
  const challenge = generateChallenge();
  const userId = crypto.getRandomValues(new Uint8Array(16));

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Wallet',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: 'wallet-user',
          displayName: 'Wallet User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          // Allow both platform (Touch ID) and roaming (Bitwarden) authenticators
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential;

    return {
      credentialId: toBase64(credential.rawId),
    };
  } catch (error) {
    // Re-throw with more details
    if (error instanceof Error) {
      throw new Error(`Passkey creation failed: ${error.message}`);
    }
    throw new Error('Passkey creation failed: Unknown error');
  }
}

export async function authenticateWithPasskey(credentialId: string): Promise<boolean> {
  try {
    const challenge = generateChallenge();

    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: toArrayBuffer(credentialId),
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return true;
  } catch {
    return false;
  }
}
