import fs from 'fs'
import path from 'path'
import moment from 'moment-timezone'
import 'moment/locale/id.js'  
moment.tz.setDefault('Asia/Jakarta')
moment.locale('id')        

const DB_PATH = path.join(process.cwd(), 'database', 'sewa.json')
const linkRegex = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i

const readDB = () => { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [] } catch { return [] } }
const writeDB = (arr) => fs.writeFileSync(DB_PATH, JSON.stringify(arr, null, 2))

const toMs = (n, unit='hari') => {
  n = Number(n) || 0; unit = String(unit).toLowerCase()
  if (/^menit|min|mnt$/.test(unit)) return n * 60 * 1000
  if (/^jam|hour|hours$/.test(unit)) return n * 60 * 60 * 1000
  if (/^hari|day|days$/.test(unit)) return n * 24 * 60 * 60 * 1000
  if (/^minggu|week|weeks$/.test(unit)) return n * 7 * 24 * 60 * 60 * 1000
  if (/^bulan|month|months$/.test(unit)) return n * 30 * 24 * 60 * 60 * 1000
  return 0
}
function parseDuration(text='') {
  const m = text.trim().match(/^(\d+)\s*(\w+)?$/i)
  if (!m) return 0
  return toMs(m[1], m[2] || 'hari')
}

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

let handler = async (m, { fenrys, text, command }) => {
  const db = readDB()
  if (/^addsewa$/i.test(command)) {
    if (!text) return m.reply(`Contoh:\n.addsewa https://chat.whatsapp.com/INVITECODE 7 hari`)
    const link = (text.match(/https?:\/\/\S+/i) || [null])[0]
    const durStr = text.replace(link || '', '').trim() || '7 hari'
    const ms = parseDuration(durStr)

    if (!link) return m.reply('❌ Link grup tidak ditemukan.')
    const codeMatch = linkRegex.exec(link)
    if (!codeMatch) return m.reply('❌ Link undangan tidak valid.')
    if (!ms) return m.reply('❌ Durasi tidak valid. Contoh: 7 hari / 3 jam / 30 menit')

    let groupId
    try {
      const res = await fenrys.groupAcceptInvite(codeMatch[1])
      groupId = res?.gid || res?.id || res
    } catch (e) {
      console.error('[sewa] gagal join:', e)
      return m.reply('❌ Gagal join ke grup. Pastikan link aktif & bot tidak dibatasi.')
    }
    if (!groupId) return m.reply('❌ Tidak bisa mengambil JID grup.')

    const now = Date.now(), end = now + ms
    const idx = db.findIndex(x => x.id === groupId)
    const base = { id: groupId, invited_by: m.sender, link, start: now, end, duration_ms: ms }
    if (idx >= 0) db[idx] = { ...db[idx], ...base, notify24h: false, notify1h: false }
    else db.push({ ...base, notify24h: false, notify1h: false })
    writeDB(db)

    const until = moment(end).format('dddd, D MMMM YYYY HH:mm')
    await fenrys.sendMessage(groupId, {
      text: `Halo! Bot bergabung atas sewa dari @${m.sender.split('@')[0]}.\n` +
            `Masa aktif: *${msToHuman(ms)}* (sampai ${until}). Terima kasih 🙏`,
      mentions: [m.sender]
    })
    return m.reply(`✅ Bot bergabung.\n• JID: ${groupId}\n• Durasi: ${msToHuman(ms)}\n• Expire: ${until}`)
  }

  if (/^listsewa$/i.test(command)) {
    if (!db.length) return m.reply('Belum ada data sewa.')
    const now = Date.now()
    const lines = db.map((r, i) => {
      const left = r.end - now
      const until = moment(r.end).format('D MMMM YYYY HH:mm') 
      return `${i+1}. ${r.id}\n   sisa: ${msToHuman(left)} (sampai ${until})`
    }).join('\n\n')
    return m.reply(`📄 *Daftar Sewa (${db.length})*\n\n${lines}`)
  }

  if (/^delsewa$/i.test(command)) {
    let target = (text || '').trim()
    if (!target || /^this$/i.test(target)) target = m.chat
    const list = readDB()
    const idx = list.findIndex(x => x.id === target)
    if (idx < 0) return m.reply('❌ Data sewa tidak ditemukan.')

    try {
      await fenrys.sendMessage(target, { text: 'Sewa dihentikan oleh owner. Terima kasih 🙏' })
      await fenrys.groupLeave(target)
    } catch {}
    list.splice(idx, 1); writeDB(list)
    return m.reply(`✅ Sewa dihapus: ${target}`)
  }
}

handler.help = ['addsewa <link> <durasi>', 'delsewa <jid|this>', 'listsewa']
handler.tags = ['owner']
handler.command = /^(addsewa|delsewa|listsewa)$/i
handler.owner = true

export default handler
