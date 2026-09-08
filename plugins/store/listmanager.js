/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — LIST SUPPORT IMAGE
   UNTUK UPLOADER BISA KALIAN GANTI KALAU MAU PAKAI YANG LAIN
   Creator: Juna | 2025
============================================================ */

import fs from 'fs'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import { quax } from '../../lib/uploader.js'

const DB_PATH = path.join(process.cwd(), 'database', 'list.json')

const readDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [] }
  catch { return [] }
}
const writeDB = (arr) => fs.writeFileSync(DB_PATH, JSON.stringify(arr, null, 2))
const norm = (s='') => String(s).trim().toLowerCase()

async function uploadFromQuotedLikeTourl(m) {
  try {
    const qmsg = m.quoted ? m.quoted : m
    const mime = (qmsg.msg || qmsg).mimetype || ''
    if (!mime || !/^(image|video|audio|application)\//.test(mime)) {
      return { url: null, isImage: false }
    }
    const buffer = await qmsg.download()
    const fileInfo = await fileTypeFromBuffer(buffer)
    const ext = fileInfo ? fileInfo.ext : 'bin'
    const tmp = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const filename = path.join(tmp, `${Date.now()}.${ext}`)
    fs.writeFileSync(filename, buffer)

    await m.reply('⏳ Upload ke qu.ax...')
    const url = await quax(filename)
    try { fs.unlinkSync(filename) } catch {}
    await m.reply(`✅ Upload sukses\n🔗 ${url}`)
    return { url, isImage: /^image\//i.test(mime) }
  } catch {
    await m.reply('❌ Upload error.')
    return { url: null, isImage: false }
  }
}

function getFullText(m){
  return (
    m.text ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    ''
  )
}

function parseMultiBlocks(body){
  const lines = body.split(/\r?\n/)
  const headerIdx = []
  const headerRe = /^\s*\d+\s+\S+\|/  
  
  for (let i = 0; i < lines.length; i++){
    if (headerRe.test(lines[i])) headerIdx.push(i)
  }

  if (!headerIdx.length) return null

  const blocks = []
  for (let h = 0; h < headerIdx.length; h++){
    const start = headerIdx[h]
    const end = (h + 1 < headerIdx.length) ? headerIdx[h + 1] : lines.length
    blocks.push(lines.slice(start, end).join('\n').trim())
  }
  return blocks
}

let handler = async (m) => {
  const fullText = getFullText(m)
  if (!fullText) return

  const cmd = fullText.trim().split(/\s+/)[0].toLowerCase()
  const body = fullText.replace(/^(\S+)\s*/, '') 

  // ======================= ADDLIST =======================
  if (cmd === 'addlist') {
    const { url: mediaUrl, isImage } = await uploadFromQuotedLikeTourl(m)
    const db = readDB()

    const firstLine = body.split(/\r?\n/)[0] || ''
    const isHeaderLike = /^\s*\d+\s+\S+\|/.test(firstLine)
    if (body.includes('|') && !isHeaderLike) {
      const [k, ...rest] = body.split('|')
      const key = norm(k)
      const val = rest.join('|').trim()
      if (!key || !val) return m.reply('⚠️ Format salah!\nGunakan: addlist key|response')

      if (db.some(o => o.id === m.chat && norm(o.key) === key))
        return m.reply('❌ Key sudah ada.')

      db.push({
        id: m.chat,
        key,
        respon: val,
        isImage: !!(isImage && mediaUrl),
        image_url: mediaUrl || '-'
      })
      writeDB(db)
      return m.reply(`✅ List *${key}* berhasil ditambahkan.`)
    }

    const blocks = parseMultiBlocks(body)
    if (!blocks) {
      return m.reply(`Gunakan format:
addlist key|response   ← satu list
atau multi:
1 key|response
2 key|response`)
    }

    let added = [], skipped = [], invalid = []
    for (const blk of blocks) {
      const lines = blk.split(/\r?\n/)
      const header = lines[0] || ''
      const headerNoNum = header.replace(/^\s*\d+\s+/, '')
      if (!headerNoNum.includes('|')) { invalid.push(blk); continue }

      const [k, ...restHeader] = headerNoNum.split('|')
      const key = norm(k)
      const valFirst = restHeader.join('|').trim()
      const valBody = lines.slice(1).join('\n').trim()
      const val = [valFirst, valBody].filter(Boolean).join('\n')

      if (!key || !val) { invalid.push(blk); continue }
      if (db.some(o => o.id === m.chat && norm(o.key) === key)) { skipped.push(k); continue }

      db.push({
        id: m.chat,
        key,
        respon: val,
        isImage: !!(isImage && mediaUrl),
        image_url: mediaUrl || '-'
      })
      added.push(key)
    }

    if (added.length) writeDB(db)

    let report = '✅ *Selesai menambah list.*\n'
    if (added.length) report += `• Ditambah: ${added.join(', ')}\n`
    if (skipped.length) report += `• Dilewati (sudah ada): ${skipped.join(', ')}\n`
    if (invalid.length) report += `• Invalid: ${invalid.length} baris`
    return m.reply(report.trim())
  }

  // ======================= DELLIST =======================
  if (cmd === 'dellist') {
    let db = readDB()
    const keys = body.split('\n').map(v => norm(v)).filter(Boolean)
    if (!keys.length) return m.reply(`Gunakan: dellist nama`)

    let deleted = [], notFound = []
    for (const k of keys) {
      const idx = db.findIndex(o => o.id === m.chat && norm(o.key) === k)
      if (idx === -1) { notFound.push(k); continue }
      db.splice(idx, 1); deleted.push(k)
    }

    if (deleted.length) writeDB(db)
    let rep = '🗑️ *Hasil Penghapusan List*\n'
    if (deleted.length) rep += `✅ Berhasil: ${deleted.join(', ')}\n`
    if (notFound.length) rep += `❌ Tidak ditemukan: ${notFound.join(', ')}`
    return m.reply(rep.trim())
  }
}

handler.help = ['addlist','dellist']
handler.tags = ['store']
handler.command = /^(addlist|dellist)$/i
handler.group = true
handler.admin = true

export default handler