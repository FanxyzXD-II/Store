let handler = async (m, { text }) => {
  if (!text) return m.reply('⚙️ Gunakan format: *.gconly on* atau *.gconly off*')

  const opt = text.toLowerCase()
  if (opt === 'on') {
    global.gcOnly = true
    m.reply('✅ *Gc Only* telah diaktifkan!\nBot sekarang hanya merespon pesan di grup (kecuali Owner).')
  } else if (opt === 'off') {
    global.gcOnly = false
    m.reply('❌ *Gc Only* telah dimatikan!\nBot kembali merespon pesan di chat pribadi.')
  } else {
    m.reply('⚙️ Gunakan format yang benar: *.gconly on* atau *.gconly off*')
  }
}

handler.help = ['gconly on/off']
handler.tags = ['owner']
handler.command = /^gconly$/i
handler.owner = true

export default handler
