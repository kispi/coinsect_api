import cron from '../core/cron'
import walletService from './wallet'
import chatService from './chat'
import whaleAlertService from './onchain/whale_alert'

const cronService = {
  run: () => {
    cron.addJob({
      id: 'renewWalets',
      runnable: walletService.renewAll,
      interval: 1000 * 60 * 60,
    })
    cron.addJob({
      id: 'deleteOldChatUsers',
      runnable: () => chatService.deleteOldUsers(48),
      interval: 1000 * 60 * 60,
    })
    cron.addJob({
      id: 'crawlWhaleAlerts',
      runnable: () => whaleAlertService.crawl(),
      interval: 1000 * 60,
    })
    cron.run()
  },
}

export default cronService