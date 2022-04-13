import IContext from '../core/interfaces/context'
import store from '../store'

const configController = {
  get: (c: IContext) => {
    c.res.asJSON({
      maxlength: store.state.globalVariables.maxlength,
      version: store.state.globalVariables.version,
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