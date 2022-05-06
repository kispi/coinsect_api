import axios from 'axios'
import store from '../../store'

const endpoint = store.state.serverConfig.LAMBDA_COINNESS

const newsService = {
  coinness: {
    feeds: (lastId: number) => axios.get(endpoint, { params: { lastId, type: 'news' } }),
    articles: ({
      limit = 10,
      section = 'latest',
      lastId,
    }: ({
      limit?: number,
      section?: 'latest' | 'popularity',
      lastId?: number,
    })) => axios.get(endpoint, {
      params: {
        limit,
        section,
        lastId,
        type: 'articles',
      },
    }),
  },
}

export default newsService