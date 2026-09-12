const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');

const qrcode = require('qrcode-terminal');

const { OWNER_ID } = require('./config');

const spawnCard = require('./commands/spawn');
const claimCard = require('./commands/claim');
const showInventory = require('./commands/inventory');
const openPack = require('./commands/open');
const showCard = require('./commands/show');
const exchangeCards = require('./commands/exchange');
const showHelp = require('./commands/help');
const showNews = require('./commands/news');
const { grantStarterPacksIfNew } = require('./database');
const giveItem = require('./commands/give');
const claimDaily = require('./commands/daily');
const autosetup = require('./commands/autosetup');
const showLineup = require('./commands/lineup');
const showTeam = require('./commands/team');
const showLeaderboard = require('./commands/leaderboard');
const createCard = require('./commands/create');

const client = new Client({
    authStrategy: new LocalAuth()
});

const activeSpawns = {};

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('==============================');
    console.log('WhatsApp card bot is ready!');
    console.log('==============================');
});

client.on('message', async msg => {

    try {

        if (msg.fromMe) return;

        if (!msg.from.endsWith('@g.us')) return;

        await grantStarterPacksIfNew(msg.author);

        const parts = msg.body.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        if (command === '/spawn') {

            console.log('SPAWN COMMAND RECEIVED');
            console.log('Author:', msg.author);
            console.log('Owner:', OWNER_ID);

            if (msg.author !== OWNER_ID) {
                console.log('NOT OWNER');
                return;
            }

            console.log('OWNER VERIFIED');

            await spawnCard(client, msg, activeSpawns);

            return;
        }

        if (command === '/claim') {
            await claimCard(client, msg, activeSpawns);
            return;
        }

        if (command === '/inv') {
            await showInventory(msg);
            return;
        }

        if (command === '/open') {
            await openPack(client, msg, arg);
            return;
        }

        if (command === '/show') {
            await showCard(client, msg, arg);
            return;
        }
        if (command === '/exchange' || command === '/exc') {
            await exchangeCards(client, msg, arg);
            return;
        }
        if (command === '/help') {
            await showHelp(msg);
            return;
        }

        if (command === '/news') {
            await showNews(msg);
            return;
        }
        if (command === '/give') {
            await giveItem(client, msg, arg);
            return;
        }
        if (command === '/daily') {
            await claimDaily(client, msg);
            return;
        }
        if (command === '/autosetup') {
            await autosetup(client, msg);
            return;
        }
        if (command === '/lineup') {
            await showLineup(client, msg);
            return;
        }
        if (command === '/team') {
            await showTeam(client, msg);
            return;
        }
        if (command === '/leaderboard' || command === '/lb') {
            await showLeaderboard(client, msg);
            return;
        }
        if (command === '/create') {
            await createCard(client, msg);
            return;
        }

    } catch (error) {
        console.error('Message error:', error);
    }

});

client.initialize();