import fs from 'fs'
import path from 'path'

const DB_PATH = path.resolve('./database/antilink.json')

function ensureDB() {
if (!fs.existsSync(DB_PATH)) {
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
fs.writeFileSync(DB_PATH, JSON.stringify([]))
}
}
function readDB() {
ensureDB()
try { return JSON.parse(fs.readFileSync(DB_PATH)) } catch { return [] }
}
function writeDB(arr) { ensureDB(); fs.writeFileSync(DB_PATH, JSON.stringify(arr, null, 2)) }

const antilinkCmd = async function (m, { fenrys, args, text }) {
ensureDB()
const on = /^(on|enable|1)$/i.test(text)
const off = /^(off|disable|0)$/i.test(text)
if (!on && !off) {
return fenrys.sendMessage(m.chat, { text: 'Gunakan: antilink on atau antilink off' }, { quoted: m })
}
let list = readDB()
if (on) {
if (!list.includes(m.chat)) list.push(m.chat)
writeDB(list)
return fenrys.sendMessage(m.chat, { text: '✅ Antilink diaktifkan di grup ini.' }, { quoted: m })
} else {
if (list.includes(m.chat)) list = list.filter(x => x !== m.chat)
writeDB(list)
return fenrys.sendMessage(m.chat, { text: '❎ Antilink dimatikan di grup ini.' }, { quoted: m })
}
}

antilinkCmd.command = 'antilink'
antilinkCmd.group = true
antilinkCmd.admin = true
antilinkCmd.botAdmin = true

export default antilinkCmd