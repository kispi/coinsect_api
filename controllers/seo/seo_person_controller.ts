import { Person } from '../../entities/person'
import orm from '../../core/orm'
import IContext from '../../core/context'
import helpers from '../../core/helpers'

const seoPersonController = {
  all: async (c: IContext) => {
    try {
      const data = await c.orm.getRepository(Person).createQueryBuilder()
        .leftJoinAndSelect('Person.images', 'images')
        .orderBy('Person.id', 'DESC')
        .getMany()

      const body = `
        ${data.map(row => `
        <a href="/info/influencers/${row.sharingKey}">
          <img src="${helpers.useS3(row.images[0].key)}" style="width: 120px;">
          <div class="influencer-name">${row.name}</div>
        </a>
        `).join('<br>')}
      `

      c.res.asHTML(helpers.seo.useDefaultTemplate({
        body,
        meta: {
          title: '크립토 인플루언서',
          description: '유튜브나 트위터를 통해 활발하게 활동하는 크립토 인플루언서들',
          image: helpers.parseImageSources(body)[0],
        },
      }))
    } catch (e) {
      c.res.failed('잘못된 요청입니다.')
    }
  },
  detail: async (c: IContext) => {
    const data = await orm.querySetter(c, Person)
      .where(`sharing_key = '${c.req.params['id']}'`)
      .leftJoinAndSelect('Person.images', 'images')
      .getOne()

    if (!data) {
      c.res.failed(helpers.seo.useDefaultTemplate({
        body: '게시물을 찾을 수 없습니다.'
      }), 404)
      return
    }

    let description, bio
    try {
      description = JSON.parse(data['description']).kr
      bio = JSON.parse(data['bio'])
    } catch (e) {}

    c.res.asHTML(helpers.seo.useDefaultTemplate({
      body: `
      <img src="${helpers.useS3(data['images'][0].key)}" style="width: 240px;">
      <div>${data['name']}</div>
      <article class="content">
        <div class="description" style="white-space: pre-line;">${description}</div>
        ${
          bio ?
          `<div class="bio" style="margin-top: 40px;">
            ${Object.keys(bio).map(key => `<div>
              <div class="key">${key}</div>
              <div class="value">${typeof bio[key] === 'string' ? bio[key] : `
                <div>
                  ${Object.keys(bio[key]).map(childKey => `
                    <div class="value">${typeof bio[key][childKey] === 'string' ? `
                    ${bio[key][childKey].startsWith('http') ? `
                      <a href="${bio[key][childKey]}" rel="noreferrer" target="_blank">${bio[key][childKey]}</a>
                    ` : bio[key][childKey]}
                    </div>` : bio[key][childKey]}
                  `).join('<br>')}
                </div>
              `}</div>
            </div>`).join('<br>')}
          </div>`
          : null
        }
      </article>
      `,
      meta: {
        title: `인물 - ${data['name']} - 코인충`,
        description,
        url: `${c.req.hostname}${c.req.raw.url}`,
        image: helpers.useS3(data['images'][0].key),
      },
    }))
  },
}

export default seoPersonController