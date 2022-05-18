import badWord from './bad_word'
import chat from './chat'
import content from './content/index'
import marketInfo from './market_info'
import s3 from './s3'

const useService = () => ({
  badWord,
  chat,
  content,
  marketInfo,
  s3,
})

export default useService