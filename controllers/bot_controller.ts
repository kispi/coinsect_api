import IContext from '../core/context'
import store from '../store'

const botController = {
  combot: (c: IContext) => {
    c.res.success(store.state.combotResults)
  },
}

export default botController