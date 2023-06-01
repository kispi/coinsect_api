const slugid = require('slugid')
const nodeCrypto = require('crypto')

const crypto = {
  hashed: (raw: string) => nodeCrypto.createHash('sha256').update(raw).digest('base64'),
  compare: (hashed: string, raw: string) =>
    hashed &&
    raw &&
    nodeCrypto.createHash('sha256').update(raw).digest('base64') === hashed,
  generateUUID: (asBase64?: boolean) => {
    const slug = slugid.v4()

    if (asBase64) return slug

    const uuid = slugid.decode(slug)
    return uuid
  },
}

export default crypto