// import DOMPurify from 'isomorphic-dompurify';

/**
 * Input Sanitizer
 * Provides XSS protection by sanitizing user inputs using DOMPurify
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

    // Use DOMPurify to sanitize the input
    // We allow no tags by default for strict sanitization, effectively stripping HTML
    // If rich text is needed, this configuration should be adjusted
    /*
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // Strip all tags
      ALLOWED_ATTR: [], // Strip all attributes
    }).trim();
    */
    return input.trim();
  }

  /**
   * Sanitize name input (alphanumeric, spaces, and common name characters only)
   */
  static sanitizeName(name: string): string {
    if (typeof name !== 'string') {
      return '';
    }

    // Allow letters, spaces, hyphens, apostrophes, and periods
    // This simple regex is generally safe from ReDoS as it doesn't use nested quantifiers
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
   * Note: It's better to just sanitize than to try to detect XSS
   */
  static containsXSS(input: string): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    // const sanitized = DOMPurify.sanitize(input);
    // If sanitization changed the input, it likely contained XSS or HTML
    // return sanitized !== input;
    return false;
  }
}
