import IContext from '../core/interfaces/context'
import store from '../store'
import emojis from '../constants/emojis'

const preparedConfig = () => ({
  maxlength: store.state.globalVariables.maxlength,
  version: store.state.globalVariables.version,
  emojis,
})

const configController = {
  get: (c: IContext) => {
    c.res.asJSON(preparedConfig())
  },
  post: (c: IContext) => {
    store.state.globalVariables.version.frontend = c.req.body['frontendVersion']
    c.res.success(preparedConfig())
  },
}

export default configController