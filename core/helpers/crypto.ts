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
  encryptAPIResponse: (data: any) => {
    const jsonData = JSON.stringify(data)
    let encrypted = ''

    for (let i = 0; i < jsonData.length; i++) {
      const char = jsonData.charAt(i)
      let encryptedChar = ''

      for (let j = 0; j < char.length; j++) {
        const charCode = char.charCodeAt(j)
        const shiftedCharCode = charCode - 5 // shiftAmount is 5.

        encryptedChar += String.fromCharCode(shiftedCharCode)
      }

      encrypted += encryptedChar
    }

    return encrypted
  },
}

export default crypto