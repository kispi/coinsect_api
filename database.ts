import 'reflect-metadata'
import { createConnection, getConnectionOptions } from 'typeorm'

const useDB = async () => {
  try {
    const options = await getConnectionOptions()
    await createConnection(options)
  } catch (e) {
    console.error(e)
  }
}

export default useDB