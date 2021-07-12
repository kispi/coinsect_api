import IContext from '../core/context'

const configController = {
  get: (c: IContext) => {
    c.res.asJSON({ message: 'health check success' })
  },
}

export default configController