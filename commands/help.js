const HELP_TEXT =
`🃏 *CARD BOT COMMANDS*

▸ /open [pack] - open a pack you own for a random card
▸ /show [card] - show a card you already own
▸ /inv - view your packs and cards
▸ /claim - claim a spawned pack
▸ /daily - claim your free daily pack(s)
▸ /give [card or pack] @user - give a card or pack to someone
▸ /exchange [card] [card] [card] (or /exc) - trade 3 same-pack cards for the next tier's pack
▸ /autosetup - auto-build your best 2-1-2 lineup from your cards
▸ /lineup - view your current lineup as an image
▸ /team - view your current lineup as text (positions + OVR)
▸ /news - see the latest bot updates
▸ /help - show this message

_Owner only:_
▸ /spawn - drop a random pack into the group`;

async function showHelp(msg) {
    await msg.reply(HELP_TEXT);
}

module.exports = showHelp;