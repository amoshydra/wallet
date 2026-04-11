import type { BiometricCredential } from '../types/auth';

const PRF_SALT_LENGTH = 32;

export function isWebAuthnAvailable(): boolean {
  return !!window.PublicKeyCredential;
}

export async function isPRFSupported(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await PublicKeyCredential.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

export async function canUseBiometric(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;
    return await isPRFSupported();
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
  return crypto.getRandomValues(new Uint8Array(32) as Uint8Array<ArrayBuffer>);
}

export async function createBiometricCredential(): Promise<BiometricCredential> {
  const challenge = generateChallenge();
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Wallet',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userId,
        name: 'Wallet User',
        displayName: 'Wallet User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: {
        prf: {},
      },
    },
  })) as PublicKeyCredential;

  const response = credential.response as AuthenticatorAttestationResponse;
  const clientData = JSON.parse(new TextDecoder().decode(response.clientDataJSON));

  if (!clientData.extResults?.prf) {
    throw new Error('PRF extension not supported by authenticator');
  }

  return {
    credentialId: credential.rawId,
    publicKey: response.attestationObject,
  };
}

export async function getBiometricKey(
  credential: BiometricCredential,
  prfSalt?: ArrayBuffer,
): Promise<CryptoKey> {
  const salt = prfSalt ?? crypto.getRandomValues(new Uint8Array(PRF_SALT_LENGTH));
  const challenge = generateChallenge();

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: credential.credentialId,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: new Uint8Array(salt),
          },
        },
      },
    },
  })) as PublicKeyCredential;

  const response = assertion.response as AuthenticatorAssertionResponse;
  const clientData = JSON.parse(new TextDecoder().decode(response.clientDataJSON));

  const prfResult = clientData.extResults?.prf?.results?.first;
  if (!prfResult) {
    throw new Error('PRF result not available');
  }

  const prfOutput = new Uint8Array(prfResult);

  return crypto.subtle.importKey('raw', prfOutput, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export function serializeCredential(credential: BiometricCredential): {
  credentialId: string;
  publicKey: string;
} {
  return {
    credentialId: toBase64(credential.credentialId),
    publicKey: toBase64(credential.publicKey),
  };
}

export function deserializeCredential(data: {
  credentialId: string;
  publicKey: string;
}): BiometricCredential {
  return {
    credentialId: toArrayBuffer(data.credentialId),
    publicKey: toArrayBuffer(data.publicKey),
  };
}
