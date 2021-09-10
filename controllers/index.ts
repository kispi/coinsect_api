import admin from './admin_controller'
import config from './config_controller'
import marketInfo from './market_info_controller'
import post from './post_controller'
import reaction from './reaction_controller'
import reply from './reply_controller'
import user from './user_controller'
import seo from './seo_controller'

const useControllers = () => ({
  admin,
  config,
  marketInfo,
  post,
  reaction,
  reply,
  user,
  seo,
})

export default useControllers