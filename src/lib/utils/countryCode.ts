// Map phone country codes to ISO codes
export const phoneToIsoMap: Record<string, string> = {
    '+51': 'PE', // Peru
    '+52': 'MX', // Mexico
    '+54': 'AR', // Argentina
    '+55': 'BR', // Brazil
    '+56': 'CL', // Chile
    '+57': 'CO', // Colombia
    '+58': 'VE', // Venezuela
    '+591': 'BO', // Bolivia
    '+593': 'EC', // Ecuador
    '+595': 'PY', // Paraguay
    '+598': 'UY', // Uruguay
    '+1': 'US', // USA
};

// Map ISO codes to phone country codes (reverse)
export const isoToPhoneMap: Record<string, string> = Object.fromEntries(
    Object.entries(phoneToIsoMap).map(([phone, iso]) => [iso, phone])
);

/**
 * Normalizes a country code to ISO format (2 letters uppercase)
 * Handles both phone codes (+57) and ISO codes (CO)
 */
export function normalizeCountryCode(code: string | null | undefined): string | null {
    if (!code) return null;

    const trimmed = code.trim();

    // If it starts with +, it's a phone code - convert to ISO
    if (trimmed.startsWith('+')) {
        // eslint-disable-next-line security/detect-object-injection
        return phoneToIsoMap[trimmed] || null;
    }

    // If it's already 2 letters, just uppercase it
    if (trimmed.length === 2) {
        return trimmed.toUpperCase();
    }

    // Unknown format
    return null;
}

/**
 * Validates if a country code is valid (either ISO or phone format)
 */
export function isValidCountryCode(code: string | null | undefined): boolean {
    if (!code) return false;
    const normalized = normalizeCountryCode(code);
    return normalized !== null && normalized.length === 2;
}
