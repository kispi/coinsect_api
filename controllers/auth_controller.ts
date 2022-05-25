import IContext from '../core/interfaces/context'
import helpers from '../core/helpers'
import useService from '../services'
import { AuthToken, TypeProvider } from '../entities/auth_token'
import { TypeUserRole, User,  } from '../entities/user'
import { Profile } from '../entities/profile'

const service = useService()

const getUser = (c: IContext, email: string) => c.orm.getRepository(User)
  .createQueryBuilder()
  .where(`email = '${email}'`)
  .leftJoinAndSelect('User.profile', 'profile')
  .getOne()

const authController = {
  signIn: async (c: IContext) => {
    try {
      const user = await c.orm.getRepository(User).findOne({ email: c.req.body['email'] })
      if (!user) return c.res.failed({ message: 'user not found' })

      if (!helpers.compare(user.password, c.req.body['password'])) return c.res.failed({ message: 'password not match' })
      c.res.success({ token: User.jwt(user) })
    } catch (e) {
      c.res.failed(e)
    }
  },
  signInKakao: async (c: IContext) => {
    if (!c.validate.requiredFields(['kakaoId', 'email'])) return c.res.failed({ message: 'invalid payload' })

    try {
      let authToken = await c.orm.getRepository(AuthToken).findOne(
        { token: c.req.body['kakaoId'] },
      )

      if (authToken) {
        authToken.user = await getUser(c, c.req.body['email'])
        return c.res.success({ token: User.jwt(authToken.user) })
      }

      // 토큰이 없는 경우 계정도 없음 => 해당 이메일의 유저가 있나 찾아보고 없으면 생성
      let user = await getUser(c, c.req.body['email'])
      if (!user) {
        user = await c.orm.getRepository(User).save({
          email: c.req.body['email'],
          role: TypeUserRole.TypeUser,
        })
      }

      if (!user.profile) {
        await c.orm.getRepository(Profile).save({
          user,
          nickname: await service.profile.useIfUnique(c.req.body['nickname']) || await service.profile.generateUnique(),
        })
      }
  
      authToken = await c.orm.getRepository(AuthToken).save({
        user,
        provider: TypeProvider.TypeKakao,
        token: c.req.body['kakaoId'],
      })
      c.res.success({ token: User.jwt(user) })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default authController