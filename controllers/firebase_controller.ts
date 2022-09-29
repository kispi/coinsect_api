import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const firebaseController = {
  send: async (c: IContext) => {
    const title = c.req.body['title']
    const body = c.req.body['body']
    const icon = c.req.body['icon']
    const registration_ids = c.req.body['registration_ids']

    const payload = {
      notification: {
        title,
        body,
        icon,
      },
      registration_ids,
    }

    try {
      await service.firebase.messaging.send(payload)
      c.res.success(payload)
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default firebaseController