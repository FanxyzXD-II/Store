/* ============================================================
   FENRYS HANDLER — LOG & MESSAGE UTILITIES
   Creator: Juna | 2025
============================================================ */

import chalk from 'chalk';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import PhoneNumber from 'awesome-phonenumber';
import { fileTypeFromBuffer } from 'file-type';
import {
    generateProfilePicture,
    removeEmojis,
    smsg,
    sleep,
    runtime,
    fetchJson,
    getBuffer,
    parseMention,
    getRandom,
    getGroupAdmins
} from './lib/myfunc.js';
import {
    downloadContentFromMessage,
    generateWAMessageFromContent,
    generateWAMessageContent,
    proto
} from '@whiskeysockets/baileys';
import {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    writeExif
} from './lib/exif.js';
import router from './main.js';
import { listAutoResponder } from './lib/list-responder.js';
import { startSewaWatcher } from './lib/sewa.js';

moment.tz.setDefault('Asia/Jakarta');

export default async function handle(conn, rawMsg, store) {
    rawMsg.message = rawMsg.message?.ephemeralMessage?.message || rawMsg.message;
    const msg = conn.serializeM(rawMsg);

    if (msg.key?.fromMe) return;

    if (!msg.message?.protocolMessage && global.autoread) {
        const key = {
            remoteJid: msg.chat,
            id: msg.key.id,
            participant: msg.isGroup ? msg.key.participant : undefined
        };
        await conn.readMessages([key]);
    }

    const body = msg.mtype === 'conversation'
        ? msg.message.conversation
        : msg.mtype === 'imageMessage'
        ? msg.message.imageMessage?.caption || '[IMAGE]'
        : msg.mtype === 'videoMessage'
        ? msg.message.videoMessage?.caption || '[VIDEO]'
        : msg.mtype === 'stickerMessage'
        ? '[STICKER]'
        : msg.mtype === 'audioMessage'
        ? '[AUDIO]'
        : msg.mtype === 'documentMessage'
        ? '[DOCUMENT: ' + (msg.message?.documentMessage?.fileName || 'file') + ']'
        : msg.mtype === 'buttonsResponseMessage'
        ? msg.message.buttonsResponseMessage?.selectedButtonId
        : msg.mtype === 'listResponseMessage'
        ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId
        : msg.mtype === 'templateButtonReplyMessage'
        ? msg.message.templateButtonReplyMessage?.selectedId
        : msg.mtype === 'extendedTextMessage'
        ? msg.message.extendedTextMessage?.text
        : msg.mtype === 'interactiveResponseMessage'
        ? msg.message.buttonsResponseMessage?.selectedButtonId ||
          msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
          msg.text
        : msg.text || '';

    const pushName = msg.pushName;
    const sender = msg.sender;
    const isGroup = msg.isGroup;
    const sourceName = isGroup ? await conn.getName(msg.chat) : 'Private Chat';
    const dateStr = moment().format('dddd, D MMM YYYY');
    const timeStr = moment().format('HH:mm:ss');

    console.log(chalk.cyan('\n New Message '));
    console.log(chalk.magenta('  ' + global.botName + ' | ACTIVE'));
    console.log(chalk.white('• Source     : ') + sourceName);
    console.log(chalk.white('• Sender     : ') + chalk.green(pushName));
    console.log(chalk.white('• Username   : ') + chalk.blue(sender));
    console.log(chalk.white('• Message    : ') + chalk.yellow(body));
    console.log(chalk.white('• Time       : ') + chalk.red(dateStr) + '  :  ' + chalk.white(timeStr));
    console.log(chalk.cyan('\n'));

    const beforeHandled = await runBeforeHooks(conn, msg);
    if (beforeHandled) return;

    const listHandled = await listAutoResponder(conn, msg);
    if (!listHandled) await router(conn, msg);
}

export function setup(conn, store) {
    startSewaWatcher(conn, { intervalMs: 5000 });

    conn.serializeM = (m) => smsg(conn, m, store);

    conn.getName = (jid, withoutContact = false) => {
        let id = conn.decodeJid(jid);
        withoutContact = conn.withoutContact || withoutContact;
        let v;

        if (id.endsWith('@g.us')) {
            return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = (await conn.groupMetadata(id).catch(() => {})) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@g.us', '')).getNumber('international'));
            });
        } else {
            v = id === '0@s.whatsapp.net'
                ? { id, name: 'WhatsApp' }
                : id === conn.decodeJid(conn.user['id'])
                ? conn.user
                : store.contacts[id] || {};
        }

        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
    };

    conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quotedMsg = message.msg ? message.msg : message;
        let mimeType = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mimeType.split('/')[0];

        const stream = await downloadContentFromMessage(quotedMsg, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let type = await fileTypeFromBuffer(buffer);
        let trueFileName = attachExtension ? './tmp/' + filename + '.' + type.ext : './tmp/' + filename;

        await fs.promises.writeFile(trueFileName, buffer);
        return trueFileName;
    };

    conn.downloadMediaMessage = async (message) => {
        let mimeType = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mimeType.split('/')[0];

        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    conn.sendText = (jid, text, quoted = '', options) =>
        conn.sendMessage(jid, { text: text, ...options }, { quoted: quoted, ...options });

    conn.sendteks = async (jid, text, quoted, options = {}) =>
        conn.sendMessage(jid, {
            text: text,
            contextInfo: {
                mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map((v) => v[1] + '@s.whatsapp.net')
            },
            ...options
        }, { quoted: quoted });

    conn.sendTextWithMentions = (jid, text, quoted = '', options = {}) =>
        conn.sendMessage(jid, {
            text: text,
            mentions: conn.parseMention?.(text) ?? [],
            ...options
        }, { quoted: quoted });

    conn.sendImage = async (jid, path, caption = '', quoted = '', options) => {
        let buffer = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
            ? Buffer.from(path.split(',')[1], 'base64')
            : /^https?:\/\//.test(path)
            ? await getBuffer(path)
            : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);

        return await conn.sendMessage(jid, { image: buffer, caption: caption, jpegThumbnail: '', ...options }, { quoted: quoted });
    };

    conn.sendVideo = async (jid, path, caption = '', quoted = '', gifPlayback = false, options) => {
        let buffer = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
            ? Buffer.from(path.split(',')[1], 'base64')
            : /^https?:\/\//.test(path)
            ? await getBuffer(path)
            : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);

        return await conn.sendMessage(jid, { video: buffer, caption: caption, gifPlayback: gifPlayback, jpegThumbnail: '', ...options }, { quoted: quoted });
    };

    conn.sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
        let buffer = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
            ? Buffer.from(path.split(',')[1], 'base64')
            : /^https?:\/\//.test(path)
            ? await getBuffer(path)
            : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);

        return await conn.sendMessage(jid, { audio: buffer, ptt: ptt, ...options }, { quoted: quoted });
    };

    conn.getFile = async (PATH, save) => {
        let res;
        let filename;
        let data = Buffer.isBuffer(PATH)
            ? PATH
            : /^data:.*?\/.*?;base64,/i.test(PATH)
            ? Buffer.from(PATH.split(',')[1], 'base64')
            : /^https?:\/\//.test(PATH)
            ? ((res = await fetch(PATH)), Buffer.from(await res.arrayBuffer()))
            : fs.existsSync(PATH)
            ? ((filename = PATH), fs.readFileSync(PATH))
            : typeof PATH === 'string'
            ? Buffer.from(PATH)
            : Buffer.alloc(0);

        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');

        let type = (await fileTypeFromBuffer(data)) || { mime: 'application/octet-stream', ext: 'bin' };

        if (data && save && !filename) {
            filename = path.join('./tmp/' + Date.now() + '.' + type.ext);
            await fs.promises.writeFile(filename, data);
        }

        return { res, filename, ...type, data };
    };

    conn.sendFile = async (jid, path, filename = '', caption = '', quoted = '', ptt = false, options = {}) => {
        let fileData = await conn.getFile(path, true);
        let { res, data, filename: tempPath } = fileData;

        if ((res && res.status !== 200) || data.length <= 65536) {
            try {
                throw { json: JSON.parse(data.toString()) };
            } catch (err) {
                if (err.json) throw err.json;
            }
        }

        let opt = { filename: filename };
        if (quoted) opt.quoted = quoted;
        if (!fileData) options.asDocument = true;

        let mtype = '';
        let mimetype = fileData.mime;
        let convertedAudio;

        if (/webp/.test(fileData.mime) || (/image/.test(fileData.mime) && options.asSticker)) {
            mtype = 'sticker';
        } else if (/image/.test(fileData.mime) || (/webp/.test(fileData.mime) && options.asImage)) {
            mtype = 'image';
        } else if (/video/.test(fileData.mime)) {
            mtype = 'video';
        } else if (/audio/.test(fileData.mime)) {
            convertedAudio = await toAudio(data, fileData.ext);
            data = convertedAudio.data;
            tempPath = convertedAudio.filename;
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else {
            mtype = 'document';
        }

        if (options.asDocument) mtype = 'document';

        delete options.asSticker;
        delete options.asLocation;
        delete options.asVideo;
        delete options.asDocument;
        delete options.asImage;

        let msgPayload = {
            ...options,
            caption: caption,
            ptt: ptt,
            [mtype]: { url: tempPath },
            mimetype: mimetype,
            fileName: filename || tempPath.split('/').pop()
        };

        let sentMsg;
        try {
            sentMsg = await conn.sendMessage(jid, msgPayload, { ...opt, ...options });
        } catch {
            sentMsg = null;
        } finally {
            if (!sentMsg) {
                sentMsg = await conn.sendMessage(jid, { ...msgPayload, [mtype]: data }, { ...opt, ...options });
            }
            data = null;
            return sentMsg;
        }
    };

    conn.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buffer = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
            ? Buffer.from(path.split(',')[1], 'base64')
            : /^https?:\/\//.test(path)
            ? await fetchBuffer(path)
            : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);

        let sticker;
        if (options && (options.packname || options.author)) {
            sticker = await writeExifVid(buffer, options);
        } else {
            sticker = await videoToWebp(buffer);
        }

        await conn.sendMessage(jid, { sticker: { url: sticker }, ...options }, { quoted: quoted });
        return sticker;
    };

    conn.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buffer = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
            ? Buffer.from(path.split(',')[1], 'base64')
            : /^https?:\/\//.test(path)
            ? await getBuffer(path)
            : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);

        let sticker;
        if (options && (options.packname || options.author)) {
            sticker = await writeExifImg(buffer, options);
        } else {
            sticker = await imageToWebp(buffer);
        }

        await conn.sendMessage(jid, { sticker: { url: sticker }, ...options }, { quoted: quoted });
        return sticker;
    };

    conn.sendStickerFromUrl = async (jid, url, quoted, options = {}) => {
        let fileData = await conn.getFile(url, true);
        let { filename, size, ext, mime, data } = fileData;
        let stickerPath = await writeExif(
            { mimetype: mime, data: data },
            {
                packname: options.packname ? options.packname : global.packname,
                author: options.author ? options.author : '',
                categories: options.categories ? options.categories : []
            }
        );

        await fs.promises.unlink(filename);
        await conn.sendMessage(jid, { sticker: { url: stickerPath } }, { quoted: quoted });
        return fs.promises.unlink(stickerPath);
    };

    conn.sendButtonMsg = async (jid, options = {}, quoted = {}) => {
        const {
            text,
            caption,
            footer = '',
            headerType = 1,
            ai,
            contextInfo = {},
            buttons = [],
            mentions = [],
            ...extra
        } = options;

        const msgContent = await generateWAMessageFromContent(
            jid,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        buttonsMessage: {
                            ...(extra && typeof extra === 'object' && Object.keys(extra).length > 0
                                ? await generateWAMessageContent(extra, { upload: conn.waUploadToServer })
                                : {}),
                            contentText: text || caption || '',
                            footerText: footer,
                            buttons: buttons,
                            headerType: extra && Object.keys(extra).length > 0
                                ? Math.max(
                                      ...Object.keys(extra).map((type) => ({ document: 3, image: 4, video: 5, location: 6 }[type] || headerType))
                                  )
                                : headerType,
                            contextInfo: {
                                ...contextInfo,
                                ...quoted.contextInfo,
                                mentionedJid: quoted.mentionedJid || mentions,
                                ...(quoted.quoted
                                    ? {
                                          stanzaId: quoted.quoted.key.id,
                                          remoteJid: quoted.quoted.key.remoteJid,
                                          participant: quoted.quoted.key.participant || quoted.quoted.key.remoteJid,
                                          fromMe: quoted.quoted.key.fromMe,
                                          quotedMessage: quoted.quoted.message
                                      }
                                    : {})
                            }
                        }
                    }
                }
            },
            {}
        );

        return await conn.relayMessage(
            msgContent.key.remoteJid,
            msgContent.message,
            {
                messageId: msgContent.key.id,
                additionalNodes: [
                    {
                        tag: 'biz',
                        attrs: {},
                        content: [
                            {
                                tag: 'interactive',
                                attrs: { type: 'native_flow', v: '1' },
                                content: [{ tag: 'native_flow', attrs: { name: 'quick_reply' } }]
                            }
                        ]
                    },
                    ...(ai ? [{ attrs: { biz_bot: '1' }, tag: 'bot' }] : [])
                ]
            }
        ), msgContent;
    };

    conn.sendList = async (jid, title, text, buttons, options = {}) => {
        let msg = generateWAMessageFromContent(
            jid,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            ...options,
                            body: proto.Message.InteractiveMessage.Body.create({ text: title }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: text || global.footer }),
                            contextInfo: {
                                forwardingScore: 999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterName: global.botName,
                                    newsletterJid: global.idch
                                }
                            },
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: 'single_select',
                                        buttonParamsJson: JSON.stringify(buttons)
                                    }
                                ]
                            })
                        })
                    }
                }
            },
            {}
        );

        return await conn.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
    };
}

// Watch self file for updates
const file = import.meta.url;
fs.watchFile(new URL(file), () => {
    fs.unwatchFile(new URL(file));
    console.log(chalk.redBright(' Update ' + file));
    process.exit(0);
});

async function runBeforeHooks(conn, msg) {
    let isAdmin = false;
    let isBotAdmin = false;

    if (msg.isGroup) {
        try {
            const groupMetadata = await conn.groupMetadata(msg.chat);
            const adminJids = groupMetadata.participants
                .filter((p) => p.admin)
                .map((p) => p.id || p.jid);

            const botId = conn.user?.id || '';
            const botJid = botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId;

            isAdmin = adminJids.includes(msg.sender);
            isBotAdmin = adminJids.includes(botJid);
        } catch {}
    }

    for (const [pluginName, plugin] of Object.entries(global.plugins || {})) {
        const hook = plugin && typeof plugin.before === 'function' ? plugin.before : null;
        if (!hook) continue;

        try {
            const handled = await hook(conn, msg, {
                fenrys: conn,
                isAdmin: isAdmin,
                isBotAdmin: isBotAdmin
            });
            if (handled) return true;
        } catch (err) {
            console.error('[before]', pluginName, err);
        }
    }

    return false;
}
