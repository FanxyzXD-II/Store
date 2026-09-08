import axios from "axios";
import FormData from "form-data";
import BodyForm from "form-data";
import fs from "fs";
import path from "path";
import * as fileType from "file-type";
import * as cheerio from "cheerio";

// === CatBox ===
export async function catbox(buffer, filename) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, { filename });
  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders()
  });
  return res.data.startsWith("https") ? res.data.trim() : null;
}

// === Uguu ===
export async function uguu(buffer, filename) {
  const form = new FormData();
  form.append("files[]", buffer, filename);
  const res = await axios.post("https://uguu.se/upload.php", form, {
    headers: form.getHeaders()
  });
  return res.data?.files?.[0]?.url || null;
}

// === Qu.ax ===
export async function quax(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const form = new FormData();
  form.append("files[]", fs.createReadStream(filePath), { filename: path.basename(filePath) });
  const res = await axios.post("https://qu.ax/upload.php", form, {
    headers: form.getHeaders()
  });
  return res.data?.files?.[0]?.url || null;
}

// === Yupra ===
export async function yupra(buffer, filename) {
  const form = new FormData()
  form.append('files', buffer, { filename })
  const response = await axios.post('https://cdn.yupra.my.id/upload', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    },
    timeout: 120000
  })
  return response.data
}


// === Botcahx ===
export async function botcahx(buffer, ext) {
  const form = new FormData();
  form.append("file", buffer, `file.${ext}`);
  const res = await axios.post("https://file.botcahx.eu.org/api/upload.php", form, {
    headers: form.getHeaders()
  });
  return res.data?.result?.url || res.data?.url || null;
}

// === Zenzxz ===
export async function zenzxz(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  const res = await axios.post("https://uploader.zenzxz.dpdns.org/api/upload", form, {
    headers: form.getHeaders()
  });
  return res.data?.url || res.data?.result?.url || null;
}

// === Top4Top ===
export async function top4top(buffer) {
  const info = await fileType.fromBuffer(buffer);
  const form = new FormData();
  form.append("file_1_", buffer, { filename: `upload-${Date.now()}.${info.ext}` });
  form.append("submitr", "[ رفع الملفات ]");
  const res = await axios.post("https://top4top.io/index.php", form, {
    headers: form.getHeaders()
  });
  const match = res.data.match(/(https?:\/\/[^\s"']+\.top4top\.io\/[^\s"']+)/i);
  return match ? match[0] : null;
}

// === PostImages ===
export async function postimages(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, { filename });
  const res = await axios.post("https://postimages.org/json/rr", form, {
    headers: form.getHeaders()
  });
  return res.data?.url || null;
}

// === webp2mp4File ===
export async function webp2mp4File(path) {
  return new Promise((resolve, reject) => {
    const form = new BodyForm();
    form.append("new-image-url", "");
    form.append("new-image", fs.createReadStream(path));
    axios({
      method: "post",
      url: "https://s6.ezgif.com/webp-to-mp4",
      data: form,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${form._boundary}`,
      },
    })
      .then(({ data }) => {
        const bodyFormThen = new BodyForm();
        const $ = cheerio.load(data);
        const file = $('input[name="file"]').attr("value");
        bodyFormThen.append("file", file);
        bodyFormThen.append("convert", "Convert WebP to MP4!");
        axios({
          method: "post",
          url: "https://ezgif.com/webp-to-mp4/" + file,
          data: bodyFormThen,
          headers: {
            "Content-Type": `multipart/form-data; boundary=${bodyFormThen._boundary}`,
          },
        })
          .then(({ data }) => {
            const $ = cheerio.load(data);
            const result =
              "https:" +
              $("div#output > p.outfile > video > source").attr("src");
            resolve({
              status: true,
              message: "Xeorz",
              result: result,
            });
          })
          .catch(reject);
      })
      .catch(reject);
  });
}
