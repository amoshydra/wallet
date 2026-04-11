import { expect, test } from '@playwright/test';
import { setupWithPassword, setupWithPasskey } from './helpers/auth';

test.describe('Security', () => {
  test('should store device key in localStorage when passkey configured', async ({ page }) => {
    // Setup with passkey
    await setupWithPasskey(page, 'testpass123');

    // Check localStorage has device key
    const deviceKey = await page.evaluate(() => {
      return localStorage.getItem('wallet_device_key');
    });

    expect(deviceKey).toBeTruthy();
    expect(deviceKey).toHaveLength(64); // 32 bytes as hex = 64 chars
    expect(deviceKey).toMatch(/^[0-9a-f]+$/); // Should be hex
  });

  test('should NOT store device key when only password setup', async ({ page }) => {
    // Setup with password only (skip passkey)
    await setupWithPassword(page, 'testpass123');

    // Check localStorage does NOT have device key
    const deviceKey = await page.evaluate(() => {
      return localStorage.getItem('wallet_device_key');
    });

    expect(deviceKey).toBeNull();
  });

  test('should store salt in IndexedDB', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Check salt exists in IndexedDB
    const hasSalt = await page.evaluate(async () => {
      const db = await indexedDB.open('WalletDB', 3);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction('keys', 'readonly');
          const store = transaction.objectStore('keys');
          const request = store.get('master');
          request.onsuccess = () => {
            const result = request.result;
            resolve(!!(result?.salt && result.salt.byteLength > 0));
          };
        };
      });
    });

    expect(hasSalt).toBe(true);
  });

  test('should store both password and device encrypted keys when passkey configured', async ({
    page,
  }) => {
    await setupWithPasskey(page, 'testpass123');

    // Check both encryption types exist
    const keyData = await page.evaluate(async () => {
      const db = await indexedDB.open('WalletDB', 3);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction('keys', 'readonly');
          const store = transaction.objectStore('keys');
          const request = store.get('master');
          request.onsuccess = () => {
            const result = request.result;
            resolve({
              hasPasswordEncrypted: !!(
                result?.passwordEncrypted && result.passwordEncrypted.byteLength > 0
              ),
              hasPasswordIv: !!(result?.passwordIv && result.passwordIv.byteLength > 0),
              hasDeviceEncrypted: !!(
                result?.deviceEncrypted && result.deviceEncrypted.byteLength > 0
              ),
              hasDeviceIv: !!(result?.deviceIv && result.deviceIv.byteLength > 0),
              hasCredentialId: !!result?.passkeyCredentialId,
            });
          };
        };
      });
    });

    expect(keyData).toEqual({
      hasPasswordEncrypted: true,
      hasPasswordIv: true,
      hasDeviceEncrypted: true,
      hasDeviceIv: true,
      hasCredentialId: true,
    });
  });

  test('should only store password encrypted key when no passkey', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Check only password encryption exists
    const keyData = await page.evaluate(async () => {
      const db = await indexedDB.open('WalletDB', 3);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction('keys', 'readonly');
          const store = transaction.objectStore('keys');
          const request = store.get('master');
          request.onsuccess = () => {
            const result = request.result;
            resolve({
              hasPasswordEncrypted: !!(
                result?.passwordEncrypted && result.passwordEncrypted.byteLength > 0
              ),
              hasPasswordIv: !!(result?.passwordIv && result.passwordIv.byteLength > 0),
              hasDeviceEncrypted: !!(
                result?.deviceEncrypted && result.deviceEncrypted.byteLength > 0
              ),
              hasDeviceIv: !!(result?.deviceIv && result.deviceIv.byteLength > 0),
              hasCredentialId: !!result?.passkeyCredentialId,
            });
          };
        };
      });
    });

    expect(keyData).toEqual({
      hasPasswordEncrypted: true,
      hasPasswordIv: true,
      hasDeviceEncrypted: false,
      hasDeviceIv: false,
      hasCredentialId: false,
    });
  });

  test('encrypted data should be non-empty', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Check encrypted data exists and is non-trivial
    const cardData = await page.evaluate(async () => {
      const db = await indexedDB.open('WalletDB', 3);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction('data', 'readonly');
          const store = transaction.objectStore('data');
          const request = store.get('cards');
          request.onsuccess = () => {
            const result = request.result;
            resolve({
              hasEncrypted: !!(result?.encrypted && result.encrypted.byteLength > 10),
              hasIv: !!(result?.iv && result.iv.byteLength === 12),
            });
          };
        };
      });
    });

    expect(cardData).toEqual({
      hasEncrypted: true,
      hasIv: true,
    });
  });
});
