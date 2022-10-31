import IContext from '../core/interfaces/context'
import { dataSource } from '../database'

const activityQuery = (tablename: string) => {
  return `
    SELECT
      COUNT(*) AS count,
      MAX(p.nickname) AS nickname,
      MAX(p.image) AS image
    FROM ${tablename}
    LEFT JOIN users as u ON u.id = ${tablename}.user_id
    LEFT JOIN profiles as p ON p.user_id = u.id
    WHERE ${tablename}.user_id IS NOT NULL
    GROUP BY ${tablename}.user_id
    ORDER BY COUNT(*) DESC;
  `
}

const dashboardController = {
  activities: async (c: IContext) => {
    const keys = ['messages', 'posts', 'replies']
    try {
      const data = await Promise.all(keys.map(key => dataSource.query(activityQuery(key)))) 
      c.res.success(keys.map((key, idx) => ({ key, data: data[idx] })))
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default dashboardController