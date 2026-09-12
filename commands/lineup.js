const { MessageMedia } = require('whatsapp-web.js');

const { getLineup } = require('../database');
const { buildLineupImage } = require('../lineupImage');

const SLOTS = ['gk', 'def1', 'def2', 'mid', 'st1', 'st2'];

async function lineup(client, msg) {

    const userId = msg.author;

    const saved = await getLineup(userId);

    if (!saved) {
        await msg.reply('❌ You don\'t have a lineup set yet. Use /autosetup first.');
        return;
    }

    const hasEmptySpot = SLOTS.some(slot => !saved[slot]);

    if (hasEmptySpot) {
        await msg.reply('⚠️ Your team has empty spots. Fill every position first, then run /lineup again.');
        return;
    }

    const imageBuffer = await buildLineupImage(saved);
    const media = new MessageMedia('image/png', imageBuffer.toString('base64'));

    await client.sendMessage(
        msg.from,
        media,
        {
            caption: `🧑‍💼 Manager: @${userId.split('@')[0]}\n⭕ Team OVR: *${saved.ovr}*`,
            mentions: [userId]
        }
    );
}

module.exports = lineup;