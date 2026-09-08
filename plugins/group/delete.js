let handler = function (m, {fenrys}) {
 let key = {}
 try {
 	key.remoteJid = m.quoted ? m.quoted.fakeObj.key.remoteJid : m.key.remoteJid
	key.fromMe = m.quoted ? m.quoted.fakeObj.key.fromMe : m.key.fromMe
	key.id = m.quoted ? m.quoted.fakeObj.key.id : m.key.id
 	key.participant = m.quoted ? m.quoted.fakeObj.participant : m.key.participant
 } catch (e) {
 	console.error(e)
 }
 fenrys.sendMessage(m.chat, { delete: key })
}
handler.help = ['delete']
handler.tags = ['group']
handler.command = /^(del|d?)$/i
handler.limit = false
handler.admin = true

export default handler