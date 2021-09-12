import IContext from '../core/context'
import store from '../store'

const configController = {
  get: (c: IContext) => {
    c.res.asJSON({
      maxlength: {
        title: store.state.globalVariables.maxlength.title,
        nickname: store.state.globalVariables.maxlength.nickname,
      }
    })
  },
}

export default configController