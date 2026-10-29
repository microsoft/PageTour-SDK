import DOMPurify from 'dompurify'

// Matches the formatting the announcement editor (CKEditor toolbar, autoformat and paste) can produce.
// img, table, figure and oembed are intentionally excluded.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li', 'span','h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',]
const ALLOWED_ATTR = ['href', 'target', 'rel']

class HtmlSanitizer {
  public static sanitize = (html: string): string => {
    if (!html) {
      return ''
    }
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTR,
    }) as string
  }
}

export { HtmlSanitizer }
