const path = require('path');

const { getInventory, removeCard, addPack } = require('../database');
const { parseCardMeta } = require('../config');

const REQUIRED_COUNT = 3;

// Add more tiers here later, e.g. { from: 'futurestars', to: 'toty' }
const EXCHANGE_RULES = [
    { from: 'base', to: 'totw' },
    { from: 'totw', to: 'futurestars' },
    { from: 'futurestars', to: 'toty' }
];

// Tracks auto-picked exchanges awaiting /exc confirm, keyed by userId.
const pendingExchanges = new Map();

async function exchangeCards(client, msg, argString) {

    const userId = msg.author;

    const parts = (argString || '').trim().split(/\s+/).filter(Boolean);

    // --- /exc confirm ---
    if (parts.length === 1 && parts[0].toLowerCase() === 'confirm') {
        const pending = pendingExchanges.get(userId);

        if (!pending) {
            await msg.reply('❌ You have no pending exchange to confirm.');
            return;
        }

        const currentInventory = await getInventory(userId);
        const stillOwnsAll = pending.cardIds.every(id => currentInventory.includes(id));

        if (!stillOwnsAll) {
            pendingExchanges.delete(userId);
            await msg.reply('❌ One or more of those cards are no longer in your inventory. Exchange cancelled - try again.');
            return;
        }

        for (const id of pending.cardIds) {
            await removeCard(userId, id);
        }

        await addPack(userId, pending.targetPack);
        pendingExchanges.delete(userId);

        await client.sendMessage(
            msg.from,
            `🔄 @${userId.split('@')[0]} exchanged 3 *${pending.sourcePack}* cards for a *${pending.targetPack}* pack!`,
            { mentions: [userId] }
        );
        return;
    }

    // --- /exc cancel ---
    if (parts.length === 1 && parts[0].toLowerCase() === 'cancel') {
        if (pendingExchanges.has(userId)) {
            pendingExchanges.delete(userId);
            await msg.reply('❌ Exchange cancelled.');
        } else {
            await msg.reply('❌ You have no pending exchange to cancel.');
        }
        return;
    }

    const inventory = await getInventory(userId);

    const owned = inventory.map(cardId => {
        const [pack, file] = cardId.split('/');
        return { id: cardId, pack, name: path.parse(file).name.toLowerCase() };
    });

    // --- /exc [pack] - auto-pick mode ---
    if (parts.length === 1) {
        const targetPack = parts[0].toLowerCase();
        const rule = EXCHANGE_RULES.find(r => r.to.toLowerCase() === targetPack);

        if (!rule) {
            await msg.reply(`❌ No exchange leads to a *${targetPack}* pack.`);
            return;
        }

        const candidates = owned.filter(c => c.pack.toLowerCase() === rule.from.toLowerCase());

        if (candidates.length < REQUIRED_COUNT) {
            await msg.reply(`❌ You need ${REQUIRED_COUNT} *${rule.from}* cards to exchange for a *${rule.to}* pack, but you only have ${candidates.length}.`);
            return;
        }

        // Prefer using the lowest-OVR cards so it doesn't burn your best pulls.
        const withOvr = candidates.map(c => {
            const meta = parseCardMeta(c.id);
            return { ...c, ovr: meta ? meta.ovr : Infinity };
        });

        withOvr.sort((a, b) => a.ovr - b.ovr);

        const picks = withOvr.slice(0, REQUIRED_COUNT);

        pendingExchanges.set(userId, {
            sourcePack: rule.from,
            targetPack: rule.to,
            cardIds: picks.map(c => c.id)
        });

        await msg.reply(
            `🔄 Exchange *3 ${rule.from} cards* for a *${rule.to} pack*?\n\n` +
            `Cards to be used:\n▸ ${picks.map(c => c.name).join('\n▸ ')}\n\n` +
            `Reply */exc confirm* to proceed, or */exc cancel* to back out.`
        );
        return;
    }

    // --- /exc [card] [card] [card] - manual mode ---
    if (parts.length !== REQUIRED_COUNT) {
        await msg.reply(
            `❌ Usage:\n` +
            `▸ /exchange [pack] - auto-pick ${REQUIRED_COUNT} cards for that pack\n` +
            `▸ /exchange [card] [card] [card] - manually pick ${REQUIRED_COUNT} cards`
        );
        return;
    }

    const requested = parts;
    const uniqueRequested = new Set(requested.map(name => name.toLowerCase()));

    if (uniqueRequested.size !== REQUIRED_COUNT) {
        await msg.reply('❌ You need to name 3 *different* cards.');
        return;
    }

    const matched = [];
    const missing = [];

    for (const name of requested) {
        const found = owned.find(c => c.name === name.toLowerCase());
        if (found) {
            matched.push(found);
        } else {
            missing.push(name);
        }
    }

    if (missing.length > 0) {
        await msg.reply(`❌ You don't own these cards: ${missing.join(', ')}`);
        return;
    }

    const packsUsed = new Set(matched.map(c => c.pack.toLowerCase()));

    if (packsUsed.size !== 1) {
        await msg.reply('❌ All 3 cards must be from the *same* pack.');
        return;
    }

    const sourcePack = [...packsUsed][0];
    const rule = EXCHANGE_RULES.find(r => r.from.toLowerCase() === sourcePack);

    if (!rule) {
        await msg.reply(`❌ *${sourcePack}* cards can't currently be exchanged for anything.`);
        return;
    }

    for (const card of matched) {
        await removeCard(userId, card.id);
    }

    await addPack(userId, rule.to);

    await client.sendMessage(
        msg.from,
        `🔄 @${userId.split('@')[0]} exchanged 3 *${sourcePack}* cards for a *${rule.to}* pack!`,
        { mentions: [userId] }
    );
}

module.exports = exchangeCards;