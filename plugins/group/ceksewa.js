/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — CEK SEWA
   NOTIFIKASI OTOMATIS KETIKA MASA SEWA SISA 24 JAM
   Creator: Juna | 2025
============================================================ */

import fs from 'fs'
import path from 'path'
import moment from 'moment-timezone'
import 'moment/locale/id.js'

moment.tz.setDefault('Asia/Jakarta')
moment.locale('id')

const DB_PATH = path.join(process.cwd(), 'database', 'sewa.json')

const readDB = () => { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [] } catch { return [] } }

function msToHuman(ms) {
  if (ms <= 0) return 'habis'
  let s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400); s %= 86400
  const h = Math.floor(s / 3600);  s %= 3600
  const m = Math.floor(s / 60);    const sec = s % 60
  const parts = []
  if (d) parts.push(`${d} hari`)
  if (h) parts.push(`${h} jam`)
  if (m) parts.push(`${m} menit`)
  if (!d && !h && !m && sec) parts.push(`${sec} detik`)
  return parts.join(' ')
}

async function isUserAdmin(fenrys, chatId, userJid) {
  try {
    const meta = await fenrys.groupMetadata(chatId)
    const me = meta.participants.find(p => p.id === userJid)
    return !!(me && (me.admin || me.superadmin))
  } catch { return false }
}

let handler = async (m, { fenrys }) => {

  const db = readDB()
  const rec = db.find(x => x.id === m.chat)
  if (!rec) return m.reply('ℹ️ Grup ini tidak terdaftar sebagai penyewa.')

  const now = Date.now()
  const left = rec.end - now
  const until = moment(rec.end).format('dddd, D MMMM YYYY HH:mm')
  const inviter = rec.invited_by ? `@${rec.invited_by.split('@')[0]}` : '-'
  const status = left > 0
    ? `✅ *Aktif* — sisa: *${msToHuman(left)}*\n⏲️ Berakhir: *${until}*`
    : `⛔ *Habis* — seharusnya berakhir: *${until}*`

  const reminder = (left > 0 && left <= 24*60*60*1000)
    ? `\n\n⚠️ *Masa sewa hampir habis* (kurang dari 24 jam).\nHubungi ${inviter} untuk perpanjang.`
    : ''

  return fenrys.sendMessage(
    m.chat,
    {
      text:
`🧾 *Info Sewa Bot*
• Status  : ${status}
• Durasi  : ${msToHuman(rec.duration_ms || (rec.end - rec.start))}
• Pemesan : ${inviter}${reminder}`,
      mentions: rec.invited_by ? [rec.invited_by] : []
    },
    { quoted: m }
  )
}

handler.help = ['ceksewa']
handler.tags = ['group']
handler.command = /^(ceksewa)$/i
handler.group = true
handler.admin = true

export default handler