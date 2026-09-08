import fs from 'fs'
import chalk from 'chalk'

let handler = async (m, { fenrys }) => {
    
  await fenrys.sendMessage(m.chat, {
    text: "On",
    contextInfo: { mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['tes']
handler.tags = ['general']
handler.command = /^(tes|test)$/i

export default handler
