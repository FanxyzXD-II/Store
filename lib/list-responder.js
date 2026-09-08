import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'list.json')

function loadList() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [] }
  catch { return [] }
}

function findItem(db, chatId, key) {
  const k = String(key || '').trim().toLowerCase()
  return db.find(o => o.id === chatId && String(o.key).toLowerCase() === k)
}

export async function listAutoResponder(fenrys, m) {
  const body = (m?.text || '').trim()
  if (!body) return false

  if (/^([!.#/\\-])\w+/.test(body)) return false

  const db = loadList()
  const item = findItem(db, m.chat, body)
  if (!item) return false

  try {
    const caption = item.response ?? item.respon ?? ''
    if (item.isImage && item.image_url && item.image_url !== '-') {
      await fenrys.sendMessage(m.chat, { image: { url: item.image_url }, caption }, { quoted: m })
    } else {
      await fenrys.sendMessage(m.chat, { text: caption }, { quoted: m })
    }
  } catch (e) {
    console.error('[list-responder] gagal kirim:', e)
  }
  return true
}