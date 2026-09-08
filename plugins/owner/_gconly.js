/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — GRUP ONLY
   CUMA RESPON CHAT DARI OWNER
   Creator: Juna | 2025
============================================================ */

export default {
  command: [],
  async before(m, { fenrys } = {}) {
    if (!global.gcOnly) return false
    if (m?.chat === 'status@broadcast') return false
    if (m?.key?.fromMe) return false
    const isGroup = m?.chat?.endsWith?.('@g.us')
    if (isGroup) return false
    let misal
    if (m.isGroup) {
      if (m.key?.participant && /@s\.whatsapp\.net$/i.test(m.key.participant)) misal = m.key.participant
      else if (m.key?.participantAlt && /@s\.whatsapp\.net$/i.test(m.key.participantAlt)) misal = m.key.participantAlt
      else misal = m.key.participant || m.key.participantAlt
    } else {
      if (m.key?.remoteJid && /@s\.whatsapp\.net$/i.test(m.key.remoteJid)) misal = m.key.remoteJid
      else if (m.key?.remoteJidAlt && /@s\.whatsapp\.net$/i.test(m.key.remoteJidAlt)) misal = m.key.remoteJidAlt
      else misal = m.key.remoteJid || m.key.remoteJidAlt
    }
    const botNumber = await fenrys.decodeJid(fenrys.user.id)
    const isCreator = [botNumber, ...global.ownerNumber]
      .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
      .includes(misal)
    return isCreator ? false : true
  },
}
