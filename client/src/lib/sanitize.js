import DOMPurify from 'dompurify';

// Sanitize at the rendering boundary, including reviews stored before this fix.
// Keep light formatting and safe links; exclude images, SVG, forms and styles.
export const sanitizeHtml = (dirty) => DOMPurify.sanitize(dirty ?? '', {
  ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false
});
