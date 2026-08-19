import IContext from './interfaces/context'
import helpers from './helpers'
import orm from './orm'

export const useCRUD = ({
  model,
  useSoftDelete,
  withDeleted
}: {
  model,
  useSoftDelete?: Boolean,
  withDeleted?: Boolean,
}) => ({
  all: async (c: IContext) => {
    const qs = orm.querySetter(c, model)
    if (withDeleted) qs.withDeleted()

    try {
      const [data, total] = await qs.getManyAndCount()
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
  detail: async (c: IContext) => {
    const entityName = c.orm.getRepository(model).metadata.name
    const qs = orm.querySetter(c, model)
    if (withDeleted) qs.withDeleted()

    try {
      const data = await qs.where(`${entityName}.id = :id`, { id: c.req.params['id'] }).getOne()
      c.res.asJSON(data)
    } catch (e) {
      c.res.failed(e)
    }
  },
  delete: async (c: IContext) => {
    const o = orm.querySetter(c, model).where('id = :id', { id: c.req.params['id'] })
    const promise = useSoftDelete ? o.softDelete() : o.delete()
    try {
      await promise.execute()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  create: async (c: IContext) => {
    try {
      await orm.querySetter(c, model).insert().into(model).values(c.req.body).execute()
      c.res.success()
    } catch (e) {
      c.res.failed()
    }
  },
  update: async (c: IContext) => {
    try {
      await c.orm.getRepository(model).save(c.req.body)
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
})

/**
 * load child models into parent models using WHERE IN query and map them into parent without join, like `includes` in rails.
 * NOTE: In order to use this, you should define foreign key with number as plain number column also.
 * EX:) Say, you have reply.post, you should also define reply.postId.
 * @param model
 * @param childModel
 */
 export const loadChildren = async ({ c, model, childModel, items, withDeleted }: { c: IContext, model, childModel, items: unknown[], withDeleted?: Boolean }) => {
  const modelIds = items.map(item => item['id']) || []
  if (modelIds.length === 0) return

  try {
    const modelName = c.orm.getRepository(model).metadata.name
    const childModelName = c.orm.getRepository(childModel).metadata.name
    const qs = c.orm.getRepository(childModel).createQueryBuilder()
    if (withDeleted) qs.withDeleted()

    const children = await qs.where(`${childModelName}.${modelName.toLowerCase()}.id IN (:...modelIds)`, { modelIds }).getMany()
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