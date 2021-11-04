import IContext from './context'

const middlewares = {
  adminAuth: (c: IContext) => {
    // 어드민에서 사용할 request 인증 로직 여기 구현
    // if (!c.req.headers['Authorization']) throw { message: 'NOT_AUTHORIZED' }
  },
}

export default middlewares