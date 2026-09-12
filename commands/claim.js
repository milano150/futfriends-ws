const { addPack } = require('../database');

async function claimCard(client, msg, activeSpawns) {

    const groupId = msg.from;
    const spawn = activeSpawns[groupId];

    if (!spawn) {
        await msg.reply('❌ There is no pack to claim right now.');
        return;
    }

    if (spawn.claimed) {
        await msg.reply('❌ This pack has already been claimed.');
        return;
    }

    const userId = msg.author;

    // First person wins
    spawn.claimed = true;

    await addPack(userId, spawn.pack);

    await client.sendMessage(
        groupId,
        `😝 @${userId.split('@')[0]} claimed a *${spawn.pack}* pack!`,
        {
            mentions: [userId]
        }
    );

    delete activeSpawns[groupId];
}

module.exports = claimCard;