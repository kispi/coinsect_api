type Meta = {
  author?: string,
  image?: string,
  title?: string,
  description?: string,
  url?: string,
}

const useDefaultTemplate = ({ body, meta }: { body: string, meta?: Meta }) => {
  const t = (meta || {}).title || '코인충 - 대한민국 No.1 암호자산 커뮤니티'
  const d = (meta || {}).description || '실시간 코인 시세, 김프, 프리미엄, 트레이딩뷰, 호가창, 뉴스, 펀더멘털, 커뮤니티, 트렌드'
  const u = (meta || {}).url || 'https://coinsect.io'
  const img = (meta || {}).image || 'https://coinsect.io/og-image.png'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t}</title>
        <link rel="icon" type="image/png" sizes="32x32" href="https://coinsect.io/favicon/favicon-32x32.png">
        <meta charset="utf-8">
        <meta name="title" content="${t}">
        <meta name="description" content="${d}">
        ${(meta || {}).author ? `<meta name="author" content="${meta.author}">` : ''}
        <meta property="og:site_name" content="coinsect.io">
        <meta property="og:url" content="${u}">
        <meta property="og:title" content="${t}">
        <meta property="og:type" content="website">
        <meta property="og:description" content="${d}">
        <meta property="og:image" content="${img}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="600">
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:title" content="${t}">
        <meta property="twitter:description" content="${d}">
        <meta property="twitter:image" content="${img}">
        <meta property="twitter:url" content="${u}">
      </head>
      <body>
        ${body}
      </body>
    </html>
  `
}

const seo = {
  useDefaultTemplate,
}

export default seo