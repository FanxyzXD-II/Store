/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — TOURL SUPPORT ALL
   UNTUK BEBERAPA UPLOADER ADA YANG ERROR DAN BELUM KU FIX
   Creator: Juna | 2025
============================================================ */

import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import {
  catbox,
  uguu,
  quax,
  yupra,
  botcahx,
  zenzxz,
  top4top,
  postimages,
  webp2mp4File
} from "../../lib/uploader.js";

let handler = async (m, { fenrys, command, text }) => {
  try {
 
    let qmsg = m.quoted ? m.quoted : m;
    let mime = (qmsg.msg || qmsg).mimetype || "";

    if (!mime || !/^(image|video|audio|application)\//.test(mime)) {
      return m.reply(
        `❌ Kirim atau reply media (foto / video / audio / dokumen) dengan caption *${command}*`) 
    }

    const buffer = await qmsg.download();
    const fileInfo = await fileTypeFromBuffer(buffer);
    const ext = fileInfo ? fileInfo.ext : "bin";
    const tmpDir = path.join(process.cwd(), "tmp");

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const filename = path.join(tmpDir, `${Date.now()}.${ext}`);
    fs.writeFileSync(filename, buffer);

    let catbx = await catbox(buffer, filename).catch(() => null);
    let uguuUrl = await uguu(buffer, `file.${ext}`).catch(() => null);
    let quaxUrl = await quax(filename).catch(() => null);
    let yupraUrl = await yupra(buffer, `file.${ext}`).catch(() => null);
    let botcahxUrl = await botcahx(buffer, ext).catch(() => null);
    let zenzxzUrl = await zenzxz(filename).catch(() => null);

    fs.unlinkSync(filename);

    const caption = `
╭─「 🌟 *${global.botName} Multi Uploader* 」
│
│ 📁 Size : ${(buffer.length / 1024).toFixed(2)} KB
│
│ 📊 Hasil Upload :
│ 🐱 CatBox : ${catbx ? "✅" : "❌"}
│ 🦊 Uguu : ${uguuUrl ? "✅" : "❌"}
│ 🦆 Qu.ax : ${quaxUrl ? "✅" : "❌"}
│ 🆕 Yupra : ${yupraUrl ? "✅" : "❌"}
│ 🤖 Botcahx : ${botcahxUrl ? "✅" : "❌"}
│ 🔥 Zenzxz : ${zenzxzUrl ? "✅" : "❌"}
│
╰─「 📍 Link Tersedia Dibawah 」

${catbx ? `🐱 ${catbx}` : ""}
${uguuUrl ? `🦊 ${uguuUrl}` : ""}
${quaxUrl ? `🦆 ${quaxUrl}` : ""}
${yupraUrl ? `🆕 ${yupraUrl}` : ""}
${botcahxUrl ? `🤖 ${botcahxUrl}` : ""}
${zenzxzUrl ? `🔥 ${zenzxzUrl}` : ""}
`.trim();

    await fenrys.sendMessage(
      m.chat,
      {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: "",
            body: "Upload File Ke Berbagai Platform",
            thumbnailUrl: uguuUrl,
            sourceUrl: "",
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: m }
    );
  } catch (err) {
    m.reply(err);
  }
};

handler.help = ["tourl"];
handler.tags = ["tools"];
handler.command = /^(uploader|tourl)$/i;

export default handler;
