const path = require('path');

const { getPackNames } = require('../config');
const {
    getInventory,
    removeCard,
    addCard,
    getPackCount,
    removePack,
    addPack
} = require('../database');

async function giveItem(client, msg, argString) {

    const senderId = msg.author;
    const mentions = msg.mentionedIds || [];

    if (mentions.length === 0) {
        await msg.reply('❌ Usage: /give [card or pack] @user');
        return;
    }

    const targetId = mentions[0];

    if (targetId === senderId) {
        await msg.reply("❌ You can't give something to yourself.");
        return;
    }

    // Strip the @mention token out of the arg string to isolate the item name.
    const itemName = (argString || '')
        .split(/\s+/)
        .filter(token => !token.startsWith('@'))
        .join(' ')
        .trim();

    if (!itemName) {
        await msg.reply('❌ Usage: /give [card or pack] @user');
        return;
    }

    // Check pack names first - packs and cards can't share a name, but this
    // makes the rule explicit.
    const packs = getPackNames();
    const packMatch = packs.find(p => p.toLowerCase() === itemName.toLowerCase());

    if (packMatch) {
        const owned = await getPackCount(senderId, packMatch);

        if (owned <= 0) {
            await msg.reply(`❌ You don't have any *${packMatch}* packs.`);
            return;
        }

        await removePack(senderId, packMatch);
        await addPack(targetId, packMatch);

        await client.sendMessage(
            msg.from,
            `🎁 @${senderId.split('@')[0]} gave a *${packMatch}* pack to @${targetId.split('@')[0]}!`,
            { mentions: [senderId, targetId] }
        );
        return;
    }

    // Otherwise treat it as a card name.
    const inventory = await getInventory(senderId);

    const cardMatch = inventory.find(cardId => {
        const name = path.parse(cardId).name;
        return name.toLowerCase() === itemName.toLowerCase();
    });

    if (!cardMatch) {
        await msg.reply(`❌ You don't own a card or pack called "${itemName}".`);
        return;
    }

    const targetInventory = await getInventory(targetId);

    if (targetInventory.includes(cardMatch)) {
        await msg.reply(
            `❌ @${targetId.split('@')[0]} already owns *${path.parse(cardMatch).name}*.`,
            { mentions: [targetId] }
        );
        return;
    }

    await removeCard(senderId, cardMatch);
    await addCard(targetId, cardMatch);

    const cardName = path.parse(cardMatch).name;

    await client.sendMessage(
        msg.from,
        `🎁 @${senderId.split('@')[0]} gave *${cardName}* to @${targetId.split('@')[0]}!`,
        { mentions: [senderId, targetId] }
    );
}

module.exports = giveItem;