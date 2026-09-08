/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — PLUGINS MANAGER
   SUPPORT SAVE, EDIT, DELETE, GET PLUGINS & LIST PLUGINS
   Creator: Juna | 2025
============================================================ */
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

const baseDir = './plugins'

const parseName = (name = '') => {
  const parts = name.split('-')
  const folder = parts.length > 1 ? parts[0] : ''
  const filename = parts.length > 1 ? parts.slice(1).join('-') : parts[0]
  const folderPath = folder ? path.join(baseDir, folder) : baseDir
  const filePath = path.join(folderPath, `${filename}.js`)
  return { folder, filename, folderPath, filePath }
}

const handler = async (m, { command, args }) => {
  const subcmd = (command || '').toLowerCase()
  const input = args.join(' ').trim()
  
  //============= SAVE PLUGINS =============//

  if (subcmd === 'sp') {
    if (!input) return m.reply('❌ Masukkan nama plugin! (contoh: sp group-kick)')
    if (!m.quoted) return m.reply('⚠️ Balas pesan yang berisi kode plugin baru.')

    const { folder, filename, folderPath, filePath } = parseName(input)
    const content = m.quoted.text?.trim()
    if (!content) return m.reply('❌ Pesan yang kamu balas tidak berisi kode.')

    fs.mkdirSync(folderPath, { recursive: true })
    fs.writeFileSync(filePath, content, 'utf8')
    m.reply(`✅ Plugin *${filename}.js* berhasil disimpan!\n📂 Folder: ${folder || '(root)'}\n📄 Path: ${filePath}`)
    console.log(chalk.greenBright(`[PLUGIN SAVED] ${filePath}`))
    return
  }
  
  //============= DELETE PLUGINS =============//

  if (subcmd === 'df') {
    if (!input) return m.reply('❌ Masukkan nama plugin yang ingin dihapus!')
    const { filePath } = parseName(input)
    if (!fs.existsSync(filePath)) return m.reply('⚠️ File tidak ditemukan!')
    fs.unlinkSync(filePath)
    m.reply(`🗑️ Plugin berhasil dihapus!\n📄 Path: ${filePath}`)
    console.log(chalk.redBright(`[PLUGIN DELETED] ${filePath}`))
    return
  }
  
  //============= EDIT PLUGINS =============//

  if (subcmd === 'ep') {
    if (!input) return m.reply('❌ Masukkan nama plugin yang ingin diedit!')
    if (!m.quoted) return m.reply('⚠️ Balas pesan baru berisi kode untuk mengganti isi plugin.')

    const { filePath } = parseName(input)
    if (!fs.existsSync(filePath)) return m.reply('⚠️ File tidak ditemukan!')
    const content = m.quoted.text?.trim()
    fs.writeFileSync(filePath, content, 'utf8')
    m.reply(`✏️ Plugin berhasil diedit!\n📄 Path: ${filePath}`)
    console.log(chalk.yellowBright(`[PLUGIN EDITED] ${filePath}`))
    return
  }
  
  //============= LIST PLUGINS =============//

  if (subcmd === 'lp') {
    const walk = (dir) => {
      let results = []
      const list = fs.readdirSync(dir)
      for (const file of list) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat && stat.isDirectory()) results = results.concat(walk(fullPath))
        else if (file.endsWith('.js')) results.push(fullPath.replace(baseDir + '/', ''))
      }
      return results
    }
    const plugins = walk(baseDir)
    if (!plugins.length) return m.reply('📭 Tidak ada plugin ditemukan.')
    const listText = plugins.map((p, i) => `${i + 1}. ${p}`).join('\n')
    m.reply(`📂 *Daftar Plugin (${plugins.length})*\n\n${listText}`)
    return
  }
  
  //============= GET PLUGINS =============//

  if (subcmd === 'gp') {
    if (!input) return m.reply('❌ Masukkan nama plugin yang ingin ditampilkan!')
    const { filePath } = parseName(input)
    if (!fs.existsSync(filePath)) return m.reply('⚠️ Plugin tidak ditemukan!')
    const content = fs.readFileSync(filePath, 'utf8')
    m.reply(`//📄 *Isi Plugin ${input}.js:*\n\n${content}`)
    return
  }

  return m.reply(
`🧩 *Plugin Manager Commands*
• sp <nama> (balas kode) → Simpan plugin
• df <nama> → Hapus plugin
• ep <nama> (balas kode) → Edit plugin
• gp <nama> → Lihat isi plugin
• lp → Lihat semua plugin

💡 Contoh:
- sp group-kick
- df group-kick
- ep group-kick
- gp group-kick
- lp`
  )
}

handler.tags = ['owner']
handler.help = ['sp <save plugins>', 'df <delete plugins>', 'ep <edit / replace plugins>', 'lp <list plugins>', 'gp <get plugins>']
handler.command = /^(sp|df|ep|lp|gp)$/i
handler.owner = true

export default handler
