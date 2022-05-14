import 'reflect-metadata'
import { createConnection, getConnectionOptions } from 'typeorm'
import { log } from './core/logger'

const useDB = async () => {
  try {
    const options = await getConnectionOptions()
    await createConnection(options)
  } catch (e) {
    log.error(e)
  }
}

export default useDB