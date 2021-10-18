import chat from './chat'
import marketInfo from './market-info'
import s3 from './s3'

const useService = () => ({
  chat,
  marketInfo,
  s3,
})

export default useService