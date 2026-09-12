const { getPackNames } = require('../config');

async function spawnCard(client, msg, activeSpawns) {

    const groupId = msg.from;

    const packs = getPackNames();

    if (packs.length === 0) {
        await msg.reply('❌ No packs found.');
        return;
    }

    if (activeSpawns[groupId]) {
        await msg.reply('⚠️ There is already a pack waiting to be claimed!');
        return;
    }

    const pack = packs[Math.floor(Math.random() * packs.length)];

    activeSpawns[groupId] = {
        pack,
        claimed: false
    };

    await client.sendMessage(
        groupId,
        `🎁 A wild *${pack}* pack appeared ‼️\n\n` +
        'Type /claim to claim it!'
    );
}

module.exports = spawnCard;