let handler = async (m, { fenrys }) => {
  await fenrys.groupSettingUpdate(m.chat, 'announcement')
  m.reply('🔒 Grup berhasil dikunci! Sekarang hanya admin yang dapat mengirim pesan.')
}

handler.help = ['close']
handler.tags = ['group']
handler.command = /^(close)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true 

export default handler