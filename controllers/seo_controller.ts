import { Post } from '../entities/post'
import orm from '../core/orm'
import IContext from '../core/context'
const sanitizeHtml = require('sanitize-html')

type Meta = {
  author?: String,
  image?: String,
  title?: String,
  description?: String,
  url?: String,
}

const useDefaultTemplate = ({ body, meta }: { body: String, meta?: Meta }) => {
  const t = (meta || {}).title || '코인충 - 대한민국 No.1 암호자산 커뮤니티'
  const d = (meta || {}).description || '실시간 코인 시세, 김프, 프리미엄, 트레이딩뷰, 호가창, 뉴스, 펀더멘털, 커뮤니티, 트렌드'
  const u = (meta || {}).url || 'https://coinsect.io'
  const img = (meta || {}).image || 'https://coinsect.io/og-image.png'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="title" content="${t}">
        ${(meta || {}).author ? `<meta name="author" content="${meta.author}">` : ''}
        <meta name="description" content="${d}">
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

const seoController = {
  post: {
    detail: async (c: IContext) => {
      const data = await orm.querySetter(c, Post).where(`id = ${c.req.params['id']}`).getOne()
      if (data) c.res.asHTML(useDefaultTemplate({
        body: `
        <div>${data['nickname']}</div>
        <div class="title">${data['title']}</div>
        <article class="content">${sanitizeHtml(data['content'])}</article>
        `,
        meta: {
          title: data['title'],
          description: sanitizeHtml(data['content'], { allowedTags: [] }),
          author: data['nickname'],
          url: `${c.req.hostname}${c.req.raw.url}`,
        },
      }))
      else c.res.failed(useDefaultTemplate({
        body: '게시물을 찾을 수 없습니다.'
      }), 404)
    },
  },
}

export default seoController