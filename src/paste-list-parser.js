/**
 * Parses pasted list text into an array of task strings.
 * - Splits on newlines (\n or \r\n)
 * - Strips markdown/list prefixes: [ ], [x], bullets (- * • —), numbers (1. 1)), # headings
 * - Trims and filters empty lines
 *
 * @param {string} raw - Raw pasted text
 * @returns {string[]} Non-empty task strings, one per line
 */
export function parsePastedList(raw) {
  if (typeof raw !== 'string') return []
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split(/\n/)
  return lines.map((line) => stripPrefixes(line.trim())).filter((s) => s.length > 0)
}

const checkbox = /^\[\s*[xX]?\s*\]\s*/
const bullet = /^[-*•—]\s*/
const numbered = /^\d+[.)]\s*/
const heading = /^#+\s*/

function stripPrefixes(line) {
  let s = line
  let prev
  do {
    prev = s
    s = s.replace(bullet, '').replace(numbered, '').replace(checkbox, '').replace(heading, '')
  } while (s !== prev)
  return s.trim()
}
