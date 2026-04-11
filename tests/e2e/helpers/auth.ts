import { expect, type Page } from '@playwright/test';
import { clearAllStorage } from './storage';

/**
 * Setup wallet with password only (skip passkey)
 */
export async function setupWithPassword(page: Page, password: string) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await clearAllStorage(page);
  await page.reload();

  await page.waitForURL('**/#/setup');
  await expect(page.locator('h1')).toHaveText('Create Password');

  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();

  // Handle passkey prompt if shown
  try {
    await page.waitForSelector('h1:has-text("Enable Quick Unlock")', { timeout: 3000 });
    await page.locator('button:has-text("Skip for now")').click();
  } catch {
    // Passkey not available or already on home
  }

  await page.waitForURL('**/#/');
  await expect(page.locator('h1')).toHaveText('My Cards');
}

/**
 * Setup wallet with password + mock passkey
 */
export async function setupWithPasskey(page: Page, password: string) {
  // Set up mock before any page load
  await page.addInitScript(() => {
    // Mock PublicKeyCredential before any scripts run
    const mockCredentialId = 'mock-credential-' + Date.now();
    (window as unknown as Record<string, unknown>).__mockCredentialId = mockCredentialId;

    // Ensure PublicKeyCredential exists
    if (!window.PublicKeyCredential) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).PublicKeyCredential = class PublicKeyCredential {
        static async isUserVerifyingPlatformAuthenticatorAvailable() {
          return true;
        }
      };
    }

    // Override the check method
    const OriginalPKC = window.PublicKeyCredential;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).PublicKeyCredential = class extends OriginalPKC {
      static async isUserVerifyingPlatformAuthenticatorAvailable() {
        return true;
      }
    };
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Clear storage
  await clearAllStorage(page);
  await page.reload();

  await page.waitForURL('**/#/setup');

  // Also mock after load for the credentials API
  await mockWebAuthn(page);

  await expect(page.locator('h1')).toHaveText('Create Password');

  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();

  // Accept passkey if available
  try {
    await page.waitForSelector('h1:has-text("Enable Quick Unlock")', { timeout: 5000 });
    await page.locator('button:has-text("Set Up Passkey")').click();
    // Wait for passkey setup to complete
    await page.waitForTimeout(500);
  } catch {
    // Passkey prompt not shown, already on home
  }

  await page.waitForURL('**/#/');
  await expect(page.locator('h1')).toHaveText('My Cards');
}

/**
 * Unlock wallet with password
 */
export async function unlockWithPassword(page: Page, password: string) {
  await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/#/');
}

/**
 * Mock WebAuthn API for testing passkey flows
 */
export async function mockWebAuthn(page: Page) {
  await page.evaluate(() => {
    // Generate a mock credential ID
    const mockCredentialId = 'mock-credential-' + Date.now();

    // Store for later use
    (window as unknown as Record<string, unknown>).__mockCredentialId = mockCredentialId;

    // Mock navigator.credentials.create (registration)
    const originalCreate = navigator.credentials.create.bind(navigator.credentials);
    navigator.credentials.create = async (options?: CredentialCreationOptions) => {
      if (options?.publicKey) {
        // Return a mock PublicKeyCredential
        const mockCredential = {
          id: mockCredentialId,
          rawId: new TextEncoder().encode(mockCredentialId),
          type: 'public-key',
          response: {
            attestationObject: new ArrayBuffer(0),
            clientDataJSON: new TextEncoder().encode(
              JSON.stringify({
                type: 'webauthn.create',
                challenge: '',
                origin: window.location.origin,
              }),
            ),
          },
          getClientExtensionResults: () => ({}),
        } as unknown as PublicKeyCredential;
        return mockCredential;
      }
      return originalCreate(options);
    };

    // Mock navigator.credentials.get (authentication)
    const originalGet = navigator.credentials.get.bind(navigator.credentials);
    navigator.credentials.get = async (options?: CredentialRequestOptions) => {
      if (options?.publicKey) {
        // Return a mock assertion
        const mockAssertion = {
          id: mockCredentialId,
          rawId: new TextEncoder().encode(mockCredentialId),
          type: 'public-key',
          response: {
            authenticatorData: new ArrayBuffer(0),
            clientDataJSON: new TextEncoder().encode(
              JSON.stringify({
                type: 'webauthn.get',
                challenge: '',
                origin: window.location.origin,
              }),
            ),
            signature: new ArrayBuffer(0),
            userHandle: null,
          },
          getClientExtensionResults: () => ({}),
        } as unknown as PublicKeyCredential;
        return mockAssertion;
      }
      return originalGet(options);
    };

    // Mock platform authenticator availability
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
    }

    // Ensure PublicKeyCredential exists
    if (!window.PublicKeyCredential) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).PublicKeyCredential = class PublicKeyCredential {
        static async isUserVerifyingPlatformAuthenticatorAvailable() {
          return true;
        }
      };
    }
  });
}
