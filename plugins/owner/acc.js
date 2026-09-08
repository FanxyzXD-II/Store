import { readUserTx, writeUserTx, deliverIfPaidForUser } from '../transaction.js';
import fs from 'fs';
import path from 'path';

const TX_DIR = path.join(process.cwd(), 'database', 'transaction');

let handler = async (conn, m, { args }) => {
    let trxId = args[0];
    if (!trxId) return m.reply('❌ Masukkan ID Transaksi!\nContoh: *.acc TRX123456*');

    const files = fs.readdirSync(TX_DIR).filter(f => f.endsWith('.json'));
    let foundUserJid = null;
    let foundTx = null;

    for (const file of files) {
        const userJid = file.replace('.json', '');
        const userTxs = readUserTx(userJid);
        const tx = userTxs.find(t => t.transactionId === trxId);

        if (tx) {
            foundUserJid = userJid;
            foundTx = tx;
            break;
        }
    }

    if (!foundTx) return m.reply('❌ ID Transaksi tidak ditemukan!');
    if (foundTx.status === 'delivered') return m.reply('⚠️ Transaksi ini sudah dikirim sebelumnya.');

    // Ubah status transaksi ke paid
    const userTxs = readUserTx(foundUserJid);
    const idx = userTxs.findIndex(t => t.transactionId === trxId);
    userTxs[idx].status = 'paid';
    writeUserTx(foundUserJid, userTxs);

    // Otomatis kirim produk stok ke chat pembeli
    await deliverIfPaidForUser(conn, foundUserJid, userTxs[idx]);

    m.reply(`✅ Transaksi *${trxId}* di-ACC! Produk berhasil dikirim ke pembeli.`);
};

handler.command = ['acc', 'done', 'konfirmasi'];
handler.admin = true;
export default handler;
