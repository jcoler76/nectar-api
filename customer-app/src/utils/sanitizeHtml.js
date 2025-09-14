// Minimal HTML sanitizer with a conservative allowlist.
// Avoids adding external deps; intended for small rich text like summaries.
export function sanitizeHtml(input) {
  try {
    if (!input || typeof input !== 'string') return '';

    const allowedTags = new Set([
      'BR',
      'B',
      'I',
      'EM',
      'STRONG',
      'A',
      'P',
      'UL',
      'OL',
      'LI',
      'CODE',
      'PRE',
    ]);
    const allowedAttrs = {
      A: new Set(['href', 'title', 'target', 'rel']),
      CODE: new Set([]),
      PRE: new Set([]),
      P: new Set([]),
      UL: new Set([]),
      OL: new Set([]),
      LI: new Set([]),
      B: new Set([]),
      I: new Set([]),
      EM: new Set([]),
      STRONG: new Set([]),
      BR: new Set([]),
    };

    const isSafeUrl = url => {
      try {
        const u = new URL(url, window.location.origin);
        return ['http:', 'https:', 'mailto:'].includes(u.protocol);
      } catch (_) {
        return false;
      }
    };

    const template = document.createElement('template');
    template.innerHTML = input;

    const sanitizeNode = node => {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node;
        const tag = el.tagName;
        if (!allowedTags.has(tag)) {
          const text = document.createTextNode(el.textContent || '');
          el.replaceWith(text);
          return;
        }

        const keep = allowedAttrs[tag] || new Set();
        Array.from(el.attributes).forEach(attr => {
          if (!keep.has(attr.name)) {
            el.removeAttribute(attr.name);
          }
        });

        if (tag === 'A') {
          const href = el.getAttribute('href');
          if (!href || !isSafeUrl(href)) {
            el.removeAttribute('href');
          } else {
            el.setAttribute('rel', 'noopener noreferrer');
            if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
          }
        }

        Array.from(el.childNodes).forEach(sanitizeNode);
      }
    };

    Array.from(template.content.childNodes).forEach(sanitizeNode);
    return template.innerHTML;
  } catch (_) {
    const div = document.createElement('div');
    div.innerText = String(input);
    return div.innerHTML;
  }
}
