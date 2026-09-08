/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — SMSG FIX JID SILAHKAN KLO MAU PAKE
   Creator: Juna | 2025
============================================================ */

import {
proto,
areJidsSameUser,
generateWAMessage,
getContentType
} from '@whiskeysockets/baileys'
import axios from 'axios'
import fetch from 'node-fetch'

function isPn(id = '') {
return typeof id === 'string' && /@s\.whatsapp\.net$/i.test(id)
}
function pickPnStrict(...candidates) {
for (const v of candidates) if (isPn(v)) return v
return ''
}
function mapMentionsToPn(list = []) {
const arr = Array.isArray(list) ? list : []
return arr.filter(isPn)
}

export function smsg(conn, m, store) {
if (!m) return m
let M = proto.WebMessageInfo

if (m.key) {
m.id = m.key.id
m.isBaileys = m.id?.startsWith?.('BAE5') && m.id.length === 16
m.chat = m.key.remoteJid
m.fromMe = m.key.fromMe
m.isGroup = m.chat.endsWith('@g.us')

if (m.isGroup) {
m.sender = pickPnStrict(
m.key?.participant,
m.key?.participantAlt
) || ''
m.participant = pickPnStrict(m.key?.participant, m.key?.participantAlt) || ''
} else {
m.sender = pickPnStrict(
m.key?.remoteJid,
m.key?.remoteJidAlt
) || ''
}
}

if (m.message) {
m.mtype = getContentType(m.message)
m.msg =
m.mtype == 'viewOnceMessage'
? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
: m.message[m.mtype]
m.body =
m.message.conversation ||
m.msg.caption ||
m.msg.text ||
(m.mtype == 'listResponseMessage' && m.msg.singleSelectReply?.selectedRowId) ||
(m.mtype == 'buttonsResponseMessage' && m.msg.selectedButtonId) ||
(m.mtype == 'viewOnceMessage' && m.msg.caption) ||
''

let quoted = (m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null)
m.mentionedJid = m.msg.contextInfo ? mapMentionsToPn(m.msg.contextInfo.mentionedJid) : []

if (m.quoted) {
let type = Object.keys(m.quoted)[0]
m.quoted = m.quoted[type]
if (['productMessage'].includes(type)) {
type = Object.keys(m.quoted)[0]
m.quoted = m.quoted[type]
}
if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }

m.quoted.mtype = type
m.quoted.id = m.msg.contextInfo.stanzaId
m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
m.quoted.isBaileys = m.quoted.id
? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16
: false

m.quoted.sender = pickPnStrict(
m.msg.contextInfo?.participant,
m.msg.contextInfo?.participantAlt
) || ''

m.quoted.fromMe = m.quoted.sender && conn?.user?.id
? areJidsSameUser(m.quoted.sender, conn.user.id)
: false

m.quoted.text =
m.quoted.text ||
m.quoted.caption ||
m.quoted.conversation ||
m.quoted.contentText ||
m.quoted.selectedDisplayText ||
m.quoted.title ||
''
m.quoted.mentionedJid = m.msg.contextInfo
? mapMentionsToPn(m.msg.contextInfo.mentionedJid)
: []

m.getQuotedObj = m.getQuotedMessage = async () => {
if (!m.quoted.id) return false
let q = await store.loadMessage(m.chat, m.quoted.id, conn)
return smsg(conn, q, store)
}

let vM = (m.quoted.fakeObj = proto.WebMessageInfo.create({
key: {
remoteJid: m.quoted.chat,
fromMe: m.quoted.fromMe,
id: m.quoted.id
},
message: quoted,
...(m.isGroup ? { participant: m.quoted.sender } : {})
}))

m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key })
m.quoted.copyNForward = (jid, forceForward = false, options = {}) =>
conn.copyNForward(jid, vM, forceForward, options)
m.quoted.download = () => conn.downloadMediaMessage(m.quoted)
}
}

if (m.msg?.url) m.download = () => conn.downloadMediaMessage(m.msg)

m.text =
m.msg?.text ||
m.msg?.caption ||
m.message?.conversation ||
m.msg?.contentText ||
m.msg?.selectedDisplayText ||
m.msg?.title ||
''

m.reply = (text, chatId = m.chat, options = {}) =>
Buffer.isBuffer(text)
? conn.sendMedia(chatId, text, 'file', '', m, { ...options })
: conn.sendText(chatId, text, m, { ...options })

m.copy = () => smsg(conn, proto.WebMessageInfo.create(proto.WebMessageInfo.toObject(m)))
m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
conn.copyNForward(jid, m, forceForward, options)

if (!m.sender && m.fromMe && conn?.user?.id && isPn(conn.user.id)) {
m.sender = conn.user.id
}

return m
}

export async function generateProfilePicture(buffer) {
return { img: buffer }
}

export const parseMention = (text = "") => {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
(v) => v[1] + "@s.whatsapp.net",
)
}

export const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`

export async function getBuffer(url, options) {
try {
const res = await axios({
method: 'get',
url,
headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 },
...options,
responseType: 'arraybuffer',
})
return res.data
} catch (e) {
console.log(`Error : ${e}`)
}
}

export const fetchJson = (url, options) =>
fetch(url, options).then((response) => response.json())

export const fetchText = (url, options) =>
fetch(url, options).then((response) => response.text())

export function getGroupAdmins(participants = []) {
const admins = []
for (const i of participants) {
if (i?.admin === 'superadmin' || i?.admin === 'admin') {
const jid = typeof i.phoneNumber === 'string' ? i.phoneNumber : ''
if (/@s\.whatsapp\.net$/i.test(jid)) admins.push(jid)
}
}
return admins
}

export async function getGroupPerson(sock, chatId, groupMeta, opt = {}) {
const meta = groupMeta || (await sock.groupMetadata(chatId).catch(() => null));
let rawId = opt.userId || (opt.m?.quoted?.sender || "");
if (!rawId && meta?.owner) rawId = meta.owner;
if (!rawId) {
const superOwner = (meta?.participants || []).find(
(p) => p?.admin === "superadmin"
);
rawId = superOwner ? superOwner.id : "";
}
if (!rawId)
return { number: "Tidak diketahui", mentionId: null, pnJid: "", rawId: "" };
const mentionId = await resolveIdForGroup(sock, chatId, rawId);
const pnJid = toPn(rawId) || toPn(mentionId) || mentionId;
const number = String(pnJid).includes("@") ? pnJid.split("@")[0] : pnJid;
return { number, mentionId, pnJid, rawId };
}

export function normalizeIdForGroup(addressingMode, id) {
return addressingMode === "lid" ? toLid(id) : toPn(id);
}

export async function resolveIdForGroup(sock, groupJid, anyId) {
const meta = await sock.groupMetadata(groupJid);
const mode = meta?.addressingMode || "pn";
return normalizeIdForGroup(mode, anyId);
}

export function runtime(seconds) {
seconds = Number(seconds)
var d = Math.floor(seconds / (3600 * 24))
var h = Math.floor((seconds % (3600 * 24)) / 3600)
var m = Math.floor((seconds % 3600) / 60)
var s = Math.floor(seconds % 60)
var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
return dDisplay + hDisplay + mDisplay + sDisplay
}

export function pickRandom(list) {
return list[Math.floor(list.length * Math.random())]
}

export const clockString = (ms) => {
let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

export const removeEmojis = (string) => {
var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g
return string.replace(regex, '')
}

export const calculate_age = (dob) => {
var diff_ms = Date.now() - dob.getTime()
var age_dt = new Date(diff_ms)
return Math.abs(age_dt.getUTCFullYear() - 1970)
}

export const sleep = async (ms) => {
return new Promise((resolve) => setTimeout(resolve, ms))
}

export const url = (u) => {
return u.match(
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&//=]*)/gi
)
}

export const makeid = (length) => {
let result = ''
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const charactersLength = characters.length
for (let i = 0; i < length; i++) {
result += characters.charAt(Math.floor(Math.random() * charactersLength))
}
return result
}