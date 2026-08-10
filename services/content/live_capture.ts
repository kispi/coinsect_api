import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp'
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'

const firstLineOf = (e, fallback: string) => ((e || {}).stderr || '').toString().split('\n')[0].trim() || fallback

// 방송을 껐다 켜면 watch URL이 바뀌므로 채널 핸들에서 매번 라이브 URL을 다시 찾는다.
export const toLiveUrl = (channelUrl: string) => {
  const trimmed = (channelUrl || '').trim().replace(/\/live\/?$/, '')
  if (!trimmed) throw { message: '채널 URL이 없습니다.' }
  if (/\/watch\?v=|youtu\.be\//.test(trimmed)) return trimmed

  const handle = (trimmed.match(/@[\w.-]+/) || [])[0]
  if (!handle) throw { message: '유튜브 채널 URL(@핸들 형식)이 필요합니다.' }
  return `https://www.youtube.com/${handle}/live`
}

export const resolveLiveStream = async (channelUrl: string) => {
  const target = toLiveUrl(channelUrl)

  let stdout = ''
  try {
    const result = await execFileAsync(YT_DLP, [
      '--no-warnings',
      '--no-playlist',
      '-f', 'best[height<=1080]',
      '--print', '%(id)s',
      '--print', '%(is_live)s',
      '--print', 'urls',
      target,
    ], { timeout: 1000 * 30, maxBuffer: 1024 * 1024 })
    stdout = result.stdout
  } catch (e) {
    if (e.code === 'ENOENT') throw { message: '서버에 yt-dlp가 설치되어 있지 않습니다.' }

    const stderr = ((e || {}).stderr || '').toString()
    if (/404|does not exist/i.test(stderr)) throw { message: '채널을 찾을 수 없습니다. 채널 URL을 확인해주세요.' }
    if (/not currently live|This live event|no video/i.test(stderr)) throw { message: '현재 방송 중이 아닙니다.' }
    if (/Sign in to confirm|bot|cookies/i.test(stderr)) throw { message: '유튜브가 서버 접근을 차단했습니다. (봇 차단)' }
    throw { message: `라이브 주소 확인에 실패했습니다: ${firstLineOf(e, e.message)}` }
  }

  const [videoId, isLive, hlsUrl] = stdout.trim().split('\n').map(s => s.trim())
  if (isLive !== 'True') throw { message: '현재 방송 중이 아닙니다.' }
  if (!hlsUrl) throw { message: '라이브 스트림 주소를 찾지 못했습니다.' }

  return { videoId, hlsUrl }
}

// 영상을 받을 필요 없이 HLS에 붙어 프레임만 뽑고 끊는다.
// 오버레이가 다른 UI에 가려지는 정도가 프레임마다 달라서 여러 장을 뜬다.
export const captureFrames = async (hlsUrl: string, count: number, intervalSeconds: number) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'position-'))

  try {
    await execFileAsync(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', hlsUrl,
      '-t', String(count * intervalSeconds),
      '-vf', `fps=1/${intervalSeconds},scale=1280:-2`,
      '-frames:v', String(count),
      '-q:v', '3',
      path.join(dir, 'f_%d.jpg'),
    ], { timeout: 1000 * 60, maxBuffer: 1024 * 1024 })

    return fs.readdirSync(dir).sort()
      .map(name => fs.readFileSync(path.join(dir, name)).toString('base64'))
  } catch (e) {
    if (e.code === 'ENOENT') throw { message: '서버에 ffmpeg가 설치되어 있지 않습니다.' }
    throw { message: `스크린샷 캡처에 실패했습니다: ${firstLineOf(e, e.message)}` }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
