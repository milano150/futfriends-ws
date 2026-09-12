const { parseCardMeta, emojiForPack, OWNER_ID } = require('../config');
const { getAllOwnedCards } = require('../database');

const TOP_N = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

async function bestCards(client, msg) {

    const rows = await getAllOwnedCards();

    const withMeta = rows
        .filter(row => row.user_id !== OWNER_ID) // exclude owner's own cards for now
        .map(row => {
            const meta = parseCardMeta(row.card);
            if (!meta) return null;

            const [pack] = row.card.split('/');

            return {
                userId: row.user_id,
                pack,
                name: meta.name,
                ovr: meta.ovr
            };
        })
        .filter(Boolean);

    if (withMeta.length === 0) {
        await msg.reply('📉 No cards are currently owned by anyone.');
        return;
    }

    withMeta.sort((a, b) => b.ovr - a.ovr);

    const top = withMeta.slice(0, TOP_N);
    const mentions = [...new Set(top.map(entry => entry.userId))];

    const lines = top.map((entry, index) => {
        const rank = MEDALS[index] || `${index + 1}.`;
        return `${rank} ${emojiForPack(entry.pack)} *${entry.name}* (${entry.ovr} OVR) — @${entry.userId.split('@')[0]}`;
    });

    const text = `🏆 *TOP ${top.length} CARDS IN CIRCULATION*\n\n${lines.join('\n')}`;

    await client.sendMessage(msg.from, text, { mentions });
}

module.exports = bestCards;