/**
 * Input Sanitizer
 * Provides XSS protection by sanitizing user inputs
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS attacks
   * Removes or escapes potentially dangerous HTML/JavaScript
   */
  static sanitize(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // HTML entity encoding for dangerous characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Remove any remaining script tags (case-insensitive)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:/gi, '');

    return sanitized.trim();
  }

  /**
   * Sanitize name input (alphanumeric, spaces, and common name characters only)
   */
  static sanitizeName(name: string): string {
    if (typeof name !== 'string') {
      return '';
    }

    // Allow letters, spaces, hyphens, apostrophes, and periods
    const sanitized = name.replace(/[^a-zA-Z0-9\s\-'.]/g, '');

    // Limit length to prevent DoS
    return sanitized.substring(0, 100).trim();
  }

  /**
   * Validate and sanitize URL input
   */
  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
      return '';
    }

    // Only allow http:// and https:// protocols
    if (!url.match(/^https?:\/\//i)) {
      return '';
    }

    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch {
      return '';
    }
  }

  /**
   * Check if string contains potential XSS patterns
   */
  static containsXSS(input: string): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }
}
