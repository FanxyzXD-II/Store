/* ============================================================
   FENRYS BOT — MAIN — FIX JID
   Creator: Juna | 2025
============================================================ */

import fs from 'fs';
import path, { join } from 'path';
import syntaxError from 'syntax-error';
import chalk from 'chalk';
import { getGroupAdmins } from './lib/myfunc.js';

const PLUGIN_DIR = './plugins';
const JS = (file) => /\.js$/i.test(file);

global.plugins ||= {};

export async function preflightPlugins({ verbose = true, failFast = true } = {}) {
    const startTime = Date.now();
    let loadedCount = 0;
    let errorCount = 0;

    const formatSuccess = (msg) => '\x1b[32m' + msg + '\x1b[0m';
    const formatError = (msg) => '\x1b[31m%s\x1b[0m' + msg + '\x1b[0m';
    const formatHeader = (msg) => '\x1b[36m' + msg + '\x1b[0m';

    const importDynamic = async (filePath) =>
        import(path.resolve(filePath).replace(/\\/g, '/') + ('?check=' + Date.now()));

    async function scanDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        for (const file of fs.readdirSync(dir)) {
            const fullPath = join(dir, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                await scanDirectory(fullPath);
            } else if (stats.isFile() && JS(file)) {
                const err = syntaxError(fs.readFileSync(fullPath), file, {
                    sourceType: 'module',
                    allowAwaitOutsideFunction: true
                });

                if (err) {
                    errorCount++;
                    if (verbose) console.log(formatError(' ' + fullPath + '\n Syntax error \n' + err));
                    if (failFast) return;
                    continue;
                }

                try {
                    const module = await importDynamic(fullPath);
                    const plugin = module.default;

                    if (!plugin || (typeof plugin !== 'function' && typeof plugin !== 'object')) {
                        throw new Error('export default invalid');
                    }

                    const hasCommand = typeof plugin?.command !== 'undefined';
                    const hasBefore = typeof plugin?.before === 'function';

                    if (!hasCommand && !hasBefore) {
                        throw new Error('missing "command" or "before"');
                    }

                    loadedCount++;
                    if (verbose) console.log(formatSuccess(' ' + fullPath));
                } catch (err) {
                    errorCount++;
                    if (verbose) console.log(formatSuccess(formatError(' ' + fullPath + ' — ImportError: ' + err.message)));
                    if (failFast) return;
                }
            }
        }
    }

    if (verbose) console.log(formatHeader('\n Preflight scan "' + PLUGIN_DIR + '"\n'));
    await scanDirectory(PLUGIN_DIR);

    const timeSpent = Date.now() - startTime;

    if (verbose) {
        console.log('\n SUMMARY ');
        console.log('Loaded : ' + loadedCount);
        console.log('Errors : ' + errorCount);
        console.log('Time   : ' + timeSpent + ' ms');
        console.log('');
    }

    return {
        ok: errorCount === 0,
        loaded: loadedCount,
        errors: errorCount,
        ms: timeSpent
    };
}

async function importFresh(filePath) {
    return import(path.resolve(filePath).replace(/\\/g, '/') + ('?update=' + Date.now()));
}

async function loadPlugin(filePath) {
    try {
        const module = await importFresh(filePath);
        global.plugins[filePath] = module.default;
    } catch {
        delete global.plugins[filePath];
    }
}

async function loadAllRecursive(dir = PLUGIN_DIR) {
    if (!fs.existsSync(dir)) return;

    for (const file of fs.readdirSync(dir)) {
        const fullPath = join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            await loadAllRecursive(fullPath);
        } else if (JS(file)) {
            await loadPlugin(fullPath);
        }
    }
}

await loadAllRecursive();

fs.watch(PLUGIN_DIR, { recursive: true }, async (eventType, filename) => {
    if (!JS(filename)) return;

    const fullPath = join(PLUGIN_DIR, filename);
    const normalizedPath = path.resolve(fullPath).replace(/\\/g, '/');

    if (!fs.existsSync(fullPath)) {
        delete global.plugins[normalizedPath];
        console.log(chalk.redBright('- Removed ' + filename));
        return;
    }

    let code;
    try {
        code = fs.readFileSync(fullPath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            delete global.plugins[normalizedPath];
            return;
        }
        throw err;
    }

    const err = syntaxError(code, filename, {
        sourceType: 'module',
        allowAwaitOutsideFunction: true
    });

    if (err) {
        console.error('Plugin error:', ' Syntax error ' + filename + '\n' + err);
        return;
    }

    await loadPlugin(fullPath);
    console.log(chalk.green(' Reloaded ' + filename));
});

function pickBody(msg) {
    return (
        msg?.text ||
        msg?.message?.conversation ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        msg?.message?.extendedTextMessage?.text ||
        ''
    );
}

export default async function router(conn, msg) {
    const body = pickBody(msg);
    if (!body) return;

    const [rawCmd, ...args] = body.trim().split(/\s+/);
    const command = (rawCmd || '').toLowerCase();
    const chatJid = msg.key?.remoteJid;
    const isGroup = chatJid?.endsWith('@g.us');

    const matchedPlugin = Object.values(global.plugins).find((plugin) => {
        const cmdPattern = plugin?.command;

        if (cmdPattern instanceof RegExp) {
            return cmdPattern.test(command);
        }
        if (Array.isArray(cmdPattern)) {
            return cmdPattern.some((item) =>
                item instanceof RegExp ? item.test(command) : String(item).toLowerCase() === command
            );
        }
        return typeof cmdPattern === 'string' && cmdPattern.toLowerCase() === command;
    });

    if (!matchedPlugin) return;

    const groupMetadata = isGroup ? await conn.groupMetadata(chatJid).catch(() => ({})) : {};
    const participants = isGroup ? groupMetadata.participants || [] : [];
    const groupAdmins = isGroup ? getGroupAdmins(participants) : [];

    const extractPhone = (jid = '') => {
        if (typeof jid !== 'string') return '';
        const match = jid.match(/(\d{5,})/);
        return match ? match[1] + '@s.whatsapp.net' : '';
    };

    const senderJid = extractPhone(msg.sender);
    const botJid = extractPhone(conn.user?.id || '');

    const isSenderAdmin = isGroup ? groupAdmins.includes(senderJid) : false;
    const isBotAdmin = isGroup ? groupAdmins.includes(botJid) : false;

    let senderAltJid;
    if (isGroup) {
        if (msg.key?.participant && /@s\.whatsapp\.net$/i.test(msg.key.participant)) {
            senderAltJid = msg.key.participant;
        } else if (msg.key?.participantAlt && /@s\.whatsapp\.net$/i.test(msg.key.participantAlt)) {
            senderAltJid = msg.key.participantAlt;
        } else {
            senderAltJid = msg.key.participant || msg.key.participantAlt;
        }
    } else {
        if (msg.key?.remoteJid && /@s\.whatsapp\.net$/i.test(msg.key.remoteJid)) {
            senderAltJid = msg.key.remoteJid;
        } else if (msg.key?.remoteJidAlt && /@s\.whatsapp\.net$/i.test(msg.key.remoteJidAlt)) {
            senderAltJid = msg.key.remoteJidAlt;
        } else {
            senderAltJid = msg.key.remoteJid || msg.key.remoteJidAlt;
        }
    }

    const botNumber = await conn.decodeJid(conn.user.id);
    const ownerList = [botNumber, ...global.ownerNumber].map((owner) =>
        owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    );
    const isOwner = ownerList.includes(senderAltJid);

    if (matchedPlugin.owner && !isOwner) {
        return conn.sendMessage(chatJid, { text: global.mess.owner }, { quoted: msg });
    }
    if (matchedPlugin.group && !isGroup) {
        return conn.sendMessage(chatJid, { text: global.mess.group }, { quoted: msg });
    }
    if (matchedPlugin.admin && !isSenderAdmin) {
        return conn.sendMessage(chatJid, { text: global.mess.admin }, { quoted: msg });
    }
    if (matchedPlugin.botAdmin && !isBotAdmin) {
        return conn.sendMessage(chatJid, { text: global.mess.botAdmin }, { quoted: msg });
    }

    const extraArgs = {
        fenrys: conn,
        conn: conn,
        args: args,
        text: args.join(' '),
        participants: participants,
        command: command
    };

    try {
        if (typeof matchedPlugin === 'function') {
            await matchedPlugin(conn, msg, extraArgs);
        } else if (typeof matchedPlugin?.default === 'function') {
            await matchedPlugin.default.call(conn, msg, extraArgs);
        } else {
            await matchedPlugin?.before?.(conn, msg, extraArgs);
        }
    } catch (err) {
        console.error('Plugin error:', err);
        await conn.sendMessage(chatJid, { text: ' Terjadi kesalahan.' }, { quoted: msg });
    }
}

const file = import.meta.url;
fs.watchFile(new URL(file), () => {
    fs.unwatchFile(new URL(file));
    console.log(chalk.redBright(' Update ' + file));
    process.exit(0);
});
