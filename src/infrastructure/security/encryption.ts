/**
 * Secure Encryption Utility using AES-256-GCM
 * 
 * This module provides military-grade encryption for sensitive credentials.
 * Uses AES-256-GCM which provides both confidentiality and authenticity.
 * 
 * SECURITY NOTES:
 * - ENCRYPTION_KEY must be a 32-byte (64 hex chars) secret stored in env
 * - Each encryption generates a unique IV (Initialization Vector)
 * - GCM mode provides authentication to detect tampering
 * - Never log or expose decrypted data in production
 */

import crypto from 'crypto';

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is recommended for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for authentication tag
const ENCODING: BufferEncoding = 'base64';

/**
 * Get the encryption key from environment variables
 * Key must be 32 bytes (256 bits) represented as 64 hex characters
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error(
            'ENCRYPTION_KEY environment variable is not set. ' +
            'Generate one with: openssl rand -hex 32'
        );
    }

    // Key should be 64 hex characters (32 bytes)
    if (key.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
            'Generate one with: openssl rand -hex 32'
        );
    }

    return Buffer.from(key, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: base64(IV + AuthTag + Ciphertext)
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) {
        return '';
    }

    const key = getEncryptionKey();

    // Generate random IV for each encryption (critical for security)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt the data
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: IV + AuthTag + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString(ENCODING);
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param ciphertext - The encrypted string from encrypt()
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or data has been tampered with
 */
export function decrypt(ciphertext: string): string {
    if (!ciphertext) {
        return '';
    }

    const key = getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(ciphertext, ENCODING);

    // Extract components: IV + AuthTag + Ciphertext
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt
    try {
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

        return decrypted.toString('utf8');
    } catch (error) {
        // Authentication failed - data may have been tampered with
        throw new Error('Decryption failed: Data integrity check failed');
    }
}

/**
 * Encrypt an object's sensitive fields
 * 
 * @param data - Object with fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export function encryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
): T {
    const result = { ...data };

    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string') {
            result[field] = encrypt(result[field] as string) as T[keyof T];
        }
    }

    return result;
}

/**
 * Decrypt an object's sensitive fields
 * 
 * @param data - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export function decryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
): T {
    const result = { ...data };

    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string') {
            try {
                result[field] = decrypt(result[field] as string) as T[keyof T];
            } catch {
                // If decryption fails, leave the field as-is (might not be encrypted)
                console.warn(`Failed to decrypt field: ${String(field)}`);
            }
        }
    }

    return result;
}

/**
 * Check if a string appears to be encrypted
 * (Basic check - looks for base64 format and minimum length)
 */
export function isEncrypted(value: string): boolean {
    if (!value || value.length < 44) { // Minimum length for IV + AuthTag in base64
        return false;
    }

    // Check if it looks like base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(value);
}

/**
 * Generate a secure encryption key (for setup purposes)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Safely decrypt a value, returning original if decryption fails
 * Supports both:
 * - AES-256-GCM format (base64 encoded)
 * - AES-256-CBC legacy format (iv:ciphertext with colon separator)
 * 
 * @param value - The value to decrypt (might be encrypted or plaintext)
 * @returns Decrypted value or original value if decryption fails
 */
export function safeDecrypt(value: string): string {
    if (!value) {
        return '';
    }

    // Check for AES-256-CBC legacy format (iv:ciphertext with colon)
    if (value.includes(':')) {
        try {
            return decryptLegacyCBC(value);
        } catch (error) {
            // If CBC decryption fails, continue to try GCM or return as-is
        }
    }

    // Check for AES-256-GCM format (base64)
    if (isEncrypted(value)) {
        try {
            return decrypt(value);
        } catch (error) {
            // GCM decryption failed
        }
    }

    // Return original value if neither format works
    return value;
}

/**
 * Decrypt legacy AES-256-CBC format (iv:ciphertext)
 * This is used by PrismaProductRepository for backward compatibility
 */
function decryptLegacyCBC(text: string): string {
    const parts = text.split(':');

    // Must have exactly two parts: iv and ciphertext
    if (parts.length !== 2) {
        throw new Error('Invalid CBC format');
    }

    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY not set');
    }

    // Ensure key is exactly 32 bytes for AES-256
    // IMPORTANT: Use utf-8 encoding to match PrismaProductRepository
    const keyBuffer = Buffer.alloc(32);
    const keyFromEnv = Buffer.from(key, 'utf-8');
    keyFromEnv.copy(keyBuffer, 0, 0, Math.min(32, keyFromEnv.length));

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
