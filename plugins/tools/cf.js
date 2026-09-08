const handler = async (m, { fenrys, args, command, usedPrefix }) => {
  if (!args.length) {
    return m.reply(`✨ *Example Usage:* \n🔍 ${usedPrefix}${command} fitur`)
  }

  const plugins = Object.entries(global.plugins).filter(
    ([, v]) => v.help && Array.isArray(v.tags)
  )

  const query = args.join(' ').toLowerCase()
  const filteredPlugins = plugins.filter(([_, v]) =>
    v.help.some(h => h.toLowerCase().includes(query))
  )

  if (filteredPlugins.length === 0) {
    return m.reply(`❌ *Tidak ada fitur yang cocok dengan pencarian:* \n🔍 '${query}'`)
  }

  let message = `🔎 *Hasil Pencarian untuk:* '${query}' \n\n`
  message += filteredPlugins.map(([name, v]) =>
    `✅ *${v.help.join(', ')}*\n📌 *Tags:* ${Array.isArray(v.tags) ? v.tags.join(', ') : 'Tidak ada'}\n📂 *Plugin:* ${name}\n`
  ).join('\n')

  m.reply(message)
}

handler.help = ['carif']
handler.tags = ['tools']
handler.command = ['searchfitur', 'carif']
handler.register = true

export default handler
