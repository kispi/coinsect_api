import admin from './admin_controller'
import auth from './auth_controller'
import aws from './aws_controller'
import config from './config_controller'
import content from './content_controller'
import dashboard from './dashboard_controller'
import deploy from './deploy_controller'
import firebase from './firebase_controller'
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

const useControllers = () => ({
  admin,
  auth,
  aws,
  config,
  content,
  dashboard,
  deploy,
  firebase,
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
})

export default useControllers