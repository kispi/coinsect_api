import { useCRUD } from '../core/controller'
import { WhaleAlert } from '../entities/whale_alert'

const whaleAlertController = useCRUD({ model: WhaleAlert })

export default whaleAlertController