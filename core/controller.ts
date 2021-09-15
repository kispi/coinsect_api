import { getRepository } from 'typeorm'
import IContext from './context'
import helpers from './helpers'
import orm from './orm'

export const useCRUD = ({ model, useSoftDelete, withDeleted }: { model, useSoftDelete?: Boolean, withDeleted?: Boolean } ) => ({
  all: (c: IContext) => {
    const qs = orm.querySetter(c, model)
    if (withDeleted) qs.withDeleted()

    qs.getManyAndCount()
      .then(res => c.res.asJSON({
        data: res[0],
        total: res[1],
      }))
      .catch(c.res.failed)
  },
  detail: (c: IContext) => {
    const entityName = getRepository(model).metadata.name
    const qs = orm.querySetter(c, model)
    if (withDeleted) qs.withDeleted()

    qs.where(`${entityName}.id = ${c.req.params['id']}`).getOne()
      .then(c.res.asJSON)
      .catch(c.res.failed)
  },
  delete: (c: IContext) => {
    const o = orm.querySetter(c, model).where(`id = ${c.req.params['id']}`)
    const promise = useSoftDelete ? o.softDelete() : o.delete()
    promise.execute()
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
  create: (c: IContext) => {
    orm.querySetter(c, model).insert().into(model).values(c.req.body).execute()
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
  update: (c: IContext) => {
    getRepository(model).save(c.req.body)
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
})

/**
 * load child models into parent models using WHERE IN query and map them into parent without join, like `includes` in rails.
 * NOTE: In order to use this, you should define foreign key with number as plain number column also.
 * EX:) Say, you have reply.post, you should also define reply.postId.
 * @param model
 * @param childModel
 */
export const loadChildren = async ({ c, model, childModel, items }: { c: IContext, model, childModel, items: unknown[] }) => {
  const modelIds = items.map(item => item['id'])
  try {
    const modelName = c.orm.getRepository(model).metadata.name
    const childModelName = c.orm.getRepository(childModel).metadata.name
    const children = await c.orm.getRepository(childModel).createQueryBuilder().where(`${childModelName}.${modelName.toLowerCase()}.id IN (:id)`, { id: modelIds }).getMany()
    const childrenMap = {}
    children.forEach(child => {
      const arr = child[`${modelName.toLowerCase()}Id`]
      childrenMap[arr] ? childrenMap[arr].push(child) : childrenMap[arr] = [child]
    })
    items.forEach((item, idx) => items[idx][helpers.case.pluralize(childModelName.toLowerCase())] = childrenMap[item['id']])
  } catch (e) {
    return Promise.reject(e)
  }
}