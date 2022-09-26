import IContext from './interfaces/context'
import helpers from './helpers'
import { TypeUserAuth } from '../entities/user'

const errorUnauthorized = {
  message: 'unauthorized',
  status: 401,
}

const foo = async (
  c: IContext,
  authArray: Array<TypeUserAuth>,
) => {
  if ((authArray || []).length === 0) return Promise.reject({ message: 'invalid request', status: 400 })

  try {
    const adminUser = await helpers.jwt.getPayload(c)
    if (adminUser['role'] !== 'admin' || authArray.indexOf(adminUser['auth']) < 0) return Promise.reject(errorUnauthorized)
  } catch (e) {
    return Promise.reject(e)
  }
}

const middlewares = {
  adminAuth: {
    super: async (c: IContext) => foo(c, [TypeUserAuth.TypeSuper]),
    manager: async (c: IContext) => foo(c, [TypeUserAuth.TypeSuper, TypeUserAuth.TypeManager]),
    position: async (c: IContext) => foo(c, [TypeUserAuth.TypeSuper, TypeUserAuth.TypeManager, TypeUserAuth.TypePosition]),
  },
}

export default middlewares