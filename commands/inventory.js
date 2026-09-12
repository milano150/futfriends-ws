const path = require('path');
const { getInventory, getPacks } = require('../database');

const PACK_EMOJIS = {
    base: '🟡',
    totw: '🔶',
    futurestars: '🟪',
    toty: '🟦'
};

function emojiFor(pack) {
    return PACK_EMOJIS[pack.toLowerCase()] || '🃏';
}

async function showInventory(msg) {

    const userId = msg.author;

    const [packs, cards, contact] = await Promise.all([
        getPacks(userId),
        getInventory(userId),
        msg.getContact()
    ]);

    const displayName = contact.pushname || contact.name || contact.number || 'Player';

    if (packs.length === 0 && cards.length === 0) {
        await msg.reply(`🃏 *${displayName}'s COLLECTION*\n\nIt's empty.`);
        return;
    }

    let text = `🃏 *${displayName}'s COLLECTION*\n\n`;

    if (packs.length > 0) {
        text += '📦 *Packs (unopened)*\n______\n';
        packs.forEach(({ pack, quantity }) => {
            text += `${emojiFor(pack)} ${pack} x${quantity}\n`;
        });
        text += '\n';
    }

    if (cards.length > 0) {
        text += '🎴 *Cards*\n______\n';
        cards.forEach(cardId => {
            const [pack, file] = cardId.split('/');
            const cardName = path.parse(file).name;
            text += `${emojiFor(pack)} ${cardName}\n`;
        });
        text += `\n✨ *${cards.length} cards collected*`;
    }

    await msg.reply(text);
}

module.exports = showInventory;