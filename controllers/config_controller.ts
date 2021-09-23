import IContext from '../core/context'
import store from '../store'

const configController = {
  get: (c: IContext) => {
    c.res.asJSON({
      maxlength: store.state.globalVariables.maxlength,
      version: store.state.globalVariables.version,
    })
  },
  post: (c: IContext) => {
    if (c.req.params['frontendVersion']) {
      store.state.globalVariables.version.frontend = c.req.params['frontendVersion']
    }
    c.res.success()
  },
}

export default configController