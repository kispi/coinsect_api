import admin from './admin_controller'
import auth from './auth_controller'
import config from './config_controller'
import content from './content_controller'
import deploy from './deploy_controller'
import helper from './helper_controller'
import marketInfo from './market_info_controller'
import notification from './notification_controller'
import onchain from './onchain_controller'
import person from './person_controller'
import post from './post_controller'
import reaction from './reaction_controller'
import reply from './reply_controller'
import user from './user_controller'
import wallet from './wallet_controller'
import whaleAlert from './whale_alert_controller'
import s3 from './s3_controller'

const useControllers = () => ({
  admin,
  auth,
  config,
  content,
  deploy,
  helper,
  marketInfo,
  notification,
  onchain,
  person,
  post,
  reaction,
  reply,
  user,
  wallet,
  whaleAlert,
  s3,
})

export default useControllers