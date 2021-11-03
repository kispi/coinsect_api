const sanitizeHtml = require('sanitize-html')

const sanitize = {
  // html 컨텐츠의 경우는 특정 태그들은 허용할 필요가 있음.
  html: text => {
    const d = sanitizeHtml.defaults

    return sanitizeHtml(text, {
      allowedTags: d.allowedTags.concat(['img']),
      allowedAttributes: {
        'a': ['href', 'target', 'rel'],
        'img': ['src'],
        '*': ['style', 'class'],
      },
      allowedStyles: {
        '*': {
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
          'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
          'text-align': [/^left$/, /^right$/, /^center$/],
          'font-size': [/^\d+(?:px)$/],
          'font-weight': [/^\d+/],
        },
      }
    })
  },
  // 어떤 html도 허용하지 않는다.
  strict: text => sanitizeHtml(text, { allowedTags: [] }),
}

export default sanitize