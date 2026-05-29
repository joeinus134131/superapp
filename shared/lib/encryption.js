import CryptoJS from 'crypto-js';

// The default secret key used if the user hasn't set a custom one
const DEFAULT_KEY = 'superapp-default-e2e-key-123';

/**
 * Encrypts an object or string using AES
 * @param {any} data - Data to encrypt
 * @param {string} [customKey] - Optional custom encryption key
 * @returns {string} Encrypted ciphertext
 */
export function encryptData(data, customKey) {
  if (!data) return null;
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  const key = customKey || DEFAULT_KEY;
  return CryptoJS.AES.encrypt(stringData, key).toString();
}

/**
 * Decrypts an AES ciphertext back to an object or string
 * @param {string} ciphertext - Data to decrypt
 * @param {string} [customKey] - Optional custom encryption key
 * @returns {any} Decrypted data
 */
export function decryptData(ciphertext, customKey) {
  if (!ciphertext) return null;
  const key = customKey || DEFAULT_KEY;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    // Try to parse as JSON, if it fails, return the string
    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (e) {
    console.error('[Encryption] Decryption failed:', e);
    return null;
  }
}
