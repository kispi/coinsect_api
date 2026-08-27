import axios from 'axios'
import caseHelpers from '../../core/helpers/case'

// 업비트 원천은 featuredList/createdAt/isBest 자리에 snake_case를 준다. 그대로 중계하면
// dashboards/main 응답 안에서 우리 키(realTimePositions, whaleAlerts)와 표기가 섞이므로
// 여기서 한 번 camelCase로 맞춰 내보낸다.
const newsService = {
  upbit: async () => caseHelpers.keysToCamel(await axios.get('https://api-manager.upbit.com/api/v1/coin_news')),
}

export default newsService
