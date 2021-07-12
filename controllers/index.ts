import config from './config_controller'
import post from './post_controller'
import reaction from './reaction_controller'
import user from './user_controller'

const useControllers = () => ({
  config,
  post,
  reaction,
  user,
})

export default useControllers