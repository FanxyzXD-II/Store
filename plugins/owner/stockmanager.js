/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — STOCK MANAGER
   UNTUK MEMANTAU STOCK AKUN KALIAN
   SUPPORT ADD AKUN, SET HARGA STOCK, EDIT STOCK (DATA AKUN), DELETE AKUN/STOCK, LIST STOCK (CEK DATA AKUN) 
   Creator: Juna | 2025
============================================================ */

import fs from 'fs'
import path from 'path'

const STOCK_DIR = path.join(process.cwd(), 'database', 'stock')
const norm = (s='') => String(s).trim().toLowerCase()

function ensureDir(){ try{ if(!fs.existsSync(STOCK_DIR)) fs.mkdirSync(STOCK_DIR,{recursive:true}) }catch{} }
function filePath(product){ ensureDir(); return path.join(STOCK_DIR, `${norm(product)}.json`) }

function readStock(product){
  const f=filePath(product)
  if(!fs.existsSync(f))return{harga:null,items:[]}
  try{
    const raw=fs.readFileSync(f,'utf8')
    const data=JSON.parse(raw||'[]')
    if(Array.isArray(data))return{harga:null,items:data}
    const harga=typeof data.harga==='number'?data.harga:null
    const items=Array.isArray(data.items)?data.items:[]
    return{harga,items}
  }catch{return{harga:null,items:[]}}
}
function writeStock(product,payload){
  const f=filePath(product)
  const safe={harga:typeof payload.harga==='number'?payload.harga:null,items:Array.isArray(payload.items)?payload.items:[]}
  fs.writeFileSync(f,JSON.stringify(safe,null,2))
}

function parseLines(t=''){return t.split('\n').map(v=>v.trim()).filter(Boolean)}

function addStock(line){
  const p=line.split('|').map(s=>s.trim())
  if(p.length<3)return{ok:false,reason:'invalid',raw:line}
  const[productRaw,emailRaw,pass]=p
  const product=norm(productRaw),email=norm(emailRaw)
  if(!product||!email||!pass)return{ok:false,reason:'invalid',raw:line}
  const s=readStock(product)
  if(s.items.some(x=>norm(x.email)===email))return{ok:false,reason:'duplicate',product,email}
  s.items.push({email,password:pass,created_at:new Date().toISOString()})
  writeStock(product,s)
  return{ok:true,product,email,harga:s.harga}
}

function setHarga(line){
  const p=line.split('|').map(s=>s.trim())
  if(p.length<2)return{ok:false,reason:'invalid',raw:line}
  const[productRaw,hargaRaw]=p
  const product=norm(productRaw),harga=Number(hargaRaw)
  if(!product||!Number.isFinite(harga))return{ok:false,reason:'invalid',raw:line}
  const s=readStock(product)
  s.harga=harga
  writeStock(product,s)
  return{ok:true,product,harga}
}

function changeStock(line){
  const p=line.split('|').map(s=>s.trim())
  if(p.length<3)return{ok:false,reason:'invalid',raw:line}
  const[productRaw,emailRaw,newPass]=p
  const product=norm(productRaw),email=norm(emailRaw)
  const s=readStock(product)
  const idx=s.items.findIndex(x=>norm(x.email)===email)
  if(idx===-1)return{ok:false,reason:'notfound',product,email}
  s.items[idx].password=newPass
  writeStock(product,s)
  return{ok:true,product,email}
}

function delStock(line){
  const p=line.split('|').map(s=>s.trim())
  const productRaw=p[0]; if(!productRaw)return{ok:false,reason:'invalid'}
  const product=norm(productRaw)
  const file=filePath(product)
  if(p.length===1){
    if(fs.existsSync(file)){ fs.unlinkSync(file); return{ok:true,reason:'deletedFile',product} }
    return{ok:false,reason:'notfoundFile',product}
  }
  const emailRaw=p[1],email=norm(emailRaw)
  const s=readStock(product)
  const idx=s.items.findIndex(x=>norm(x.email)===email)
  if(idx===-1)return{ok:false,reason:'notfound',product,email}
  s.items.splice(idx,1)
  writeStock(product,s)
  return{ok:true,product,email}
}

let handler=async(m,{q})=>{
  const args=(m.text||'').trim().split(/ +/).filter(Boolean)
  if(!args.length)return
  const cmd=args[0].toLowerCase()
  const input=q||args.slice(1).join(' ')

  if(cmd==='addstock'){
    if(!input)return m.reply(`Gunakan ${cmd} *product|email|password*\nContoh:\n${cmd} netflix|acc1@gmail.com|pass123`)
    const lines=parseLines(input)
    let added=[],dup=[],inv=[]
    for(const l of lines){
      const r=addStock(l)
      if(r.ok)added.push(`${r.product}:${r.email}`)
      else if(r.reason==='duplicate')dup.push(`${r.product}:${r.email}`)
      else inv.push(l)
    }
    let msg='✅ *Selesai menambah stock.*\n'
    if(added.length)msg+=`• Ditambah: ${added.join(', ')}\n`
    if(dup.length)msg+=`• Dilewati (sudah ada): ${dup.join(', ')}\n`
    if(inv.length)msg+=`• Invalid: ${inv.join(' | ')}\n`
    msg+=`\nℹ️ Atur harga: *setharga <product>|<harga>*`
    return m.reply(msg.trim())
  }

  if(cmd==='setharga'){
    if(!input)return m.reply(`Gunakan: ${cmd} *product|harga*\nContoh: ${cmd} netflix|10000`)
    const lines=parseLines(input)
    let set=[],inv=[]
    for(const l of lines){
      const r=setHarga(l)
      if(r.ok)set.push(`${r.product}→${r.harga}`)
      else inv.push(l)
    }
    let msg='💰 *Set Harga*\n'
    if(set.length)msg+=`• Berhasil: ${set.join(', ')}\n`
    if(inv.length)msg+=`• Invalid: ${inv.join(' | ')}\n`
    return m.reply(msg.trim())
  }

  if(['changestock','cstock'].includes(cmd)){
    if(!input)return m.reply(`Gunakan ${cmd} *product|email|newpassword*`)
    const lines=parseLines(input)
    let changed=[],nf=[],inv=[]
    for(const l of lines){
      const r=changeStock(l)
      if(r.ok)changed.push(`${r.product}:${r.email}`)
      else if(r.reason==='notfound')nf.push(l)
      else inv.push(l)
    }
    let msg='✅ *Selesai mengubah stock.*\n'
    if(changed.length)msg+=`• Diubah: ${changed.join(', ')}\n`
    if(nf.length)msg+=`• Tidak ditemukan: ${nf.join(', ')}\n`
    if(inv.length)msg+=`• Invalid: ${inv.join(' | ')}\n`
    return m.reply(msg.trim())
  }

  if(cmd==='delstock'){
    if(!input)return m.reply(`Gunakan ${cmd} *product|email* atau cukup *product* untuk hapus file produk`)
    const lines=parseLines(input)
    let del=[],nf=[],inv=[],deleted=[]
    for(const l of lines){
      const r=delStock(l)
      if(r.ok&&r.reason==='deletedFile')deleted.push(r.product)
      else if(r.ok)del.push(`${r.product}:${r.email}`)
      else if(r.reason==='notfound'||r.reason==='notfoundFile')nf.push(l)
      else inv.push(l)
    }
    let msg='🗑️ *Hasil Penghapusan Stock*\n\n'
    if(deleted.length)msg+=`🗂️ File dihapus: ${deleted.join(', ')}\n`
    if(del.length)msg+=`✅ Akun dihapus: ${del.join(', ')}\n`
    if(nf.length)msg+=`❌ Tidak ditemukan: ${nf.join(', ')}\n`
    if(inv.length)msg+=`⚠️ Invalid: ${inv.join(' | ')}\n`
    return m.reply(msg.trim())
  }

if (cmd === 'liststock') {
  ensureDir()
  const files = fs.readdirSync(STOCK_DIR).filter(f => f.endsWith('.json'))
  if (!files.length) return m.reply('❌ Belum ada stock produk apa pun.')

  let out = '╭─────────────────────────────╮\n'
  out += '│ 📦 *List Stock Semua Produk* │\n'
  out += '├─────────────────────────────┤\n'

  for (const f of files) {
    const product = f.replace('.json', '')
    const s = readStock(product)

    out += `│ 🛍️ *${product.toUpperCase()}*\n`
    out += `│ 📈 Jumlah : ${s.items.length}\n`
    out += `│ 💰 Harga  : ${s.harga != null ? `Rp${s.harga.toLocaleString('id-ID')}` : 'Belum diset'}\n`

    if (s.items.length) {
      out += `│───── DATA AKUN \n`
      s.items.forEach((d, i) => {
        out += `│ ${i + 1}. Email ✉️ ${d.email}\n`
        out += `│    Password 🔑 ${d.password}\n`
      })
    } else {
      out += `│───── DATA AKUN \n`
      out += `│ (tidak ada akun tersedia)\n`
    }

    out += '├─────────────────────────────┤\n'
  }

  out += '│ ℹ️ Atur harga: *setharga <product>|<harga>*\n'
  out += '╰─────────────────────────────╯'

  return m.reply(out.trim())
}
}

handler.help=['addstock','setharga','changestock','delstock','liststock']
handler.tags=['owner']
handler.command=/^(addstock|setharga|changestock|cstock|delstock|liststock)$/i
handler.owner=true
handler.group=false

export default handler
