/* ============================================================
   FENRYS BOT — SIMPLE BOT STORE ESM — QRIS STATIS
   Creator: Juna | 2025
============================================================ */

import fs from 'fs';
import path from 'path';

const STOCK_DIR = path.join(process.cwd(), 'database', 'stock');
const TX_DIR = path.join(process.cwd(), 'database', 'transaction');
const BOT_NAME = global.botName || 'Store Bot';
const OWNER_JID = (Array.isArray(global.ownerNumber) ? global.ownerNumber[0] : global.ownerNumber) || '';

const norm = (str = '') => String(str).toLowerCase().trim();

function ensureDir(dirPath) {
    try {
        fs.mkdirSync(dirPath, { recursive: true });
    } catch {}
}

function stockFile(product) {
    ensureDir(STOCK_DIR);
    return path.join(STOCK_DIR, norm(product) + '.json');
}

export function readStock(product) {
    const filePath = stockFile(product);
    if (!fs.existsSync(filePath)) return { harga: null, items: [] };
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        if (Array.isArray(data)) return { harga: null, items: data };
        return {
            harga: typeof data.harga === 'number' ? data.harga : null,
            items: Array.isArray(data.items) ? data.items : []
        };
    } catch {
        return { harga: null, items: [] };
    }
}

export function writeStock(product, stockData) {
    const filePath = stockFile(product);
    const payload = {
        harga: typeof stockData.harga === 'number' ? stockData.harga : null,
        items: Array.isArray(stockData.items) ? stockData.items : []
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function userTxFile(userJid) {
    ensureDir(TX_DIR);
    return path.join(TX_DIR, userJid + '.json');
}

export function readUserTx(userJid) {
    const filePath = userTxFile(userJid);
    if (!fs.existsSync(filePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]') || [];
    } catch {
        return [];
    }
}

export function writeUserTx(userJid, transactions) {
    fs.writeFileSync(userTxFile(userJid), JSON.stringify(transactions, null, 2));
}

function rup(amount) {
    try {
        return 'Rp' + Number(amount || 0).toLocaleString('id-ID');
    } catch {
        return 'Rp' + amount;
    }
}

async function notifyCancelOnce(conn, userJid, tx) {
    const userTxs = readUserTx(userJid);
    const idx = userTxs.findIndex(t => t.transactionId === tx.transactionId);
    if (idx === -1) return;
    if (userTxs[idx].cancel_notified) return;

    try {
        const targetChat = userTxs[idx].chat || userJid;
        await conn.sendMessage(targetChat, {
            text: [
                '╭────────────────────────────╮',
                '│ ❌ *Transaksi Dibatalkan*',
                '├──────────────────────┤',
                '│ 🆔 Trx ID  : ' + tx.transactionId,
                '│────────────────────────────│',
                '╰────────────────────────────╯'
            ].join('\n')
        });
    } catch {}

    userTxs[idx].status = 'cancel';
    userTxs[idx].cancel_notified = true;
    writeUserTx(userJid, userTxs);
}

async function notifyExpiredOnce(conn, userJid, tx) {
    const userTxs = readUserTx(userJid);
    const idx = userTxs.findIndex(t => t.transactionId === tx.transactionId);
    if (idx === -1) return;
    if (userTxs[idx].expired_notified) return;

    try {
        const targetChat = userTxs[idx].chat || userJid;
        await conn.sendMessage(targetChat, {
            text: [
                '╭────────────────────────────╮',
                '│ ⏳ *Transaksi Expired*',
                '├──────────────────────┤',
                '│ 🆔 Trx ID  : ' + tx.transactionId,
                '│────────────────────────────│',
                '╰────────────────────────────╯'
            ].join('\n')
        });
    } catch {}

    userTxs[idx].status = 'expired';
    userTxs[idx].expired_notified = true;
    writeUserTx(userJid, userTxs);
}

export async function deliverIfPaidForUser(conn, userJid, tx) {
    const userTxs = readUserTx(userJid);
    const idx = userTxs.findIndex(t => t.transactionId === tx.transactionId);
    if (idx === -1 || userTxs[idx].status === 'delivered') return;

    const itemsList = userTxs[idx].items || [];
    const deliveredAccounts = [];
    const unfulfilledItems = [];

    for (const item of itemsList) {
        const stock = readStock(item.product);
        if ((stock.items?.length || 0) < item.qty) {
            unfulfilledItems.push(item.product + ' (tersisa ' + (stock.items?.length || 0) + ', butuh ' + item.qty + ')');
            continue;
        }

        for (let i = 0; i < item.qty; i++) {
            const poppedAccount = stock.items.shift();
            deliveredAccounts.push({
                product: item.product,
                email: poppedAccount.email,
                password: poppedAccount.password,
                price: item.price
            });
        }
        writeStock(item.product, stock);
    }

    userTxs[idx].status = 'delivered';
    userTxs[idx].delivered = deliveredAccounts;
    userTxs[idx].delivered_at = new Date().toISOString();
    writeUserTx(userJid, userTxs);

    try {
        const productsSummary = itemsList.map(i => i.product + '×' + i.qty).join(', ');
        const notificationText = '✅ *Terima kasih telah membeli*\n╭───────────────────╮\n│  ' + productsSummary + '\n│  di *' + BOT_NAME + '*\n│  * 💫\n│  Detail akun dikirim via private.\n╰───────────────────╯';
        await conn.sendMessage(tx.chat || userJid, { text: notificationText });
    } catch {}

    try {
        if (deliveredAccounts.length) {
            const formattedAccounts = deliveredAccounts.map((acc, index) =>
                '\n│    ' + (index + 1) + '. ' + acc.product + '\n│     ✉️ ' + acc.email + '\n│     🔑 ' + acc.password
            );

            let deliveryMessage = [
                '╭──────────────────────╮',
                '│ 🔐 *Akun Pembelian Kamu*',
                '├──────────────────────┤',
                ...formattedAccounts,
                '╰──────────────────────╯'
            ].join('\n');

            if (unfulfilledItems.length) {
                deliveryMessage += '\n⚠️ Item belum terpenuhi: ' + unfulfilledItems.join(', ');
            }

            await conn.sendMessage(userJid, { text: deliveryMessage });
        }
    } catch {}

    try {
        if (OWNER_JID) {
            const ownerAccountsLog = deliveredAccounts.map((acc, index) =>
                '│ ' + (index + 1) + '. ' + acc.product + ' = ' + acc.email + ' | ' + acc.password
            ).join('\n') || '│ (tidak ada akun dikirim)';

            const ownerItemsLog = itemsList.map(i => {
                const subtotal = i.subtotal ?? (i.price * i.qty);
                return '│ • ' + i.product + ' × ' + i.qty + ' @ ' + rup(i.price) + ' = ' + rup(subtotal);
            }).join('\n');

            const totalItemPrice = itemsList.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
            const totalPaid = userTxs[idx].expectedTotalWithFee || userTxs[idx].expectedTotal || userTxs[idx].totalAmount || totalItemPrice;
            const adminFee = Number(totalPaid || 0) - Number(totalItemPrice || 0);

            const ownerLogText = [
                '╭━━━━━━━━━━━━━━━━━━━╮',
                '│ 💸 *Transaksi Lunas*',
                '├───────────────────┤',
                '│ Pembeli: ' + userJid,
                '│ ID: ' + tx.transactionId,
                '│━━━━━━━━━━━━━━━━━━━│',
                ownerItemsLog,
                '│━━━━━━━━━━━━━━━━━━━│',
                '│ 💰 Harga Produk : ' + rup(totalItemPrice),
                '│ ⚙️ Fee Admin    : ' + rup(adminFee),
                '│━━━━━━━━━━━━━━━━━━━│',
                '│ 🔐 *Data Akun:*',
                ownerAccountsLog,
                '╰━━━━━━━━━━━━━━━━━━━╯'
            ].join('\n');

            const recipientOwnerJid = OWNER_JID.toLowerCase().includes('@') ? OWNER_JID : OWNER_JID + '@s.whatsapp.net';

            await conn.sendMessage(recipientOwnerJid, {
                text: ownerLogText,
                quoted: {
                    key: { remoteJid: userJid },
                    message: { conversation: 'Pembeli: ' + userJid }
                }
            });
        }
    } catch {}
}

export function startTransactionPoller(conn, intervalMs = 5000) {
    // Polling dimatikan penuh untuk QRIS Statis
    return;
}
