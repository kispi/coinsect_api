import IContext from '../core/context'
import orm from '../core/orm'
import { Notification } from '../entities/notification'

const notificationController = {
  all: async (c: IContext) => {
    try {
      const [data, total] = await orm.querySetter(c, Notification).where('active = 1').getManyAndCount()
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default notificationController