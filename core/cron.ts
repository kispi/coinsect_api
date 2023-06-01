import { log } from './logger'
import helpers from './helpers'

type IJob = {
  id: string,
  runnable: Function,
  interval: number,
  interv: any,
  iterations: number,
  lastRun: string,
}

const jobs = [] as IJob[]

const failableRun = async (job: IJob) => {
  try {
    await job.runnable()
  } catch (e) {
    log.error(`cronjob (id: ${job.id}) failed:`, e)
  }
}

const cron = {
  addJob: ({
    id,
    runnable,
    interval,
  }: {
    id: string,
    runnable: Function,
    interval: number,
  }) => {
    if (interval < 1000 * 10) {
      log.error(`Are you sure your cronjob will run within ${interval / 1000} seconds? interval should be longer than 10 seconds.`)
      return
    }

    jobs.push({
      id: id || helpers.crypto.generateUUID(true),
      runnable,
      interval,
      interv: null,
      iterations: 0,
      lastRun: null,
    })
  },
  stop: (jobId: string) => {
    const target = jobs.find(job => job.id === jobId)
    if (target) {
      clearInterval(target.interv)
      target.interv = null
    }
  },
  run: () => {
    jobs.forEach(job => {
      job.interv = setInterval(() => {
        failableRun(job)
        job.iterations += 1
        job.lastRun = helpers.dayjs().format()
      }, job.interval)
    })
  },
  stats: () => jobs.map(job => {
    return {
      id: job.id,
      interval: job.interval,
      iterations: job.iterations,
      lastRun: job.lastRun,
    }
  }),
}

export default cron