import axios from 'axios'
import helpers from '../../core/helpers'

const endpoint = 'https://cobak.co.kr/api/media'

const newsService = {
  upbit: () => axios.get('https://api-manager.upbit.com/api/v1/coin_news'),
  cobak: {
    articles: ({
      page = 0,
      current_time = helpers.dayjs().format('YYYY-MM-DD'),
      news_type = 'best_news',
    }: ({
      page: number,
      current_time: string,
      news_type: 'best_news',
    })) => axios.get(`${endpoint}/news_list`, {
      params: {
        page,
        current_time,
        news_type,
        list_type: 'all'
      },
    }),
    feeds: ({
      page = 0,
      current_time = helpers.dayjs().format('YYYY-MM-DD'),
    }: ({
      page: number,
      current_time: string,
    })) => axios.get(`${endpoint}/breaking_news_list`, {
      params: {
        page,
        current_time,
        list_type: 'all',
      },
    }),
    issues: () => axios.get(endpoint, { params: { type: 'issues' } }),
  },
}

export default newsService