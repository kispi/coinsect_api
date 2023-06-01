import IContext from '../core/interfaces/context'
import store from '../store'
import emojis from '../constants/emojis'

const preparedConfig = (ip: string) => ({
  maxlength: store.state.globalVariables.maxlength,
  version: store.state.globalVariables.version,
  emojis,
  ip,
})

const configController = {
  get: (c: IContext) => {
    c.res.asJSON(preparedConfig(c.req.ip))
  },
  post: (c: IContext) => {
    store.state.globalVariables.version.frontend = c.req.body['frontendVersion']
    c.res.success(preparedConfig(c.req.ip))
  },
}

export default configController