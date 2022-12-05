const human64 = require('./human64')

const testInputs = [
  '', // the empty string should not be touched
  'a', // a safe string should not be touched
  '.', // an unsafe string should be encoded
  'ä', // a non-ascii string should be encoded and decoded safely
  'hello❤️world', // an unsafe string containing multiple-codepoint symbols should be encoded and decoded safely
  '_', // a safe string containing a placeholder character should not be touched
  'hello-world', // a safe string containing a separator character, but no placeholder characters should not be touched
  'sdf-', // a safe string containing no placeholders should not be touched
  's_df-', // a safe string containing more placeholders (1) than unsafe-part characters (0) should not be touched
  'sdf-J', // a safe string where an unsafe part seems to indicate "arbitrarily many placeholders" but no placeholders should not be touched
  's___df-J', // a safe string with placeholders and an unsafe part that indicates placeholders should be processed
  'h__world-6u5', // should not be touched because "6u5" decodes to two safe characters ("aa")
  'h_world-3A8qvq', // should not be touched because "3A8qvq" decodes to too many characters ("ää")
  'h__world-3A8qvq' // should be processed because "3A8qvq" decodes to the correct amount of characters ("ää")
]

const main = () => {
  let passes = 0
  let failures = 0
  for (let input of testInputs) {
    const encoded = human64.encode(input)
    const decoded = human64.decode(encoded)
    const isPass = encoded.match(/^[a-zA-Z0-9-_]*$/u) && input === decoded
    if (isPass) {
      passes++
    } else {
      failures++
    }
  }
  console.log(passes, failures)
}

main()
