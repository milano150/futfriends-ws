const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const {
    PACKS_FOLDER,
    OWNER_ID,
    GK_POSITIONS,
    DEF_POSITIONS,
    MID_POSITIONS,
    ST_POSITIONS
} = require('../config');

const VALID_POSITIONS = [
    ...GK_POSITIONS,
    ...DEF_POSITIONS,
    ...MID_POSITIONS,
    ...ST_POSITIONS
];

const TMP_FOLDER = path.join(__dirname, '..', 'tmp');
const GENERATE_SCRIPT = path.join(__dirname, '..', 'cardgen', 'generate_card.py');
const OUTPUT_PACK = 'base';

const MIME_EXTENSIONS = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp'
};

function runPython(args) {
    return new Promise((resolve, reject) => {
        execFile('python', args, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function create(client, msg) {

    if (msg.author !== OWNER_ID) {
        return;
    }

    const parts = msg.body.trim().split(/\s+/);
    // parts[0] is "/create"
    const name = parts[1];
    const ovrRaw = parts[2];
    const position = parts[3];

    if (!name || !ovrRaw || !position) {
        await msg.reply('❌ Usage: send a photo with caption `/create <name> <ovr> <position>` e.g. `/create ronaldo 92 st`');
        return;
    }

    const ovr = parseInt(ovrRaw, 10);
    if (isNaN(ovr) || ovr < 1 || ovr > 99) {
        await msg.reply('❌ OVR must be a number between 1 and 99.');
        return;
    }

    const cleanPosition = position.toLowerCase();
    if (!VALID_POSITIONS.includes(cleanPosition)) {
        await msg.reply(`❌ Unknown position "${position}". Valid: ${VALID_POSITIONS.join(', ')}`);
        return;
    }

    if (!msg.hasMedia) {
        await msg.reply('❌ Attach a photo with the `/create` caption on it.');
        return;
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanName) {
        await msg.reply('❌ Name must contain at least one letter or number.');
        return;
    }

    await msg.reply('⚙️ Generating card...');

    fs.mkdirSync(TMP_FOLDER, { recursive: true });
    const outputFolder = path.join(PACKS_FOLDER, OUTPUT_PACK);
    fs.mkdirSync(outputFolder, { recursive: true });

    const media = await msg.downloadMedia();
    const ext = MIME_EXTENSIONS[media.mimetype] || '.png';
    const tempPhotoPath = path.join(TMP_FOLDER, `create_${Date.now()}${ext}`);
    fs.writeFileSync(tempPhotoPath, Buffer.from(media.data, 'base64'));

    const fileName = `${cleanName}${ovr}${cleanPosition}.png`;
    const outputPath = path.join(outputFolder, fileName);

    try {
        await runPython([
            GENERATE_SCRIPT,
            '--name', name,
            '--ovr', String(ovr),
            '--position', cleanPosition,
            '--photo', tempPhotoPath,
            '--output', outputPath
        ]);

        await client.sendMessage(
            msg.from,
            `✅ Card created: *${fileName}* (saved to "${OUTPUT_PACK}" pack)`
        );
    } catch (error) {
        console.error('Card generation failed:', error.message);
        await msg.reply('❌ Card generation failed. Check the bot console for details.');
    } finally {
        fs.unlink(tempPhotoPath, () => {});
    }
}

module.exports = create;