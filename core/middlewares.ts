import IContext from './interfaces/context'
import helpers from './helpers'

const errorUnauthorized = {
  message: 'unauthorized',
  status: 401,
}

const middlewares = {
  adminAuth: {
    super: async (c: IContext) => {
      try {
        const adminUser = await helpers.jwt.getPayload(c)
        if (adminUser['role'] !== 'admin' || adminUser['auth'] !== 'super') return Promise.reject(errorUnauthorized)
      } catch (e) {
        return Promise.reject(e)
      }
    },
    manager: async (c: IContext) => {
      try {
        const adminUser = await helpers.jwt.getPayload(c)
        if (adminUser['role'] !== 'admin' || ['super', 'manager'].indexOf(adminUser['auth']) < 0) return Promise.reject(errorUnauthorized)
      } catch (e) {
        return Promise.reject(e)
      }
    }
  },
}

export default middlewares