import axios from 'axios'
import { parse } from 'node-html-parser'

const crawlCombot = async () => {
  const result = []
  try {
    const data = await axios.get('https://combot.org/c/1664317137/l') as string
    const leaderboardElements = parse(data).querySelectorAll('.leaderboard_element')
    Array.from(leaderboardElements).forEach(leaderboardElement => {
      const rank = leaderboardElement.querySelector('.text-monospace.before').innerHTML.trim()
      const name = leaderboardElement.querySelector('.leaderboard_name').innerHTML.trim()
      const imgSrc = leaderboardElement.getElementsByTagName('img')[0].getAttribute('src')
      const level = leaderboardElement.querySelector('small').innerHTML.trim().split('Level ')[1]
      const [current, total] = leaderboardElement.querySelector('.progress-bar').innerHTML.trim().split(' XP')[0].split('/')
      const data = {
        rank,
        name,
        level,
        imgSrc,
        progress: {
          current,
          total,
        },
      }
      result.push(data)
    })
    return result
  } catch (e) {
    return Promise.reject(e)
  }
}

export default crawlCombot