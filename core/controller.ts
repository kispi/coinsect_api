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
      const data = await qs.where(`${entityName}.id = ${c.req.params['id']}`).getOne()
      c.res.asJSON(data)
    } catch (e) {
      c.res.failed(e)
    }
  },
  delete: async (c: IContext) => {
    const o = orm.querySetter(c, model).where(`id = ${c.req.params['id']}`)
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