import IContext from '../core/interfaces/context'
import helpers from '../core/helpers'
import useService from '../services'
import { log } from '../core/logger'
import { AuthToken, TypeProvider } from '../entities/auth_token'
import { TypeUserRole, User,  } from '../entities/user'
import { Profile } from '../entities/profile'

const service = useService()

const afterSignIn = (c: IContext, user: User) => {
  user.lastSignIn = new Date()
  user.lastSignInIp = c.req.ip
  user.signInCount += 1
  c.orm.getRepository(User).save(user)
  c.res.success({ token: User.jwt(user) })
}

const mustAuthToken = async (c: IContext) => {
  const existingToken = await c.orm.getRepository(AuthToken).findOne({
    where: { token: c.req.body['kakaoId'] },
    relations: ['user', 'user.profile'],
  })
  if (existingToken) return existingToken

  const newToken = await c.orm.getRepository(AuthToken).save({
    token: c.req.body['kakaoId'],
    provider: TypeProvider.TypeKakao,
  })
  if (newToken) return newToken

  return Promise.reject({ message: 'ERR_TOKEN_NOT_CREATED' })
}

const mustUser = async (c: IContext, email: string) => {
  const existingUser = await c.orm.getRepository(User)
    .createQueryBuilder()
    .where(`email = '${email}'`)
    .leftJoinAndSelect('User.profile', 'profile')
    .getOne()
  if (existingUser) return existingUser

  const newUser = await c.orm.getRepository(User).save({
    email: c.req.body['email'],
    role: TypeUserRole.TypeUser,
  })
  if (newUser) return newUser

  return Promise.reject({ message: 'ERR_USER_NOT_CREATED' })
}

const mustProfile = async (c: IContext, user: User) => await c.orm.getRepository(Profile).save({
  user,
  nickname: await service.profile.generateUnique(),
})

const authController = {
  signIn: async (c: IContext) => {
    try {
      const user = await c.orm.getRepository(User).findOne({ where: { email: c.req.body['email'] } })
      if (!user) return c.res.failed({ message: 'user not found' })

      if (!helpers.crypto.compare(user.password, c.req.body['password'])) return c.res.failed({ message: 'password not match' })
      c.res.success({ token: User.jwt(user) })
    } catch (e) {
      c.res.failed(e)
    }
  },
  signInKakao: async (c: IContext) => {
    if (!c.validate.requiredFields(['kakaoId', 'email'])) return c.res.failed({ message: 'invalid payload' })

    try {
      let authToken = await mustAuthToken(c)
      if (authToken?.user?.profile) return afterSignIn(c, authToken.user)

      authToken.user = await mustUser(c, c.req.body['email'])
      authToken.user.profile = await mustProfile(c, authToken.user)
      c.orm.getRepository(AuthToken).save(authToken)
      return afterSignIn(c, authToken.user)
    } catch (e) {
      log.error('signInKakako:', e)
      service.slack.postMessage(`
        실패한 카카오 계정 생성 시도가 있습니다.
        email: ${c.req.body['email']}
        kakaoId: ${c.req.body['kakaoId']}
      `)
      c.res.failed(e)
    }
  },
}

export default authController