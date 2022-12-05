const b62charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const b62DecodeBigInt = str => {
  var res = 0n,
    length = str.length,
    i,
    char
  for (i = 0; i < length; i++) {
    char = str.charCodeAt(i)
    if (char < 58) {
      char = char - 48 // 0-9
    } else if (char < 91) {
      char = char - 29 // A-Z
    } else {
      char = char - 87 // a-z
    }
    res += BigInt(char) * 62n ** BigInt(length - i - 1)
  }
  return res
}

const b62EncodeBigInt = int => {
  if (int === 0n) {
    return b62charset[0]
  }
  var res = ''
  while (int > 0n) {
    res = b62charset[int % 62n] + res
    int = int / 62n // Truncates due to bigint behaviour
  }
  return res
}

const padHex = str => (str.length % 2 === 0 ? str : `0${str}`)

const b62EncodeString = str =>
  str === ''
    ? ''
    : b62EncodeBigInt(BigInt(`0x${padHex(Buffer.from(str, 'utf-8').toString('hex'))}`))

const b62DecodeString = str =>
  str === '' ? '' : Buffer.from(padHex(b62DecodeBigInt(str).toString(16)), 'hex').toString('utf-8')

/**
 * From https://github.com/mathiasbynens/punycode.js
 * Creates an array containing the numeric code points of each Unicode
 * character in the string.
 * @param {String} string The Unicode input string (UCS-2).
 * @returns {Array} The new array of code points.
 */
const ucs2decode = string => {
  const output = []
  let counter = 0
  const length = string.length
  while (counter < length) {
    const value = string.charCodeAt(counter++)
    if (value >= 0xd800 && value <= 0xdbff && counter < length) {
      // It's a high surrogate, and there is a next character.
      const extra = string.charCodeAt(counter++)
      if ((extra & 0xfc00) == 0xdc00) {
        // Low surrogate.
        output.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000)
      } else {
        // It's an unmatched surrogate; only append this code unit, in case the
        // next code unit is the high surrogate of a surrogate pair.
        output.push(value)
        counter--
      }
    } else {
      output.push(value)
    }
  }
  return output
}

/**
 * From https://github.com/mathiasbynens/punycode.js
 * Creates a string based on an array of numeric code points.
 * @param {Array} codePoints The array of numeric code points.
 * @returns {String} The new Unicode string (UCS-2).
 */
const ucs2encode = codePoints => String.fromCodePoint(...codePoints)

const safeRegex = /[a-zA-Z0-9-]/

const compressUnsafePart = str => {
  if (str.match(/^_+$/u)) return '-'
  return str
}

const decompressUnsafePart = (str, outLength) => {
  if (str === '-') return '_'.repeat(outLength)
  return str
}

const isStringSafe = str => {
  const codePoints = ucs2decode(str)
  if (!codePoints.every(value => value < 128 && ucs2encode([value]).match(/[a-zA-Z0-9-_]/)))
    return false

  return true
}

/**
 * @param {string} str
 * @returns {bool}
 */
const isStringWellFormedRegularEncoderOutput = str => {
  // Does the input contain only safe characters?
  if (!isStringSafe(str)) return false

  const match = str.match(/^(?<safePart>[a-zA-Z0-9-_]*)-(?<encodedUnsafe>[a-zA-Z0-9]*)$/)

  // Does the string match the regex?
  if (!match) return false

  const { safePart, encodedUnsafe } = match.groups
  const nPlaceholders = (safePart.match(/_/g) || []).length

  // Does the safe part contain placeholders?
  if (nPlaceholders < 1) return false

  const unsafePart = decompressUnsafePart(b62DecodeString(encodedUnsafe), nPlaceholders)
  const unsafeCodePoints = ucs2decode(unsafePart)

  // Does the unsafe part decode to as many codepoints as there are placeholders in the safe part?
  if (nPlaceholders !== unsafeCodePoints.length) return false

  // Does the unsafe part only contain "_" characters and unsafe characters?
  if (!unsafeCodePoints.every(val => val > 127 || ucs2encode([val]).match(/[^a-zA-Z0-9-]/)))
    return false

  return true
}

/**
 * @param {string} str The string to human64-encode
 */
const encodeHuman64 = str => {
  if (isStringSafe(str) && !isStringWellFormedRegularEncoderOutput(str)) return str

  const codePoints = ucs2decode(str)
  let copy = ''
  let unsafePart = ''
  for (let [i, codePoint] of codePoints.entries()) {
    let char = ucs2encode([codePoint])
    if (codePoint < 128 && char.match(safeRegex)) {
      copy += char
    } else {
      copy += '_'
      unsafePart += char
    }
  }
  const b62encoded = b62EncodeString(compressUnsafePart(unsafePart))
  const safeEncode = `${copy}-${b62encoded}`
  return safeEncode
}

/**
 * @param {string} str The human64-encoded string to decode
 */
const decodeHuman64 = str => {
  if (!isStringWellFormedRegularEncoderOutput(str)) return str

  const { safePart, encodedUnsafe } = str.match(
    /^(?<safePart>.*)-(?<encodedUnsafe>[a-zA-Z0-9]*)$/
  ).groups
  if (!encodedUnsafe) return safePart

  const unsafePart = ucs2decode(
    decompressUnsafePart(b62DecodeString(encodedUnsafe), safePart.match(/_/g).length)
  )

  const safePartCodePoints = ucs2decode(safePart)
  let index = 0
  for (let codePoint of unsafePart) {
    while (safePartCodePoints[index] !== ucs2decode('_')[0]) index++
    safePartCodePoints[index] = codePoint
    index++
  }
  return ucs2encode(safePartCodePoints)
}

const encode = encodeHuman64
const decode = decodeHuman64

module.exports = { encode, decode }
