import { InputSanitizer } from '../InputSanitizer';

describe('InputSanitizer', () => {
  describe('sanitize', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const result = InputSanitizer.sanitize(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should encode HTML entities', () => {
      const input = '<div>Hello & goodbye</div>';
      const result = InputSanitizer.sanitize(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = InputSanitizer.sanitize(input);
      expect(result).not.toMatch(/onerror/i);
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = InputSanitizer.sanitize(input);
      expect(result).not.toMatch(/javascript:/i);
    });

    it('should remove data: protocol', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = InputSanitizer.sanitize(input);
      expect(result).not.toMatch(/data:/i);
    });

    it('should remove null bytes', () => {
      const input = 'hello\0world';
      const result = InputSanitizer.sanitize(input);
      expect(result).toBe('helloworld');
    });

    it('should handle empty string', () => {
      const result = InputSanitizer.sanitize('');
      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = InputSanitizer.sanitize(123 as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeName', () => {
    it('should allow alphanumeric and common name characters', () => {
      const input = "John O'Brien-Smith Jr.";
      const result = InputSanitizer.sanitizeName(input);
      expect(result).toBe("John O'Brien-Smith Jr.");
    });

    it('should remove special characters', () => {
      const input = 'John<script>alert(1)</script>';
      const result = InputSanitizer.sanitizeName(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('script');
    });

    it('should limit length to 100 characters', () => {
      const input = 'a'.repeat(150);
      const result = InputSanitizer.sanitizeName(input);
      expect(result.length).toBe(100);
    });

    it('should trim whitespace', () => {
      const input = '  John Doe  ';
      const result = InputSanitizer.sanitizeName(input);
      expect(result).toBe('John Doe');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid https URLs', () => {
      const input = 'https://example.com';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('https://example.com');
    });

    it('should allow valid http URLs', () => {
      const input = 'http://example.com';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('http://example.com');
    });

    it('should reject javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should reject data: protocol', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should reject invalid URLs', () => {
      const input = 'not a url';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });
  });

  describe('containsXSS', () => {
    it('should detect script tags', () => {
      expect(InputSanitizer.containsXSS('<script>alert(1)</script>')).toBe(true);
      expect(InputSanitizer.containsXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(InputSanitizer.containsXSS('javascript:alert(1)')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(InputSanitizer.containsXSS('<img onerror="alert(1)">')).toBe(true);
      expect(InputSanitizer.containsXSS('<div onclick="alert(1)">')).toBe(true);
    });

    it('should detect iframe tags', () => {
      expect(InputSanitizer.containsXSS('<iframe src="evil.com"></iframe>')).toBe(true);
    });

    it('should detect eval calls', () => {
      expect(InputSanitizer.containsXSS('eval("alert(1)")')).toBe(true);
    });

    it('should return false for safe input', () => {
      expect(InputSanitizer.containsXSS('Hello world')).toBe(false);
      expect(InputSanitizer.containsXSS('user@example.com')).toBe(false);
    });
  });
});
