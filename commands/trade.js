const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const { PACKS_FOLDER, parseCardMeta } = require('../config');
const { getInventory, removeCard, addCard } = require('../database');

// Keyed by targetId - only one incoming trade offer per person at a time.
// value = { fromId, fromCardId, toCardId, timestamp }
const pendingTrades = new Map();

function tag(userId) {
    return `@${userId.split('@')[0]}`;
}

function findCard(inventory, name) {
    return inventory.find(
        cardId => path.parse(cardId).name.toLowerCase() === name.toLowerCase()
    );
}

function describeCard(cardId) {
    const name = path.parse(cardId).name;
    const meta = parseCardMeta(cardId);
    return meta ? `${name} (${meta.ovr} OVR)` : name;
}

async function sendCardSticker(client, groupId, cardId) {
    const media = MessageMedia.fromFilePath(path.join(PACKS_FOLDER, cardId));
    await client.sendMessage(groupId, media, { sendMediaAsSticker: true });
}

// Finds a pending trade a user is part of, either as the proposer or as the
// person being offered the trade. Returns { targetId, trade } or null.
function findPendingByUser(userId) {
    if (pendingTrades.has(userId)) {
        return { targetId: userId, trade: pendingTrades.get(userId) };
    }

    for (const [targetId, trade] of pendingTrades.entries()) {
        if (trade.fromId === userId) return { targetId, trade };
    }

    return null;
}

async function tradeCards(client, msg, argString) {

    const userId = msg.author;
    const groupId = msg.from;

    const mentions = msg.mentionedIds || [];

    // Strip the @mention token out of the body so we're left with the
    // sub-command or the two card names, same convention as /give.
    const words = (argString || '').trim().split(/\s+/).filter(Boolean);
    const nonMentionWords = words.filter(word => !word.startsWith('@'));
    const subCommand = (nonMentionWords[0] || '').toLowerCase();

    // --- /trade confirm ---
    if (nonMentionWords.length === 1 && subCommand === 'confirm' && mentions.length === 0) {
        const trade = pendingTrades.get(userId);

        if (!trade) {
            await msg.reply(
                '❌ You have no incoming trade offer to confirm. ' +
                '(Only the person who received the offer can confirm it.)'
            );
            return;
        }

        const [fromInventory, toInventory] = await Promise.all([
            getInventory(trade.fromId),
            getInventory(userId)
        ]);

        const stillValid =
            fromInventory.includes(trade.fromCardId) &&
            toInventory.includes(trade.toCardId);

        if (!stillValid) {
            pendingTrades.delete(userId);
            await msg.reply('❌ One of those cards is no longer available. Trade cancelled - ask for a new one.');
            return;
        }

        await removeCard(trade.fromId, trade.fromCardId);
        await removeCard(userId, trade.toCardId);
        await addCard(trade.fromId, trade.toCardId);
        await addCard(userId, trade.fromCardId);

        pendingTrades.delete(userId);

        await client.sendMessage(
            groupId,
            `✅ Trade complete! ${tag(trade.fromId)} and ${tag(userId)} swapped cards:\n\n` +
            `▸ ${tag(trade.fromId)} now has *${describeCard(trade.toCardId)}*\n` +
            `▸ ${tag(userId)} now has *${describeCard(trade.fromCardId)}*`,
            { mentions: [trade.fromId, userId] }
        );
        return;
    }

    // --- /trade cancel ---
    if (nonMentionWords.length === 1 && subCommand === 'cancel' && mentions.length === 0) {
        const found = findPendingByUser(userId);

        if (!found) {
            await msg.reply('❌ You have no pending trade to cancel.');
            return;
        }

        pendingTrades.delete(found.targetId);

        await client.sendMessage(
            groupId,
            `❌ Trade between ${tag(found.trade.fromId)} and ${tag(found.targetId)} was cancelled by ${tag(userId)}.`,
            { mentions: [found.trade.fromId, found.targetId] }
        );
        return;
    }

    // --- /trade @user [your card] [their card] ---
    if (mentions.length !== 1 || nonMentionWords.length !== 2) {
        await msg.reply(
            '❌ Usage:\n' +
            '▸ /trade @user [your card] [their card] - propose a trade\n' +
            '▸ /trade confirm - accept an incoming trade offer\n' +
            '▸ /trade cancel - cancel a trade you sent or were offered'
        );
        return;
    }

    const targetId = mentions[0];

    if (targetId === userId) {
        await msg.reply("❌ You can't trade with yourself.");
        return;
    }

    const [myCardName, theirCardName] = nonMentionWords;

    if (findPendingByUser(userId)) {
        await msg.reply('❌ You already have a pending trade. Resolve it first with /trade confirm or /trade cancel.');
        return;
    }

    if (findPendingByUser(targetId)) {
        await msg.reply(
            `❌ ${tag(targetId)} already has a pending trade. Try again once it's resolved.`,
            { mentions: [targetId] }
        );
        return;
    }

    const [myInventory, theirInventory] = await Promise.all([
        getInventory(userId),
        getInventory(targetId)
    ]);

    const myCardId = findCard(myInventory, myCardName);
    const theirCardId = findCard(theirInventory, theirCardName);

    if (!myCardId) {
        await msg.reply(`❌ You don't own a card called "${myCardName}".`);
        return;
    }

    if (!theirCardId) {
        await msg.reply(
            `❌ ${tag(targetId)} doesn't own a card called "${theirCardName}".`,
            { mentions: [targetId] }
        );
        return;
    }

    if (myCardId === theirCardId) {
        await msg.reply("❌ That's the same card - nothing to trade.");
        return;
    }

    pendingTrades.set(targetId, {
        fromId: userId,
        fromCardId: myCardId,
        toCardId: theirCardId,
        timestamp: Date.now()
    });

    await client.sendMessage(
        groupId,
        `🔄 ${tag(userId)} wants to trade with ${tag(targetId)}!\n\n` +
        `📤 Offering: *${describeCard(myCardId)}*\n` +
        `📥 For: *${describeCard(theirCardId)}*\n\n` +
        `${tag(targetId)}, reply */trade confirm* to accept or */trade cancel* to decline.\n` +
        `(${tag(userId)} can also /trade cancel to withdraw.)`,
        { mentions: [userId, targetId] }
    );

    // Show both cards as stickers so everyone can see exactly what's on offer.
    await sendCardSticker(client, groupId, myCardId);
    await sendCardSticker(client, groupId, theirCardId);
}

module.exports = tradeCards;