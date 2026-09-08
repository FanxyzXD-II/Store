let handler = async (m, { fenrys, text, participants }) => {

  let content =
    (text && text.trim().length ? text : '') ||
    (m.quoted?.text?.trim?.() || m.quoted?.caption?.trim?.() || '') ||
    '\u200E'; 

  const mentions = (participants || []).map(p => p?.id).filter(Boolean);

  await fenrys.sendMessage(
    m.chat,
    { text: content, mentions }
  );
};

handler.help = ['hidetag', 'h'];
handler.tags = ['group'];
handler.command = /^(h|hidetag)$/i; 
handler.group = true;
handler.admin = true;

export default handler;