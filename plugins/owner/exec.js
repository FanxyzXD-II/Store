/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — EVAL
   KARENA GW KURANG TAU PLUGINS MUNGKIN KODE INI PERLU PENYESUAIAN LAGI
   Creator: Juna | 2025
============================================================ */

import util from 'util'
import { exec } from 'child_process'

let handler = async (m, { fenrys, text, command }) => {
  const isEvalAsync = command === '=>'
  const isEval = command === '>'
  const isExec = command === '$'
 
  try {
    if (isEvalAsync) {
      let evaled = await eval(`(async () => { return ${text} })()`)
      if (typeof evaled !== 'string') evaled = util.inspect(evaled, { depth: 0 })
      return m.reply(evaled)
    }

    if (isEval) {
      let evaled = await eval(text)
      if (typeof evaled !== 'string') evaled = util.inspect(evaled, { depth: 0 })
      return m.reply(evaled)
    }
    
    if (isExec) {
      exec(text, (err, stdout, stderr) => {
        if (err) return m.reply(stderr || err.toString())
        if (stdout) return m.reply(stdout)
      })
    }
  } catch (err) {
    m.reply(String(err))
  }
}

handler.help = ['>', '=>', '$'].map(v => v + ' <kode>')
handler.tags = ['owner']
handler.command = /^(>|=>|\$)$/i
handler.owner = true

export default handler
