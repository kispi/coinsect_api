import { useCRUD } from '../core/controller'
import { BannedUser } from '../entities/banned_user'

const bannedUserController = useCRUD({ model: BannedUser })

export default bannedUserController