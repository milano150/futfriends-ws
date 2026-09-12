const { checkDaily, markDailyClaimed, addPack } = require('../database');

// Each entry: which packs get granted and how many. Weight controls how
// often it's picked - higher weight = more common. Tune freely.
const REWARD_TABLE = [
    { weight: 25, packs: { base: 1 } },
    { weight: 20, packs: { base: 2 } },
    { weight: 10, packs: { base: 3 } },
    { weight: 15, packs: { totw: 1 } },
    { weight: 5,  packs: { totw: 2 } },
    { weight: 20, packs: { base: 1, totw: 1 } },
    { weight: 5,  packs: { base: 2, totw: 1 } }
];

function rollReward() {
    const totalWeight = REWARD_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of REWARD_TABLE) {
        if (roll < entry.weight) return entry.packs;
        roll -= entry.weight;
    }

    return REWARD_TABLE[0].packs; // fallback, should never hit
}

function formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
}

async function claimDaily(client, msg) {

    const userId = msg.author;

    const status = await checkDaily(userId);

    if (!status.ready) {
        await msg.reply(`⏳ You've already claimed today. Try again in ${formatDuration(status.msRemaining)}.`);
        return;
    }

    const reward = rollReward();

    for (const [pack, count] of Object.entries(reward)) {
        for (let i = 0; i < count; i++) {
            await addPack(userId, pack);
        }
    }

    await markDailyClaimed(userId);

    const summary = Object.entries(reward)
        .map(([pack, count]) => `${count}x *${pack}*`)
        .join(' + ');

    await client.sendMessage(
        msg.from,
        `🎁 @${userId.split('@')[0]} claimed their daily reward: ${summary} pack(s)!`,
        { mentions: [userId] }
    );
}

module.exports = claimDaily;