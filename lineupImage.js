const path = require('path');
const sharp = require('sharp');

const { PACKS_FOLDER, LINEUP_TEMPLATE } = require('./config');

const CARD_WIDTH = 180;
const CARD_HEIGHT = 230;

const POSITIONS = {
    st1:  { top: 0,   left: 340 },
    st2:  { top: 0,   left: 680 },
    mid:  { top: 140, left: 510 },
    def1: { top: 280, left: 290 },
    def2: { top: 280, left: 730 },
    gk:   { top: 430, left: 510 }
};

const PFP_SIZE = 110;
const PFP_POSITION = { top: 20, left: 20 };

// Crops a square avatar buffer into a circle so it doesn't sit on the
// pitch as a plain rectangle.
async function buildCircularAvatar(pfpBuffer) {
    const circleMask = Buffer.from(
        `<svg width="${PFP_SIZE}" height="${PFP_SIZE}">
            <circle cx="${PFP_SIZE / 2}" cy="${PFP_SIZE / 2}" r="${PFP_SIZE / 2}" fill="#fff"/>
        </svg>`
    );

    return sharp(pfpBuffer)
        .resize(PFP_SIZE, PFP_SIZE, { fit: 'cover' })
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer();
}

// lineup = { gk, def1, def2, mid, st1, st2 } - each a card id ("<pack>/<file>")
// pfpBuffer (optional) = raw image buffer of the manager's WhatsApp pfp.
// Returns a Buffer (PNG) of the composed image.
async function buildLineupImage(lineup, pfpBuffer) {
    const overlays = [];

    for (const slot of Object.keys(POSITIONS)) {
        const cardId = lineup[slot];
        if (!cardId) continue;

        const pos = POSITIONS[slot];

        const thumb = await sharp(path.join(PACKS_FOLDER, cardId))
            .resize(CARD_WIDTH, CARD_HEIGHT)
            .toBuffer();

        overlays.push({
            input: thumb,
            top: pos.top,
            left: pos.left
        });
    }

    if (pfpBuffer) {
        try {
            const avatar = await buildCircularAvatar(pfpBuffer);
            overlays.push({
                input: avatar,
                top: PFP_POSITION.top,
                left: PFP_POSITION.left
            });
        } catch (error) {
            console.log('Could not composite profile picture:', error.message);
        }
    }

    return sharp(LINEUP_TEMPLATE)
        .composite(overlays)
        .png()
        .toBuffer();
}

module.exports = { buildLineupImage };