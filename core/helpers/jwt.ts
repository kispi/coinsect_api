import store from '../../store'
import IContext from '../interfaces/context'
const jwt = require('jsonwebtoken')

const jwtHelper = {
  getTokenFromHTTPHeader: httpHeader => {
    if (!httpHeader) return

    return (httpHeader.authorization || '').split('Bearer ')[1]
  },
  sign: (payload: object) => jwt.sign(payload, store.state.serverConfig.JWT_SECRET, { expiresIn: 60 * 60 * 24 * 7 }),
  decode: (token: string) => new Promise((resolve, reject) => {
    jwt.verify(token, store.state.serverConfig.JWT_SECRET, (err, decoded) => {
      if (err) return reject(err)

      return resolve(decoded)
    })
  }),
  mustUser: async (c: IContext) => {
    try {
      return await jwtHelper.getPayload(c)
    } catch (e) {}
  },
  getPayload: async (c: IContext) => {
    try {
      return await jwtHelper.decode(jwtHelper.getTokenFromHTTPHeader(c.req.headers))
    } catch (e) {}

    return Promise.reject({
      message: 'unauthorized',
      status: 401,
    })
  },
}

export default jwtHelper