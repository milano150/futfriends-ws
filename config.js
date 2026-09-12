const path = require('path');
const fs = require('fs');

const PACKS_FOLDER = path.join(__dirname, 'assets', 'packs');
const LINEUP_TEMPLATE = path.join(__dirname, 'assets', 'lineup.png');

const OWNER_ID = '235652071333955@lid';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// Position codes grouped for the 6-a-side 2-1-2 formation.
const GK_POSITIONS = ['gk'];
const DEF_POSITIONS = ['cb', 'lb', 'rb','lwb','rwb'];
const MID_POSITIONS = ['cm', 'cam', 'cdm', 'lm', 'rm'];
const ST_POSITIONS = ['st', 'cf','lw','rw']; //lwb rwb cant be added yet

function getPackNames() {
    if (!fs.existsSync(PACKS_FOLDER)) return [];

    return fs.readdirSync(PACKS_FOLDER, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}

function getPackCards(packName) {
    const packPath = path.join(PACKS_FOLDER, packName);

    if (!fs.existsSync(packPath)) return [];

    return fs.readdirSync(packPath)
        .filter(file =>
            IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())
        );
}

// Parses "kohli61st.png" -> { name: 'kohli', ovr: 61, position: 'st' }.
// Returns null if the filename doesn't match the <name><ovr><position> pattern.
function parseCardMeta(cardFileName) {
    const base = path.parse(cardFileName).name;
    const match = base.match(/^(.*?)(\d+)([a-z]+)$/i);

    if (!match) return null;

    return {
        name: match[1],
        ovr: parseInt(match[2], 10),
        position: match[3].toLowerCase()
    };
}

module.exports = {
    PACKS_FOLDER,
    LINEUP_TEMPLATE,
    OWNER_ID,
    GK_POSITIONS,
    DEF_POSITIONS,
    MID_POSITIONS,
    ST_POSITIONS,
    getPackNames,
    getPackCards,
    parseCardMeta
};