import IContext from '../core/interfaces/context'
import store from '../store'

const configController = {
  get: (c: IContext) => {
    c.res.asJSON({
      maxlength: store.state.globalVariables.maxlength,
      version: store.state.globalVariables.version,
      adminToken: store.state.adminToken, // 나중에 보안 문제가 있을 수 있으니 계정 기능 들어가면 주의.
    })
  },
  post: (c: IContext) => {
    if (c.req.body['frontendVersion']) {
      store.state.globalVariables.version.frontend = c.req.body['frontendVersion']
    }
    c.res.success()
  },
}

export default configController