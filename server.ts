import fastify from 'fastify'
import useRoutes from './routes'
import useDotenv from './dotenv'
import useDB from './database'

const config = useDotenv()

const app = fastify({ logger: true })
useRoutes(app)
useDB()

app.listen(config.API_PORT)