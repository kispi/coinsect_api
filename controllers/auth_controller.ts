import IContext from '../core/interfaces/context'
import helpers from '../core/helpers'

const dummyUsers = () => [{
  email: 'kispi@naver.com',
  password: helpers.hashed('1029'),
  role: 'admin',
  auth: 'super',
}, {
  email: 'position@coinsect.io',
  password: helpers.hashed('lala'),
  role: 'admin',
  auth: 'position',
}]

const getUser = (email: string) => {
  const user = dummyUsers().find(u => u.email === email)
  if (!user) return Promise.reject({ message: 'user not found' })

  return user
}

const authController = {
  signIn: async (c: IContext) => {
    try {
      const user = await getUser(c.req.body['email'])
      if (!user) return 

      if (!helpers.compare(user.password, c.req.body['password'])) return c.res.failed({ message: 'password not match' })

      const token = helpers.jwt.sign(user)
      c.res.success({ token })
    } catch (e) {
      c.res.failed(e)
    }
  },
  me: async (c: IContext) => {
    try {
      const decoded = await helpers.jwt.getPayload(c)
      const user = await getUser(decoded['email'])
      delete user.password
      c.res.success(user)
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default authController