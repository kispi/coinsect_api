import { useCRUD } from '../core/controller'
import { Person } from '../entities/person'

const person = useCRUD({ model: Person })

export default {
  all: person.all,
  detail: person.detail,
}