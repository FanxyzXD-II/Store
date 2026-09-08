import fs from 'fs'
import path from 'path'

const STOCK_DIR = path.join(process.cwd(), 'database', 'stock')

function ensureDir () {
  try { fs.mkdirSync(STOCK_DIR, { recursive: true }) } catch {}
}

function getStockInfo () {
  ensureDir()
  const files = fs.readdirSync(STOCK_DIR).filter(f => f.endsWith('.json'))
  const result = []
  for (const file of files) {
    try {
      const product = file.replace('.json', '')
      const raw = fs.readFileSync(path.join(STOCK_DIR, file), 'utf8')
      const data = JSON.parse(raw || '[]')

      let count = 0, harga = null
      if (Array.isArray(data)) {
        count = data.length
      } else if (data && Array.isArray(data.items)) {
        count = data.items.length
        harga = typeof data.harga === 'number' ? data.harga : null
      }

      result.push({ product, count, harga })
    } catch {
    }
  }
  return result.sort((a, b) => a.product.localeCompare(b.product))
}

const fmtIDR = n => `Rp${Number(n).toLocaleString('id-ID')}`

let handler = async (m) => {
  const stocks = getStockInfo()
  if (!stocks.length) return m.reply('❌ Belum ada stock yang tersedia.')

  let lines = []
  lines.push('╭──────────────────────────────╮')
  lines.push('│ 📦 *Stock Tersedia*           │')
  lines.push('├──────────────────────────────┤')

  for (const s of stocks) {
    const title = `• ${s.product.toUpperCase()}`
    const jumlah = `${s.count} akun`
    const hargaStr = s.harga != null ? ` 💰 Harga ${fmtIDR(s.harga)}` : ''
    lines.push(`│ ${title}`)
    lines.push(`│   📈 Jumlah : ${jumlah}${hargaStr}`)
    lines.push('│') 
  }

  if (lines[lines.length - 1] === '│') lines.pop()
  lines.push('├──────────────────────────────┤')
  lines.push('│ 🛒 Cara beli: *buy <produk> [ Beri jumlah jika ingin buy lebih dari 1 akun ]*')
  lines.push('╰──────────────────────────────╯')

  return m.reply(lines.join('\n'))
}

handler.help = ['stock']
handler.tags = ['store']
handler.command = /^stock$/i
handler.group = false
handler.owner = false

export default handler