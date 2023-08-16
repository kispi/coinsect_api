import axios from 'axios'

const newsService = {
  upbit: () => axios.get('https://api-manager.upbit.com/api/v1/coin_news'),
}

export default newsService