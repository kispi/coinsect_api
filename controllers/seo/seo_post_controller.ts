import { Post } from '../../entities/post'
import orm from '../../core/orm'
import IContext from '../../core/context'
import helpers from '../../core/helpers'

const seoPostController = {
  all: async (c: IContext) => {
    try {
      const data = await c.orm.getRepository(Post).createQueryBuilder()
        .limit(100)
        .orderBy('id', 'DESC')
        .getMany()

      c.res.asHTML(helpers.seo.useDefaultTemplate({
        body: `
          ${data.map(row => `
          <a href="/community/${row.id}">
            <div class="post-id">${row.id}</div>
            <div class="post-title">${row.title}</div>
          </a>
          `)}
        `,
        meta: {
          title: '코인충 커뮤니티',
          description: '코인충 커뮤니티 (자유게시판)',
        },
      }))
    } catch (e) {
      c.res.failed('잘못된 요청입니다.')
    }
  },
  detail: async (c: IContext) => {
    const data = await orm.querySetter(c, Post).where(`id = ${c.req.params['id']}`).getOne()
    if (data) c.res.asHTML(helpers.seo.useDefaultTemplate({
      body: `
      <div>${data['nickname']}</div>
      <div class="title">${data['title']}</div>
      <article class="content">${helpers.sanitize.html(data['content'])}</article>
      `,
      meta: {
        title: data['title'],
        description: helpers.sanitize.strict(data['content']),
        author: data['nickname'],
        url: `${c.req.hostname}${c.req.raw.url}`,
        image: helpers.parseImageSources(data['content'])[0],
      },
    }))
    else c.res.failed(helpers.seo.useDefaultTemplate({
      body: '게시물을 찾을 수 없습니다.'
    }), 404)
  },
}

export default seoPostController