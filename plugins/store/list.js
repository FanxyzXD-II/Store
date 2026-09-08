import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'list.json')

const readDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [] }
  catch { return [] }
}

let handler = async (m, { fenrys }) => {
  const db = readDB()
  const listGroup = db.filter(i => i.id === m.chat)

  if (listGroup.length === 0) {
    return m.reply(`Belum ada list message yang terdaftar di chat ini.`)
  }

  let groupName = ''
  try {
    const metadata = await fenrys.groupMetadata(m.chat)
    groupName = metadata?.subject || ''
  } catch {}

  let teks = `
╭───❏  🗂️ *LIST STORE*  ❏───╮
│👋 Halo : @${m.sender.split('@')[0]}
│🏷️ Grup : ${groupName || 'Grup Ini'}
│📦 Total : ${listGroup.length} List
╰────────────────────────────╯

Berikut beberapa list yang tersedia saat ini:
`.trimStart()

  const keys = listGroup.map(i => String(i.key).toUpperCase()).sort((a, b) => a.localeCompare(b))

  for (let key of keys) {
    teks += `\n  ▢ ${key}`
  }

  if (keys.length > 0) {
    teks += `\n\n💡 Untuk melihat detail produk, silakan kirim nama produk di atas.`
    teks += `\nContoh: *${keys[0]}*`
  }

  await fenrys.sendMessage(
    m.chat,
    { text: teks, mentions: [m.sender] },
    { quoted: m }
  )
}

handler.help = ['list']
handler.tags = ['store']
handler.command = /^(list)$/i
handler.group = true
handler.admin = false

export default handler