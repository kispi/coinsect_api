import { FastifyInstance } from 'fastify'
import { useRouter } from './core/router'
import helpers from './core/helpers'
import middlewares from './core/middlewares'
import useControllers from './controllers'

const ctrls = useControllers()

// 최소 권한을 정의하는 미들웨어들
const auth = {
  admin: middlewares.adminAuth,
}

const useRouteCRUD = ({ app, model }) => {
  const router = useRouter(app)

  const sp = helpers.case.pluralize(helpers.case.toSnake(model))

  router.post(`/admin/${sp}`, ctrls.admin[model].create, auth.admin.super)
  router.get(`/admin/${sp}`, ctrls.admin[model].all, auth.admin.super)
  router.get(`/admin/${sp}/:id`, ctrls.admin[model].detail, auth.admin.super)
  router.put(`/admin/${sp}/:id`, ctrls.admin[model].update, auth.admin.super)
  router.delete(`/admin/${sp}/:id`, ctrls.admin[model].delete, auth.admin.super)
}

export const useRoutes = (app: FastifyInstance) => ({
  deploy: () => {
    const router = useRouter(app)

    router.get('/deploy/coinsect_web', ctrls.deploy['coinsect_web'].status)
    router.post('/deploy/coinsect_web', ctrls.deploy['coinsect_web'].request)

    router.get('/deploy/coinsect_api', ctrls.deploy['coinsect_api'].status)
    router.post('/deploy/coinsect_api', ctrls.deploy['coinsect_api'].request)
  },
  admin: () => {
    const router = useRouter(app)

    router.post('/admin/chat/ban_ip', ctrls.admin.chat.banIP, auth.admin.super)
    router.post('/admin/chat/send_message', ctrls.admin.chat.sendMessage, auth.admin.super)

    router.get('/admin/store/bad_words', ctrls.admin.store.badWord.all, auth.admin.super)
    router.get('/admin/store/banned_users', ctrls.admin.store.bannedUser.all, auth.admin.super)
    router.post('/admin/store/bad_words/invalidate', ctrls.admin.store.badWord.invalidate, auth.admin.super)
    router.post('/admin/store/banned_users/invalidate', ctrls.admin.store.bannedUser.invalidate, auth.admin.super)
    router.post('/admin/store/messages/invalidate', ctrls.admin.store.message.invalidate, auth.admin.super)
    router.post('/admin/store/admin_token', ctrls.admin.store.setAdminToken)

    router.get('/admin/crons', ctrls.admin.cron.all, auth.admin.super)

    router.get('/admin/contents/real_time_positions/change_notifications', ctrls.content.realTimePositions.changeNotification.all, auth.admin.position)
    router.get('/admin/contents/real_time_positions/presets', ctrls.content.realTimePositions.presets, auth.admin.position)
    router.post('/admin/contents/real_time_positions', ctrls.content.realTimePositions.set, auth.admin.position)
    router.delete('/admin/contents/real_time_positions/:id', ctrls.content.realTimePositions.delete, auth.admin.position)

    useRouteCRUD({ app, model: 'badWord' })
    useRouteCRUD({ app, model: 'bannedUser' })
    useRouteCRUD({ app, model: 'blockchain' })
    useRouteCRUD({ app, model: 'board' })
    useRouteCRUD({ app, model: 'image' })
    useRouteCRUD({ app, model: 'message' })
    useRouteCRUD({ app, model: 'notification' })
    useRouteCRUD({ app, model: 'person' })
    useRouteCRUD({ app, model: 'post' })
    useRouteCRUD({ app, model: 'reaction' })
    useRouteCRUD({ app, model: 'reply' })
    useRouteCRUD({ app, model: 'wallet' })
  },
  service: () => {
    const router = useRouter(app)

    router.get('/config', ctrls.config.get)
    router.post('/config', ctrls.config.post)

    router.get('/wallets', ctrls.wallet.all)

    router.post('/users/sign_in', ctrls.auth.signIn)
    router.post('/users/sign_in_kakao', ctrls.auth.signInKakao)

    router.get('/users/me', ctrls.user.me)

    router.get('/persons', ctrls.person.all)

    router.get('/posts', ctrls.post.all)
    router.get('/posts/:sharingKey', ctrls.post.detail)
    router.post('/posts', ctrls.post.create)
    router.put('/posts/:sharingKey', ctrls.post.update)
    router.post('/posts/:sharingKey/check_password', ctrls.post.checkPassword)
    router.delete('/posts/:sharingKey', ctrls.post.delete)

    router.post('/replies', ctrls.reply.create)
    router.delete('/replies/:id', ctrls.reply.delete)
    router.post('/replies/:id/check_password', ctrls.reply.checkPassword)
    router.post('/reactions', ctrls.reaction.toggle)

    router.get('/market_info/leaderboard', ctrls.marketInfo.leaderboard)
    router.get('/market_info/indices', ctrls.marketInfo.indices)
    router.get('/market_info/symbols', ctrls.marketInfo.symbols)
    router.get('/market_info/markets', ctrls.marketInfo.markets)
    router.get('/market_info/crypto', ctrls.marketInfo.crypto)
    router.get('/market_info/nasdaq', ctrls.marketInfo.nasdaq)
    router.get('/market_info/assets_including_metal', ctrls.marketInfo.assetsIncludingMetal)

    router.get('/contents/public_treasuries', ctrls.content.publicTreasuries)
    router.get('/contents/real_time_positions', ctrls.content.realTimePositions.all)
    router.post('/contents/real_time_positions/change_notifications', ctrls.content.realTimePositions.changeNotification.create)

    router.get('/contents/news/cobak/feeds', ctrls.content.news.cobak.feeds)
    router.get('/contents/news/cobak/articles', ctrls.content.news.cobak.articles)
    router.get('/contents/news/cobak/issues', ctrls.content.news.cobak.issues)

    router.get('/onchain/richlist/bitcoin', ctrls.onchain.richlist.bitcoin)
    router.get('/onchain/richlist/bitcoin_cash', ctrls.onchain.richlist.bitcoinCash)
    router.get('/onchain/richlist/dogecoin', ctrls.onchain.richlist.dogecoin)
    router.get('/onchain/richlist/litecoin', ctrls.onchain.richlist.litecoin)

    router.get('/helpers/crawled_websites/:url', ctrls.helper.crawledWebsites.one) // method가 post여야 할 것 같지만 get으로...
    router.get('/helpers/crawled_websites', ctrls.helper.crawledWebsites.all)
    router.get('/helpers/crawled_websites/examples', ctrls.helper.crawledWebsites.examples)

    router.get('/notifications', ctrls.notification.all)

    router.get('/s3/upload_url', ctrls.s3.getSignedUrl)
    router.delete('/s3/object', ctrls.s3.deleteObject)
  },
})

export default useRoutes