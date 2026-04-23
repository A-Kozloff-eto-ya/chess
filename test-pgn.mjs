import fs from 'fs'

const bundle = fs.readFileSync('node_modules/vue3-chessboard/dist/vue3-chessboard.js', 'utf8')

// Extract the exact loadPgn function from the bundle
const start = bundle.indexOf('loadPgn(t, { strict')
const end = bundle.indexOf('\n  }', start + 100)
const funcText = bundle.substring(start, end + 3)

// Check what n() actually does - extract it
const nStart = bundle.indexOf('function n(v)', start - 200)
const nEnd = bundle.indexOf('}', nStart + 20) + 1
const nFuncText = bundle.substring(nStart, nEnd)
console.log('n function:', JSON.stringify(nFuncText))

// Now test the ACTUAL regex behavior
// The o = newlineChar is: CR + ? + LF (template literal `\r?\n`)
const o = '\r' + '?' + '\n'
console.log('o chars:', [...o].map(x => x.charCodeAt(0)))

// In the minified code: n(v) { return v.replace(/\\/g, "\\"); }
// This is a no-op - replaces backslash with backslash
// But since o has no backslashes, it doesn't matter

// The regex from the bundle:
// ^(\\[((?:O)|.)*\\])((?:\\s*O){2}|(?:\\s*O)*$)
// where O is the newlineChar string
const pgn = fs.readFileSync('test-pgn-data.txt', 'utf8').trim()
console.log('\nPGN first 100:', JSON.stringify(pgn.substring(0, 100)))
console.log('PGN has CRLF:', pgn.includes('\r\n'))
console.log('PGN has LF only:', pgn.includes('\n') && !pgn.includes('\r'))

// Test with the actual regex construction from the bundle
const n = v => v  // n() is a no-op when there are no backslashes
const regexStr = "^(\\[((?:" + n(o) + ")|.)*\\])((?:\\s*" + n(o) + "){2}|(?:\\s*" + n(o) + ")*$)"
const re = new RegExp(regexStr)
const match = re.exec(pgn.trim())
console.log('\nRegex match:', !!match)
if (match) {
  console.log('Headers captured:', match[1].length, 'chars')
  console.log('Separator:', JSON.stringify(match[2]))
} else {
  console.log('REGEX FAILED - headers will be treated as moves!')
}

// Test with chess.js directly
import { Chess } from 'chess.js'
const ch = new Chess()
try {
  ch.loadPgn(pgn)
  console.log('\nchess.js loadPgn: OK, moves:', ch.history().length)
} catch(e) {
  console.log('\nchess.js loadPgn FAILED:', e.message)
}
