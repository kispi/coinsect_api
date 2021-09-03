import { useCRUD } from '../core/controller'
import { Post } from '../entities/post'

const postController = useCRUD(Post)

export default postController