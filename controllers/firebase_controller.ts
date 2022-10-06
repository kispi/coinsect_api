import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const firebaseController = {
  send: async (c: IContext) => {
    const payload = {
      tokens: c.req.body['tokens'],
      webpush: {
        notification: {
          title: c.req.body['title'],
          body: helpers.allNewlineTrimmed(c.req.body['body'] || ''),
          icon: c.req.body['icon'],
          image: c.req.body['image'],
        },
      },
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