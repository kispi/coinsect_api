import admin from './admin_controller'
import config from './config_controller'
import marketInfo from './market_info_controller'
import post from './post_controller'
import reaction from './reaction_controller'
import user from './user_controller'

const useControllers = () => ({
  admin,
  config,
  marketInfo,
  post,
  reaction,
  user,
})

export default useControllers