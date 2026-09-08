/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — BUY PRODUCT WITH QRIS STATIS
   Creator: Juna | 2025
============================================================ */

import fs from 'fs'
import path from 'path'

const STOCK_DIR = path.join(process.cwd(), 'database', 'stock')
const TX_DIR    = path.join(process.cwd(), 'database', 'transaction')

const norm = (s='') => String(s).trim().toLowerCase()
function ensureDir(p){ try{ fs.mkdirSync(p,{recursive:true}) }catch{} }
function uuid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36) }
function rup(n){ try{return `Rp${Number(n||0).toLocaleString('id-ID')}`}catch{return `Rp${n}` } }

function stockFile(product){ ensureDir(STOCK_DIR); return path.join(STOCK_DIR, `${norm(product)}.json`) }
function readStock(product){
  const f=stockFile(product)
  if(!fs.existsSync(f)) return { harga:null, items:[] }
  try{
    const data = JSON.parse(fs.readFileSync(f,'utf8')||'[]')
    if(Array.isArray(data)) return { harga:null, items:data }
    return { harga: typeof data.harga==='number'?data.harga:null, items: Array.isArray(data.items)?data.items:[] }
  }catch{ return { harga:null, items:[] } }
}

function userTxFile(user){ ensureDir(TX_DIR); return path.join(TX_DIR, `${user}.json`) }
function readUserTx(user){ const f=userTxFile(user); if(!fs.existsSync(f)) return []; try{ return JSON.parse(fs.readFileSync(f,'utf8')||'[]')||[] }catch{ return [] } }
function writeUserTx(user, arr){ fs.writeFileSync(userTxFile(user), JSON.stringify(arr,null,2)) }
function getPendingTx(user){ return readUserTx(user).find(t=>t.status==='pending') }

function parseBuyItems(text=''){
  const lines = String(text).split('\n').map(s=>s.trim()).filter(Boolean)
  if(!lines.length) return []
  const tmp=[]
  for(const raw of lines){
    const parts = raw.split(/\s+/).filter(Boolean)
    if(!parts.length) continue
    let qty = 1
    const last = parts[parts.length-1]
    if(/^\d+$/.test(last)){ qty = Math.max(1, parseInt(last,10)); parts.pop() }
    const product = norm(parts.join(' '))
    if(!product) continue
    tmp.push({ product, qty })
  }
  const merged={}
  for(const it of tmp) merged[it.product]=(merged[it.product]||0)+it.qty
  return Object.entries(merged).map(([product,qty])=>({product,qty}))
}

async function cmdBuy(m, fenrys, arg){
  const uid = String(m.sender || m.chat || 'user')
  const pending = getPendingTx(uid)
  if (pending) {
    return m.reply(
      '❗ Pesanan sebelumnya masih *pending*.\n' +
      `transactionId: ${pending.transactionId}\n` +
      `Ketik: status ${pending.transactionId} atau cancel ${pending.transactionId}`
    )
  }

  const items = parseBuyItems(arg || '')
  if (!items.length)
    return m.reply('Gunakan: buy <produk>[ <qty>]\nContoh:\n• buy netflix\n• buy netflix 3\n• buy netflix\\nspotify\\nyoutube 2')

  let cart=[], expectedTotal=0, unavailable=[]
  for(const it of items){
    const s=readStock(it.product)
    if(!s.harga){ unavailable.push(`${it.product} (harga belum diset)`); continue }
    if(s.items.length < it.qty){ unavailable.push(`${it.product} (stok habis)`); continue }
    const subtotal = s.harga * it.qty
    expectedTotal += subtotal
    cart.push({ product:it.product, qty:it.qty, unitPrice:s.harga, subtotal })
  }

  if (!cart.length) return m.reply('❌ Semua item tidak tersedia:\n- '+unavailable.join('\n- '))
  if (unavailable.length) await m.reply('⚠️ Item berikut dilewati karena stok tidak cukup:\n- '+unavailable.join('\n- '))

  // ID Transaksi Lokal acak
  const transactionId = 'TRX' + Date.now().toString().slice(-6)
  const grandTotal = expectedTotal

  // Menggunakan Gambar QRIS Statis lokal / link
  const qrisImagePath = './qris_statis.jpg'

  const caption = [
    `╭──────────────────────────────╮`,
    `│ 🧾 *ORDER DETAIL*`,
    `├──────────────────────────────┤`,
    ...cart.map(c => `│ ${c.product} × ${c.qty} @ ${rup(c.unitPrice)} = ${rup(c.subtotal)}`),
    `│───────────────`,
    `│ 💳 Total Bayar   : ${rup(grandTotal)}`,
    `├──────────────────────────────┤`,
    `│ transactionId: ${transactionId}`,
    `│ `,
    `│ Silakan scan QRIS di atas & bayar pas.`,
    `│ Setelah bayar, kirim bukti ke Admin!`,
    `╰──────────────────────────────╯`
  ].join('\n')

  let sent
  try {
    sent = await fenrys.sendMessage(m.chat, { image: { url: qrisImagePath }, caption }, { quoted: m })
  } catch (e) {
    console.error('[buy] kirim QR gagal:', e)
    return m.reply(`❌ Gagal mengirim gambar QRIS Statis. Pastikan file "qris_statis.jpg" ada di folder bot.`)
  }

  const qrKey = sent?.key ? {
    remoteJid: sent.key.remoteJid,
    id: sent.key.id,
    fromMe: sent.key.fromMe || true,
    participant: sent.key.participant || undefined
  } : null

  const tx = readUserTx(uid)
  tx.unshift({
    id: uuid(),
    chat: m.chat,
    status: 'pending',
    transactionId,
    expectedTotal,
    fee: 0,
    totalAmount: grandTotal,
    items: cart,
    qrKey,
    created_at: new Date().toISOString(),
    last_check_at: 0
  })
  writeUserTx(uid, tx)
}

async function cmdStatus(m, trx){
  const id=(trx||'').trim()
  if (!id) return m.reply('Gunakan: status <transactionId>')
  const uid=String(m.sender||m.chat||'user')
  const tx=readUserTx(uid)
  const found=tx.find(t=>t.transactionId===id)
  if(!found) return m.reply('❌ ID Transaksi tidak ditemukan.')

  return m.reply(
    `🧾 *STATUS TRANSAKSI*\n` +
    `• Trx ID: ${found.transactionId}\n` +
    `• Status: *${found.status.toUpperCase()}*\n` +
    `• Total : ${rup(found.totalAmount)}\n\n` +
    (found.status === 'pending' ? '📌 Silakan kirim bukti pembayaran ke Admin untuk di-ACC.' : '✅ Transaksi selesai.')
  )
}

async function cmdCancel(m, trx){
  const transactionId=(trx||'').trim()
  if (!transactionId) return m.reply('Gunakan: cancel <transactionId>')
  const uid=String(m.sender||m.chat||'user')
  const tx=readUserTx(uid)
  const idx=tx.findIndex(t=>t.transactionId===transactionId)
  if(idx!==-1){
    tx[idx].status='cancel'
    tx[idx].canceled_at=new Date().toISOString()
    writeUserTx(uid, tx)
  }
  return m.reply('✅ Transaksi berhasil dibatalkan.')
}

function cmdRiwayat(m){
  const uid=String(m.sender||m.chat||'user')
  const tx=readUserTx(uid)
  if(!tx.length) return m.reply('Riwayat kosong.')
  const lines=tx.slice(0,10).map(t =>
    `• [${t.status.toUpperCase()}] ${rup(t.totalAmount||t.expectedTotal)} — ${(t.items||[]).map(i=>`${i.product}×${i.qty}`).join(', ')}\n  trx: ${t.transactionId}\n  id: ${t.id} • ${t.created_at}`
  )
  return m.reply(['🧾 *Riwayat Pembelian (10 terakhir)*', ...lines].join('\n\n'))
}

let handler = async (m, { q, fenrys }) => {
  const text = (q && q.trim()) || (m.text || '').split(/\s+/).slice(1).join(' ')
  const cmd  = (m.text || '').trim().split(/\s+/)[0].toLowerCase()

  if (cmd === 'buy')     return cmdBuy(m, fenrys, text)
  if (cmd === 'status')  return cmdStatus(m, text)
  if (cmd === 'cancel')  return cmdCancel(m, text)
  if (cmd === 'riwayat') return cmdRiwayat(m)
}

handler.help = ['buy <produk>','status <trxId>','cancel <trxId>','riwayat']
handler.tags = ['store']
handler.command = /^(buy|status|cancel|riwayat)$/i
handler.group = false

export default handler
