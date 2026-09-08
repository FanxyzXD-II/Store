/* ============================================================
   FENRYS — BEFORE: ANTILINK
   Antilink Ini Cuma Hapus Pesan Jika Ingin Kick Member Juga Tambah Sendiri
   fenrys.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
   Creator: Juna 2025
============================================================ */

import fs from 'fs'
import { getGroupAdmins } from '../../lib/myfunc.js'

const LIST = './database/antilink.json'

const readList = () => {
  try {
    if (!fs.existsSync(LIST)) return new Set()
    const arr = JSON.parse(fs.readFileSync(LIST, 'utf8') || '[]')
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

const isInvite = (t = '') => /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i.test(t)
const codeOf   = (t = '') => (t.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,})/i) || [])[1] || null

export default {
  command: [],
  async before(m, { fenrys } = {}) {
    if (!m?.chat?.endsWith?.('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!readList().has(m.chat)) return false
    const text =
      m.text ||
      m?.message?.conversation ||
      m?.message?.extendedTextMessage?.text ||
      m?.message?.imageMessage?.caption ||
      m?.message?.videoMessage?.caption ||
      ''

    if (!isInvite(text)) return false

    const from = m.key.remoteJid
    const sender = m.isGroup
      ? (m.key.participant ? m.key.participant : m.participant)
      : m.key.remoteJid
      
    const groupMetadata = m.isGroup ? await fenrys.groupMetadata(m.chat).catch(() => ({})) : {}
    const participants  = m.isGroup ? (groupMetadata.participants || []) : []
    const groupAdmins = m.isGroup ? getGroupAdmins(participants) : []
    const toBasePn = (jid = '') => {
    if (typeof jid !== 'string') return ''
    const m = jid.match(/(\d{5,})/)
    return m ? `${m[1]}@s.whatsapp.net` : ''
    }
    const senderPn = toBasePn(m.sender)
    const botPn    = toBasePn(fenrys.user?.id || '')
    const isAdmin    = m.isGroup ? groupAdmins.includes(senderPn) : false
    const isBotAdmin = m.isGroup ? groupAdmins.includes(botPn)    : false

    if (isAdmin) return false // m.reply("admin gpp") //hapus false jika ingin tambah pesan

    try {
      const code = codeOf(text)
      const selfCode = await fenrys.groupInviteCode(m.chat).catch(() => null)
      if (selfCode && code === selfCode) return true
    } catch {}

    if (!isBotAdmin) {
      await fenrys.sendMessage(
        m.chat,
        {
          text: `⚠️ *Link grup terdeteksi!*` +
                `\n👤 @${m.sender.split('@')[0]}` +
                `\n❌ Bot bukan admin, tidak bisa hapus chat.`,
          mentions: [m.sender]
        },
        { quoted: m }
      )
      return true
    }

    try { await fenrys.sendMessage(m.chat, { delete: m.key }) } catch {}

    await fenrys.sendMessage(
      m.chat,
      {
        text: `⚠️ *Link grup terdeteksi!*` +
              `\n👤 @${m.sender.split('@')[0]}` +
              `\n🧹 Pesan dihapus.`,
        mentions: [m.sender]
      },
      { quoted: m }
    )

    return true
  },
}
