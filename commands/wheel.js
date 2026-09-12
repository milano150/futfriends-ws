const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const { PACKS_FOLDER, getPackCards, parseCardMeta, emojiForPack } = require('../config');
const { addCard, ownsCard } = require('../database');

const WHEEL_RESET_MS = 24 * 60 * 60 * 1000;

// Which packs feed the wheel, and how many cards to pull from each.
const WHEEL_COMPOSITION = [
    { pack: 'special',     count: 1 },
    { pack: 'futurestars', count: 1 },
    { pack: 'totw',        count: 2 },
    { pack: 'base',        count: 2 }
];

// Module-level state - one shared wheel, not per-group. Regenerates the
// first time /wheel is used after WHEEL_RESET_MS has elapsed.
let currentWheel = null; // { cards: [cardId...], generatedAt: timestamp }
const lastSpin = new Map(); // userId -> timestamp of their last spin

function pickRandom(list, count) {
    const pool = [...list];
    const picks = [];

    for (let i = 0; i < count && pool.length > 0; i++) {
        const index = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(index, 1)[0]);
    }

    return picks;
}

function generateWheel() {
    const cards = [];

    for (const { pack, count } of WHEEL_COMPOSITION) {
        const files = getPackCards(pack);
        const picks = pickRandom(files, count).map(file => `${pack}/${file}`);
        cards.push(...picks);
    }

    return { cards, generatedAt: Date.now() };
}

// Lazily regenerates the wheel once the reset window has passed, and clears
// everyone's spin record so the new wheel is spinnable by all again.
function getCurrentWheel() {
    if (!currentWheel || Date.now() - currentWheel.generatedAt >= WHEEL_RESET_MS) {
        currentWheel = generateWheel();
        lastSpin.clear();
    }

    return currentWheel;
}

function describeCard(cardId) {
    const name = path.parse(cardId).name;
    const meta = parseCardMeta(cardId);
    return meta ? `${name} (${meta.ovr} OVR)` : name;
}

function formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
}

async function wheel(client, msg, argString) {

    const userId = msg.author;
    const groupId = msg.from;

    const wheelState = getCurrentWheel();
    const resetIn = WHEEL_RESET_MS - (Date.now() - wheelState.generatedAt);

    const subCommand = (argString || '').trim().toLowerCase();

    if (wheelState.cards.length === 0) {
        await msg.reply('❌ The wheel has no cards available right now - make sure special/futurestars/totw/base packs have cards in them.');
        return;
    }

    // --- /wheel - show the current pool ---
    if (subCommand !== 'spin') {
        const list = wheelState.cards
            .map(id => `▸ ${emojiForPack(id.split('/')[0])} ${describeCard(id)}`)
            .join('\n');

        await msg.reply(
            `🎡 *TODAY'S WHEEL*\n\n${list}\n\n` +
            `⏳ Resets in ${formatDuration(resetIn)}\n` +
            `Type */wheel spin* to spin for one of these!`
        );
        return;
    }

    // --- /wheel spin ---
    const previousSpin = lastSpin.get(userId);

    if (previousSpin && previousSpin >= wheelState.generatedAt) {
        await msg.reply(`⏳ You've already spun the wheel today. It resets in ${formatDuration(resetIn)}.`);
        return;
    }

    const won = wheelState.cards[Math.floor(Math.random() * wheelState.cards.length)];

    lastSpin.set(userId, Date.now());

    // The same 6 cards are shared by everyone, so a user can land on one
    // they already own - award nothing rather than crash on the duplicate.
    const alreadyOwned = await ownsCard(userId, won);

    if (alreadyOwned) {
        await client.sendMessage(
            groupId,
            `🎡 @${userId.split('@')[0]} spun the wheel and landed on *${describeCard(won)}* - but already owns it! No card awarded this spin.`,
            { mentions: [userId] }
        );
        return;
    }

    await addCard(userId, won);

    const media = MessageMedia.fromFilePath(path.join(PACKS_FOLDER, won));
    await client.sendMessage(groupId, media, { sendMediaAsSticker: true });

    await client.sendMessage(
        groupId,
        `🎡 @${userId.split('@')[0]} spun the wheel and got *${describeCard(won)}*!`,
        { mentions: [userId] }
    );
}

module.exports = wheel;