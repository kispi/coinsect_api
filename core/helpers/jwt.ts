import store from '../../store'
import IContext from '../context'
const jwt = require('jsonwebtoken')

const jwtHelper = {
  sign: (payload: object) => jwt.sign(payload, store.state.serverConfig.JWT_SECRET, { expiresIn: 60 * 60 * 24 * 365 }),
  decode: (token: string) => new Promise((resolve, reject) => {
    jwt.verify(token, store.state.serverConfig.JWT_SECRET, (err, decoded) => {
      if (err) return reject(err)

      return resolve(decoded)
    })
  }),
  getPayload: async (c: IContext) => {
    const token = (c.req.headers.authorization || '').split('Bearer ')[1]
    if (!token) {
      return Promise.reject({
        message: 'unauthorized',
        status: 401,
      })
    }

    return jwtHelper.decode(token)
  },
}

export default jwtHelper