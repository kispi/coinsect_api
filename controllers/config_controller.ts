import IContext from '../core/interfaces/context'
import store from '../store'

const preparedConfig = () => ({
  maxlength: store.state.globalVariables.maxlength,
  version: store.state.globalVariables.version,
  adminToken: store.state.adminToken, // 나중에 보안 문제가 있을 수 있으니 계정 기능 들어가면 주의.
  allowDirectPositionEdit: store.state.globalVariables.allowDirectPositionEdit, // 포지션 직접 변경 허용 여부 (니들이 해줘)
})

const configController = {
  get: (c: IContext) => {
    c.res.asJSON(preparedConfig())
  },
  post: (c: IContext) => {
    store.state.globalVariables.version.frontend = c.req.body['frontendVersion']
    store.state.globalVariables.allowDirectPositionEdit = c.req.body['allowDirectPositionEdit']
    c.res.success(preparedConfig())
  },
}

export default configController