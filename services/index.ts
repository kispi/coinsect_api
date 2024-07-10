import aws from './aws'
import badWord from './bad_word'
import chat from './chat'
import content from './content/index'
import cron from './cron'
import firebase from './firebase/index'
import helper from './helper'
import marketInfo from './market_info'
import onchain from './onchain/index'
import profile from './profile'
import slack from './slack'

const useService = () => ({
  aws,
  badWord,
  chat,
  content,
  cron,
  firebase,
  helper,
  marketInfo,
  onchain,
  profile,
  slack,
})

export default useService