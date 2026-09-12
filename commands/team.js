const path = require('path');

const { parseCardMeta } = require('../config');
const { getLineup } = require('../database');

async function team(client, msg) {

    const userId = msg.author;

    const saved = await getLineup(userId);

    if (!saved) {
        await msg.reply('❌ You don\'t have a lineup set yet. Use /autosetup first.');
        return;
    }

    const describe = cardId => {
        if (!cardId) return 'EMPTY (exchanged/given away)';
        const meta = parseCardMeta(cardId);
        const name = path.parse(cardId).name;
        return meta ? `${name} (${meta.ovr} OVR)` : name;
    };

    const hasGap = ['gk', 'def1', 'def2', 'mid', 'st1', 'st2'].some(slot => !saved[slot]);

    const text =
        `⚽ *@${userId.split('@')[0]}'s Team*\n\n` +
        `🧤 GK: ${describe(saved.gk)}\n` +
        `🛡️ DEF: ${describe(saved.def1)}\n` +
        `🛡️ DEF: ${describe(saved.def2)}\n` +
        `🎯 MID: ${describe(saved.mid)}\n` +
        `⚡ ST: ${describe(saved.st1)}\n` +
        `⚡ ST: ${describe(saved.st2)}\n\n` +
        `✨ Team OVR: *${saved.ovr}*${hasGap ? ' (out of date - run /autosetup)' : ''}`;

    await client.sendMessage(msg.from, text, { mentions: [userId] });
}

module.exports = team;