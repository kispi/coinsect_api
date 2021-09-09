import { getRepository } from 'typeorm'
import IContext from './context'
import orm from './orm'

export const useCRUD = (model, useSoftDelete?) => ({
  all: (c: IContext) => {
      orm.querySetter(c, model).getManyAndCount()
        .then(res => c.res.asJSON({
          data: res[0],
          total: res[1],
        }))
        .catch(c.res.failed)
  },
  detail: (c: IContext) => {
    const entityName = getRepository(model).metadata.name
    orm.querySetter(c, model).where(`${entityName}.id = ${c.req.params['id']}`).getOne()
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