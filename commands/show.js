const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const { PACKS_FOLDER } = require('../config');
const { getInventory, getCardCirculation } = require('../database');

async function showCard(client, msg, cardName) {

    const userId = msg.author;

    if (!cardName) {
        await msg.reply('❌ Usage: /show [card]');
        return;
    }

    const inventory = await getInventory(userId);

    // cardId is stored as "<pack>/<file>" - match on just the card's own name.
    const match = inventory.find(cardId => {
        const name = path.parse(cardId).name;
        return name.toLowerCase() === cardName.toLowerCase();
    });

    if (!match) {
        await msg.reply(`❌ You don't own a card called "${cardName}".`);
        return;
    }

    const media = MessageMedia.fromFilePath(
        path.join(PACKS_FOLDER, match)
    );

    await client.sendMessage(
        msg.from,
        media,
        { sendMediaAsSticker: true }
    );

    const contact = await client.getContactById(userId);
    const ownerName = contact.pushname || contact.name || `+${userId.split('@')[0]}`;

    const total = await getCardCirculation(match);
    const displayName = path.parse(match).name;
    const packName = path.dirname(match);

    const caption =
        `🃏 *${displayName}*\n` +
        `📦 Pack: *${packName}*\n` +
        `👤 Owner: *${ownerName}*\n` +
        `✨ Rarity: *1/${total}* in circulation`;

    await client.sendMessage(msg.from, caption, { mentions: [userId] });
}

module.exports = showCard;