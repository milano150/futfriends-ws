const { MessageMedia } = require('whatsapp-web.js');

const {
    parseCardMeta,
    GK_POSITIONS,
    DEF_POSITIONS,
    MID_POSITIONS,
    ST_POSITIONS
} = require('../config');
const { getInventory, saveLineup } = require('../database');
const { buildLineupImage } = require('../lineupImage');

async function autosetup(client, msg) {

    const userId = msg.author;

    await msg.reply('⚙️ Setting up team...');

    const inventory = await getInventory(userId);

    const gk = [];
    const def = [];
    const mid = [];
    const st = [];

    for (const cardId of inventory) {
        const meta = parseCardMeta(cardId);
        if (!meta) continue;

        if (GK_POSITIONS.includes(meta.position)) gk.push({ cardId, ovr: meta.ovr });
        else if (DEF_POSITIONS.includes(meta.position)) def.push({ cardId, ovr: meta.ovr });
        else if (MID_POSITIONS.includes(meta.position)) mid.push({ cardId, ovr: meta.ovr });
        else if (ST_POSITIONS.includes(meta.position)) st.push({ cardId, ovr: meta.ovr });
    }

    if (gk.length < 1 || def.length < 2 || mid.length < 1 || st.length < 2) {
        await msg.reply(
            '❌ Not enough cards to fill a 2-1-2 lineup.\n' +
            `You need: 1+ GK (have ${gk.length}), 2+ defenders (have ${def.length}), ` +
            `1+ midfielder (have ${mid.length}), 2+ strikers (have ${st.length}).`
        );
        return;
    }

    const byOvrDesc = (a, b) => b.ovr - a.ovr;

    gk.sort(byOvrDesc);
    def.sort(byOvrDesc);
    mid.sort(byOvrDesc);
    st.sort(byOvrDesc);

    const lineup = {
        gk: gk[0].cardId,
        def1: def[0].cardId,
        def2: def[1].cardId,
        mid: mid[0].cardId,
        st1: st[0].cardId,
        st2: st[1].cardId
    };

    const total = gk[0].ovr + def[0].ovr + def[1].ovr + mid[0].ovr + st[0].ovr + st[1].ovr;
    const ovr = Math.round(total / 6);

    await saveLineup(userId, { ...lineup, ovr });

    const imageBuffer = await buildLineupImage(lineup);
    const media = new MessageMedia('image/png', imageBuffer.toString('base64'));

    await client.sendMessage(
        msg.from,
        media,
        {
            caption: `⚽ Team set up for @${userId.split('@')[0]}!\n⭕ Team OVR: *${ovr}*`,
            mentions: [userId]
        }
    );
}

module.exports = autosetup;