import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import useDotenv from './dotenv'
import useDB from './database'

const config = useDotenv()

const app = fastify({ logger: true })
app.register(fastifyCors)
useRoutes(app)
useDB()

app.listen(config.API_PORT)