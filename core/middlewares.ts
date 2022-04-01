import IContext from './context'
import helpers from './helpers'

const middlewares = {
  adminAuth: async (c: IContext) => {
    try {
      return helpers.jwt.getPayload(c)
    } catch (e) {
      return Promise.reject({ ...e, code: 401 })
    }
  },
}

export default middlewares