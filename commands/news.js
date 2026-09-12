const NEWS_TEXT =
`📰 *LATEST UPDATES*

▸ Added /autosetup, /lineup and /team - build and view your best 6-a-side (2-1-2) squad based on card OVR
▸ Cards shown via /show and /open now send as stickers 
▸ /show now displays the owner's name and how many copies of that card are currently in circulation
▸ Added /daily - claim packs every 24h
▸ Added /give - send a card or pack directly to another player
▸ /exchange now supports: base → totw, totw → futurestars (nothing after futurestars for now lol)


_Last updated: 4 Sep 2026_`;

async function showNews(msg) {
    await msg.reply(NEWS_TEXT);
}

module.exports = showNews;