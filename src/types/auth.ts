export type AuthMethod = 'biometric' | 'password';

export interface BiometricCredential {
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer;
}

export interface StoredAuthConfig {
  method: AuthMethod;
  passwordSalt: ArrayBuffer;
  passwordEncryptedMasterKey: ArrayBuffer;
  passwordMasterKeyIv: ArrayBuffer;
  biometric?: BiometricCredential;
  biometricEncryptedMasterKey?: ArrayBuffer;
  biometricMasterKeyIv?: ArrayBuffer;
}
