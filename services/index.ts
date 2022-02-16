import chat from './chat'
import content from './content'
import marketInfo from './market-info'
import s3 from './s3'

const useService = () => ({
  chat,
  content,
  marketInfo,
  s3,
})

export default useService