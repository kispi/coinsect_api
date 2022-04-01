import IContext from '../core/context'
import helpers from '../core/helpers'

const dummyUsers = [{
  name: 'chris',
  email: 'kispi@naver.com',
  password: helpers.hashed('1029'),
}]

const authController = {
  signIn: (c: IContext) => {
    const user = dummyUsers.find(u => u.email === c.req.body['email'])
    if (!user) return c.res.failed({ message: 'user not found'})

    if (!helpers.compare(user.password, c.req.body['password'])) return c.res.failed({ message: 'password not match' })

    const token = helpers.jwt.sign({
      name: user.name,
      email: user.email,
    })

    c.res.success({ token })
  },
  me: async (c: IContext) => {
    try {
      const p = await helpers.jwt.getPayload(c)
      c.res.success({
        name: p['name'],
        email: p['email'],
      })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default authController