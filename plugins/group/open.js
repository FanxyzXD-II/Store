let handler = async (m, { fenrys, text, participants }) => {
  await fenrys.groupSettingUpdate(m.chat, 'not_announcement')
  m.reply('✅ Sukses mengizinkan semua peserta dapat mengirim pesan di grup ini!')
}

handler.help = ['open']
handler.tags = ['group']
handler.command = /^(open)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true 

export default handler