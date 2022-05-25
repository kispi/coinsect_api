import axios from 'axios'
import slack from './slack'
import { HTMLElement, parse } from 'node-html-parser'
import { getRepository } from 'typeorm'
import { Wallet } from '../entities/wallet'

const walletHelpers = {
  // wallet.balance === NULL 인 경우를 위해 디폴트를 0으로 설정
  asCryptoBalance: (balance: number) => (balance || 0).toLocaleString(undefined, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }),
  domToFloat: (dom: HTMLElement, delim?: string) => parseFloat((dom.innerHTML || '').split(delim)[0]),
}

const crawlBalance = {
  BTC: (doc: HTMLElement) => {
    const dom = doc.querySelectorAll('.sc-1ryi78w-0.cILyoi.sc-16b9dsl-1.ZwupP.u3ufsr-0.eQTRKC')[5]
    if (dom) return walletHelpers.domToFloat(dom, ' BTC')
  },
  ETH: (doc: HTMLElement) => {
    const dom = doc.querySelectorAll('.col-md-8')[0]
    if (dom) return walletHelpers.domToFloat(dom, ' Ether')
  },
  BCH: (doc: HTMLElement) => crawlBalance.BTC(doc), // 비트랑 똑같
  LTC: (doc: HTMLElement) => {
    const dom = doc.querySelector('.address-general-info').querySelectorAll('span')[7]
    if (dom) return walletHelpers.domToFloat(dom, ' LTC')
  },
  EOS: () => {},
  DOGE: () => {},
  SOL: () => {},
  GRS: () => {},
  ZEC: () => {},
  XMR: () => {},
  TRX: () => {},
}

const throughApi = (wallet: Wallet) => {
  return {
    XRP: async () => {
      try {
        const { xrpBalance }: any = await axios.get(`https://api.xrpscan.com/api/v1/account/${wallet.address}`)
        return xrpBalance
      } catch (e) {
        return Promise.reject(e)
      }
    }
  }
}

const scrape = async ({ html = '' as string, wallet = null as Wallet }): Promise<number> => {
  const api = throughApi(wallet)[wallet.blockchain.symbol]
  if (api) {
    return await api()
  }

  try {
    const selector = crawlBalance[wallet.blockchain.symbol]
    if (!selector) return Promise.reject({ message: `scrape: crawlBalance for ${wallet.blockchain.symbol} is not defined` })

    const balance = crawlBalance[wallet.blockchain.symbol](parse(html))
    if (isNaN(balance)) return Promise.reject({ message: 'scrape: balance is NaN. maybe dom innerHTML has changed?' })

    return Promise.resolve(balance)
  } catch (e) {
    return Promise.reject(e)
  }
}

const floatify = value => typeof value === 'string' ? parseFloat(value) : value

const walletService = {
  // 블록체인 익스플로러 사이트를 폴링해서 잔고를 업데이트한다.
  renewBalance: async (wallet: Wallet) => {
    try {
      // typeorm의 default설정은 bigNumberString: on이기 때문
      const originalBalance = floatify(wallet.balance)
      wallet.balance = floatify(await walletService.poll(wallet))
      await getRepository(Wallet).save(wallet)
      const before = walletHelpers.asCryptoBalance(originalBalance)
      const after = walletHelpers.asCryptoBalance(wallet.balance)
      if (before !== after) slack.postMessage(`
        ${wallet.blockchain.symbol}잔고가 업데이트되었습니다.\n
        (BEFORE: ${before})\n
        (AFTER: ${after})\n
        확인: ${wallet.exploreUrl()}
      `)
      console.log(`${wallet.blockchain.symbol} Balance`, before, after)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  poll: async (wallet: Wallet): Promise<number> => {
    if (!wallet.blockchain) return Promise.reject({ message: 'wallet.blockchain is not populated' })

    try {
      console.log(wallet.exploreUrl())
      const html: string = await axios.get(wallet.exploreUrl())
      if (!html) return Promise.reject({ message: `failed to fetch url ${wallet.exploreUrl()}` })

      return await scrape({ html, wallet })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  all: async () => {
    const wallets = await getRepository(Wallet)
      .createQueryBuilder()
      .leftJoinAndSelect('Wallet.blockchain', 'blockchain')
      // .where(`symbol = 'LTC'`)
      .getMany()

    wallets.slice(0, 4).forEach(async wallet => {
      try {
        await walletService.renewBalance(wallet)
      } catch (e) {
        console.error(e)
      }
    })
  },
}

export default walletService