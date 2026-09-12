const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const { PACKS_FOLDER, getPackNames, getPackCards } = require('../config');
const { getPackCount, removePack, addCard, getInventory } = require('../database');

async function openPack(client, msg, packName) {

    const userId = msg.author;

    if (!packName) {
        await msg.reply('❌ Usage: /open [pack]');
        return;
    }

    const packs = getPackNames();
    const match = packs.find(
        p => p.toLowerCase() === packName.toLowerCase()
    );

    if (!match) {
        await msg.reply(`❌ No pack called "${packName}" exists.`);
        return;
    }

    const owned = await getPackCount(userId, match);

    if (owned <= 0) {
        await msg.reply(`❌ You don't have any *${match}* packs. Get one with /spawn + /claim.`);
        return;
    }

    const allCards = getPackCards(match);

    if (allCards.length === 0) {
        await msg.reply(`❌ The *${match}* pack has no cards in it.`);
        return;
    }

    // Cards are stored as "<pack>/<file>" - filter out ones already owned.
    const inventory = await getInventory(userId);
    const ownedSet = new Set(inventory);

    const availableCards = allCards.filter(
        file => !ownedSet.has(`${match}/${file}`)
    );

    if (availableCards.length === 0) {
        await msg.reply(`🎉 You already own every card in *${match}*! Your pack wasn't used.`);
        return;
    }

    const removed = await removePack(userId, match);

    if (!removed) {
        await msg.reply(`❌ You don't have any *${match}* packs.`);
        return;
    }

    const cardFile = availableCards[Math.floor(Math.random() * availableCards.length)];
    const cardId = `${match}/${cardFile}`;

    await addCard(userId, cardId);

    const media = MessageMedia.fromFilePath(
        path.join(PACKS_FOLDER, match, cardFile)
    );

    const cardName = path.parse(cardFile).name;

    await client.sendMessage(
        msg.from,
        media,
        { sendMediaAsSticker: true }
    );

    await client.sendMessage(
        msg.from,
        `🎉 @${userId.split('@')[0]} opened *${match}* and got *${cardName}*!`,
        { mentions: [userId] }
    );
}

module.exports = openPack;