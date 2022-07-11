import badWord from './bad_word'
import chat from './chat'
import content from './content/index'
import marketInfo from './market_info'
import onchain from './onchain/index'
import profile from './profile'
import s3 from './s3'
import slack from './slack'

const useService = () => ({
  badWord,
  chat,
  content,
  marketInfo,
  onchain,
  profile,
  s3,
  slack,
})

export default useService