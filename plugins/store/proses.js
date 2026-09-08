import fs from 'fs'
import chalk from 'chalk'
import moment from 'moment-timezone' 

let handler = async (m, { fenrys, isAdmins }) => {

  const time = moment().tz('Asia/Jakarta').format('HH:mm')
  const tanggal = moment().tz('Asia/Jakarta').format('D MMM YYYY')

  if (!m.quoted) {
    await fenrys.sendMessage(m.chat, { text: '❗ Reply pesanan yang akan diproses/selesai.' }, { quoted: m })
    return
  }
  
  const quotedText = m.quoted.text || 'Tidak ada catatan pesanan.'
  const userJid = m.quoted.sender 
  const userName = userJid.split("@")[0]
  const triggerCommand = (m.text || '').toLowerCase().split(' ')[0] 

  let replyText = ''
  
  if (triggerCommand === 'proses') {
    replyText = `
「 ⏳ TRANSAKSI PENDING 」

*📆 TANGGAL*: ${tanggal}
*⌚ JAM*: ${time}
*✨ STATUS*: Pending

📝 *Catatan Pesanan*:
${quotedText}

Pesanan *@${userName}* sedang di *proses*!
    `.trim()
    
  } else if (triggerCommand === 'done') {
    replyText = `
「 ✅ TRANSAKSI BERHASIL 」

*📆 TANGGAL*: ${tanggal}
*⌚ JAM*: ${time}
*✨ STATUS*: Berhasil

Terimakasih *@${userName}* Next Order ya🙏
    `.trim()
  }
  
  if (replyText) {
    await fenrys.sendMessage(m.chat, { 
      text: replyText,
      contextInfo: { 
        mentionedJid: [userJid]
      }
    }, { quoted: m })
  }
}

handler.help = ['proses', 'done'] 
handler.tags = ['store'] 
handler.command = /^(proses|done)$/i
handler.group = true;
handler.admin = true;

export default handler