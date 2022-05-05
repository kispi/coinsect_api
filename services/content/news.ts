import axios from 'axios'

const newsService = {
  coinness: {
    feeds: (lastId: number) => axios.get('https://api.coinness.live/feed/v1/news', { params: { lastId } }),
    articles: ({
      limit = 10,
      section = 'latest',
      lastId,
    }: ({
      limit?: number,
      section?: 'latest' | 'popularity',
      lastId?: number,
    })) => axios.get('https://api.coinness.live/feed/v1/articles', {
      params: {
        limit,
        section,
        lastId,
      },
    }),
  },
}

export default newsService