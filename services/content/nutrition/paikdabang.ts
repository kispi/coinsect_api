import { parse } from 'node-html-parser'
import axios from 'axios'
import useCache from '../../../core/cache'

const cache = useCache()

const menus = [
  { key: 'menu_coffee', title: '커피' },
  { key: 'menu_drink', title: '음료' },
  { key: 'menu_dessert', title: '디저트' },
  { key: 'menu_ccino', title: '빽스치노' }
]

const crawl = async (menu: string) => {
  if (!menu) return Promise.reject('No menu')

  try {
    return await axios.get(`https://paikdabang.com/menu/${menu}`) as string
  } catch (e) {
    return Promise.reject(e)
  }
}

const parseMenu = (dom: string) => parse(dom).querySelector('.menu_list').querySelectorAll('> ul > li').map(item => {
  const img = item.querySelector('img').getAttribute('src')
  const title = item.querySelector('.menu_tit').innerHTML
  const desc = item.querySelector('p.txt').innerHTML
  const ingredientsArr = item.querySelectorAll('.ingredient_table li').map(ing => ing.querySelectorAll('div').map(div => div.innerHTML)).map(arr => ({
    key: arr[0],
    value: arr[1],
  }))
  const ingredients = {}
  ingredientsArr.forEach(ing => ingredients[ing.key] = ing.value)

  return {
    title,
    desc,
    img,
    ingredients,
  }
})

const paikdabang = {
  all: async () => {
    try {
      const cached = await cache.get('content:nutrition:paikdabang')
      if (cached) return cached

      const crawledHTMLs = await Promise.all(menus.map(menu => crawl(menu.key)))
      const items = []
      crawledHTMLs.map(parseMenu).forEach(menu => items.push(...menu))
      cache.set('content:nutrition:paikdabang', items, 3600)
      return items
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default paikdabang