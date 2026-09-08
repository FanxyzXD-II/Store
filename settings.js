import fs from 'fs'
import chalk from 'chalk'

/* ============== BOT INFO ============== */
global.mode = true // true = public, false = self
global.autoread = true
global.gcOnly = false
global.pairing = 'Moh Firman'

global.ownerNumber = ['6283821313334'] // Ganti dengan nomor owner kamu
global.ownerName = 'Firman'
global.botName = 'FiRabbit Bot Store'

/* ============== MESSAGE ============== */
global.mess = {
  success: '✅ Success!',
  admin: '[ !! ] *Access Denied*\nFeature For Admins Only',
  botAdmin: '[ !! ] *Access Denied*\nBot Must Be Admins',
  creator: '[ !! ] *Access Denied*\nFeature For Owner Only',
  group: '[ !! ] *Access Denied*\nFeature For Group Only',
  private: '[ !! ] *Access Denied*\nFeature For Private Only',
  wait: '⏳ In Process Please Wait',
  error: '[ !! ] *Error Please Report Owner*'
}

/* ============== AUTO RELOAD ============== */
const file = new URL(import.meta.url).pathname
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright(`🔄 settings.js updated`))
  import(`${import.meta.url}?update=${Date.now()}`)
})
