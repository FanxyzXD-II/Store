/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — SEWA WITH NOTIFICATION EXPIRED
   Creator: Juna | 2025
============================================================ */

import fs from 'fs'
import path from 'path'
import moment from 'moment-timezone'
import 'moment/locale/id.js'

moment.tz.setDefault('Asia/Jakarta')
moment.locale('id')

const DB_PATH = path.join(process.cwd(), 'database', 'sewa.json')

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return []
    const raw = fs.readFileSync(DB_PATH, 'utf8') || '[]'
    const arr = JSON.parse(raw || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function writeDB(arr) {
  fs.writeFileSync(DB_PATH, JSON.stringify(arr, null, 2))
}
const fmt = ts => moment(ts).format('dddd, D MMMM YYYY HH:mm')
const diffMs = ts => Number(ts) - Date.now()

export function listSewa() {
  return readDB()
}
export function upsertSewa(record) {
  const db = readDB()
  const idx = db.findIndex(x => x.id === record.id)
  if (idx >= 0) db[idx] = { ...db[idx], ...record }
  else db.push({ notify24h: false, notify1h: false, ...record })
  writeDB(db)
}
export function delSewa(id) {
  writeDB(readDB().filter(x => x.id !== id))
}

let _started = false
export function startSewaWatcher(fenrys, { intervalMs = 5000 } = {}) {
  if (_started) return
  _started = true
  console.log('[sewa] watcher started @', intervalMs, 'ms')

  setInterval(async () => {
    let db = readDB()
    if (!db.length) return

    const now = Date.now()
    let changed = false

    for (const r of db) {
      const remaining = r.end - now
      if (remaining <= 24 * 60 * 60 * 1000 && remaining > 60 * 60 * 1000 && !r.notify24h) {
        r.notify24h = true
        changed = true
        try {
          await fenrys.sendMessage(r.id, {
            text: `⚠️ *Masa sewa hampir habis* (kurang dari 24 jam).\nPemesan: @${(r.invited_by || '').split('@')[0]}\nBerakhir: ${fmt(r.end)}.`,
            mentions: r.invited_by ? [r.invited_by] : []
          })
        } catch {}
      }
      if (remaining <= 60 * 60 * 1000 && remaining > 0 && !r.notify1h) {
        r.notify1h = true
        changed = true
        try {
          await fenrys.sendMessage(r.id, {
            text: `⏰ *Sisa waktu sewa < 1 jam*.\nBerakhir: ${fmt(r.end)}.\nSilakan perpanjang bila diperlukan.`
          })
        } catch {}
      }
    }
    if (changed) writeDB(db)

    const expired = db.filter(r => r.end <= now)
    if (!expired.length) return

    for (const r of expired) {
      const jid = r.id
      db = db.filter(x => x.id !== jid)
      writeDB(db)

      try {
        await fenrys.sendMessage(jid, {
          text: `⏳ *Masa sewa berakhir*\nTerima kasih telah menyewa bot.\nBerakhir: ${fmt(r.end)}.\nBot akan keluar dari grup ini.`
        })
      } catch {}

      try {
        await fenrys.groupLeave(jid)
        console.log('[sewa] left:', jid)
      } catch (e) {
        console.error('[sewa] groupLeave gagal:', e?.message)
        try {
          const me = fenrys.user?.id
          if (me) await fenrys.groupParticipantsUpdate(jid, [me], 'remove')
        } catch (e2) {
          console.error('[sewa] fallback remove self gagal:', e2?.message)
        }
      }
    }
  }, Math.max(1000, intervalMs))
}