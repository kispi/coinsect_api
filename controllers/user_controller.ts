import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import { User } from '../entities/user'

const me = async (c: IContext) => {
  try {
    const decodedUser = await helpers.jwt.getPayload(c)
    if (!decodedUser['id']) return c.res.failed({ message: 'invalid jwt token' })

    const user = await c.orm.getRepository(User).findOne({
      where: { id: decodedUser['id'] },
      relations: ['profile'],
    })
    delete user.password
    c.res.success(user)
  } catch (e) {
    c.res.failed(e)
  }
}

export default {
  me,
}