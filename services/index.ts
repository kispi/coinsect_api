import badWord from './bad_word'
import chat from './chat'
import content from './content/index'
import firebase from './firebase/index'
import helper from './helper'
import marketInfo from './market_info'
import onchain from './onchain/index'
import profile from './profile'
import s3 from './s3'
import slack from './slack'

const useService = () => ({
  badWord,
  chat,
  content,
  firebase,
  helper,
  marketInfo,
  onchain,
  profile,
  s3,
  slack,
})

export default useService