/* ============================================================
   FENRYS BOT — INDEX — CUSTOM PAIRING FIX CONNECTION CLOSED
   Creator: Juna | 2025
============================================================ */

import './settings.js';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import pino from 'pino';
import NodeCache from 'node-cache';
import readline from 'readline';
import PhoneNumber from 'awesome-phonenumber';
import { Boom } from '@hapi/boom';
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
    makeWASocket,
    Browsers,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidDecode
} from '@whiskeysockets/baileys';
import { setup } from './handler.js';
import { preflightPlugins } from './main.js';

const sessionName = 'session';
const usePairingCode = true;

function createLiteStore() {
    const data = {
        contacts: {},
        chats: {}
    };

    const storeInstance = {
        get contacts() {
            return data.contacts;
        },
        bind(ev) {
            ev?.on?.('contacts.upsert', (newContacts = []) => {
                for (const contact of newContacts) {
                    const id = contact.id || contact.jid;
                    if (!id) continue;
                    data.contacts[id] = {
                        ...data.contacts[id] || {},
                        ...contact
                    };
                }
            });

            ev?.on?.('contacts.update', (updatedContacts = []) => {
                for (const contact of updatedContacts) {
                    const id = contact.id || contact.jid;
                    if (!id) continue;
                    data.contacts[id] = {
                        ...data.contacts[id] || {},
                        ...contact
                    };
                }
            });
        },
        readFromFile(filePath) {
            try {
                const json = fs.readJsonSync(filePath);
                Object.assign(data, json);
            } catch {}
        },
        writeToFile(filePath) {
            try {
                fs.writeJsonSync(filePath, data, { spaces: 2 });
            } catch {}
        }
    };

    return storeInstance;
}

const store = createLiteStore();

async function startFenrys() {
    console.log(chalk.cyan('\n🔍 Memeriksa plugin (syntax & import test)...'));
    await preflightPlugins();

    const { state, saveCreds } = await useMultiFileAuthState('./' + sessionName);
    const { version } = await fetchLatestBaileysVersion();

    const fenrys = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !usePairingCode,
        browser: Browsers.ubuntu('Chrome'),
        auth: state,
        msgRetryCounterCache: new NodeCache()
    });

    store.bind(fenrys.ev);
    setup(fenrys);

    if (usePairingCode && !fenrys.authState.creds.registered) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query) => new Promise((resolve) => rl.question(query, resolve));

        console.log(chalk.magentaBright('\nMasukkan nomor WhatsApp (contoh: 628xxxxx)'));
        const phoneNumber = await question('Nomor: ');
        await sleep(3000);
        const pairingCode = await fenrys.requestPairingCode(phoneNumber);

        console.log(chalk.green('\n✅ Kode pairing: ' + chalk.bold.white(pairingCode) + '\n'));
    }

    fenrys.ev.on('creds.update', saveCreds);

    fenrys.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decoded = jidDecode(jid) || {};
            return decoded.user && decoded.server ? decoded.user + '@' + decoded.server : jid;
        }
        return jid;
    };

    fenrys.ev.on('contacts.update', (contacts) => {
        for (const contact of contacts) {
            const jid = fenrys.decodeJid(contact.id);
            if (!jid) continue;

            store.contacts[jid] = {
                ...store.contacts[jid] || {},
                id: jid,
                name: contact.notify || store.contacts[jid]?.name || jid
            };
        }
    });

    fenrys.getName = (jid, withoutContact = false) => {
        const decodedJid = fenrys.decodeJid(jid);
        let contactData;

        if (decodedJid.endsWith('@g.us')) {
            return new Promise(async (resolve) => {
                contactData = store.contacts[decodedJid] || {};
                if (!(contactData.name || contactData.subject)) {
                    contactData = await fenrys.groupMetadata(decodedJid).catch(() => ({})) || {};
                }
                resolve(contactData.name || contactData.subject || PhoneNumber('+' + decodedJid.replace('@g.us', '')).getNumber('international'));
            });
        } else {
            contactData = decodedJid === '0@s.whatsapp.net'
                ? { id: decodedJid, name: 'WhatsApp' }
                : decodedJid === fenrys.decodeJid(fenrys.user['id'])
                ? fenrys.user
                : store.contacts[decodedJid] || {};

            return (withoutContact ? '' : contactData.name) ||
                contactData.subject ||
                contactData.verifiedName ||
                PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
        }
    };

    console.log(chalk.cyan('\n============== ' + global.botName + ' =============='));
    console.log(chalk.white('Pairing  : '), chalk.yellow('OFF'));
    console.log(chalk.white('Hot Reload: '), chalk.green('ON'));
    console.log(chalk.white('Mode     : '), chalk.green(usePairingCode ? 'ON' : 'OFF'));
    console.log(chalk.cyan('============================================\n'));

    fenrys.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(chalk.green('✅ Connected to WhatsApp!\n'));
        } else if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(chalk.red('❌ Connection closed (' + statusCode + '), restarting...'));
            await sleep(2000);
            startFenrys();
        }
    });

    fenrys.ev.on('messages.upsert', async ({ messages }) => {
        console.log('[messages.upsert] received:', messages?.length || 0);
        for (const message of messages || []) {
            console.log('[messages.upsert] message:', {
                remoteJid: message?.key?.remoteJid,
                fromMe: message?.key?.fromMe,
                type: message?.message ? Object.keys(message.message)[0] : 'none'
            });
            if (!message.message) continue;
            if (message.key.remoteJid === 'status@broadcast') continue;

            import('./handler.js')
                .then(({ default: handle }) => handle(fenrys, message, store))
                .catch((err) => console.error('[messages.upsert]', err));
        }
    });
}

startFenrys();

const file = import.meta.url;
fs.unwatchFile(new URL(file));
fs.watchFile(new URL(file), () => {
    fs.unwatchFile(new URL(file));
    try {
        store.writeToFile(currentStorePath);
    } catch {}
    console.log(chalk.redBright('🔄 Update ' + file));
    process.exit(0);
});
