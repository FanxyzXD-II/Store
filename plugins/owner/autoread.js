let handler = async (m, { fenrys, text, isCreator }) => {
  if (!text) return m.reply('⚙️ Gunakan format: *.autoread on* atau *.autoread off*')

  if (text.toLowerCase() === 'on') {
    global.autoread = true
    m.reply('✅ Fitur *AutoRead* telah diaktifkan!')
  } else if (text.toLowerCase() === 'off') {
    global.autoread = false
    m.reply('❌ Fitur *AutoRead* telah dimatikan!')
  } else {
    m.reply('⚙️ Gunakan format yang benar: *.autoread on* atau *.autoread off*')
  }
}

handler.help = ['autoread on/off']
handler.tags = ['owner']
handler.command = /^autoread$/i
handler.owner = true

export default handler
