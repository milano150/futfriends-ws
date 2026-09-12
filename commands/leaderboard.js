const { getLeaderboard } = require('../database');

const MEDALS = ['🥇', '🥈', '🥉'];

async function leaderboard(client, msg) {

    const rows = await getLeaderboard(10);

    if (rows.length === 0) {
        await msg.reply('📉 No one has set up a team yet. Use /autosetup to be the first!');
        return;
    }

    const mentions = rows.map(row => row.user_id);

    const lines = rows.map((row, index) => {
        const rank = MEDALS[index] || `${index + 1}.`;
        return `${rank} @${row.user_id.split('@')[0]} — *${row.ovr}* OVR`;
    });

    const text = `🏆 *Top ${rows.length} Team${rows.length === 1 ? '' : 's'}*\n\n${lines.join('\n')}`;

    await client.sendMessage(msg.from, text, { mentions });
}

module.exports = leaderboard;