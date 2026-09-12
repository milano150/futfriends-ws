const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./cards.db');


db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY
        )
    `);
    db.run(`ALTER TABLE users ADD COLUMN last_daily INTEGER DEFAULT 0`, () => {});
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            user_id TEXT,
            card TEXT,
            PRIMARY KEY (user_id, card)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS packs (
            user_id TEXT,
            pack TEXT,
            quantity INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, pack)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS lineups (
            user_id TEXT PRIMARY KEY,
            gk TEXT,
            def1 TEXT,
            def2 TEXT,
            mid TEXT,
            st1 TEXT,
            st2 TEXT,
            ovr INTEGER
        )
    `);
});

const STARTER_PACK = 'base';
const STARTER_PACK_COUNT = 3;

// INSERT OR IGNORE tells us via `this.changes` whether a row was actually inserted.
function registerUser(userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR IGNORE INTO users (user_id) VALUES (?)`,
            [userId],
            function (error) {
                if (error) return reject(error);
                resolve(this.changes > 0); // true only if this user is brand new
            }
        );
    });
}

// Call this once per incoming message. Returns true if starter packs were granted.
function grantStarterPacksIfNew(userId) {
    return new Promise(async (resolve, reject) => {
        try {
            const isNew = await registerUser(userId);

            if (!isNew) return resolve(false);

            db.run(
                `INSERT INTO packs (user_id, pack, quantity)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id, pack)
                 DO UPDATE SET quantity = quantity + ?`,
                [userId, STARTER_PACK, STARTER_PACK_COUNT, STARTER_PACK_COUNT],
                error => error ? reject(error) : resolve(true)
            );
        } catch (error) {
            reject(error);
        }
    });
}

function ensureUser(userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR IGNORE INTO users (user_id) VALUES (?)`,
            [userId],
            error => error ? reject(error) : resolve()
        );
    });
}

function addCard(userId, card) {
    return new Promise(async (resolve, reject) => {

        try {
            await ensureUser(userId);

            db.run(
                `INSERT INTO inventory (user_id, card) VALUES (?, ?)`,
                [userId, card],
                error => error ? reject(error) : resolve()
            );

        } catch (error) {
            reject(error);
        }
    });
}

function ownsCard(userId, card) {
    return new Promise((resolve, reject) => {

        db.get(
            `SELECT * FROM inventory
             WHERE user_id = ? AND card = ?`,
            [userId, card],

            (error, row) => {
                if (error) reject(error);
                else resolve(!!row);
            }
        );

    });
}

function getInventory(userId) {
    return new Promise((resolve, reject) => {

        db.all(
            `SELECT card FROM inventory
             WHERE user_id = ?
             ORDER BY card`,
            [userId],

            (error, rows) => {
                if (error) reject(error);
                else resolve(rows.map(row => row.card));
            }
        );

    });
}

// Returns how many players currently own a copy of this exact card.
// Since a player can only ever hold one copy of a given card, showing it
// is always "1 of <total>" - e.g. total 1 means nobody else has it.
function getCardCirculation(card) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) AS total FROM inventory WHERE card = ?`,
            [card],
            (error, row) => {
                if (error) return reject(error);
                resolve(row.total);
            }
        );
    });
}

function removeCard(userId, card) {
    return new Promise(async (resolve, reject) => {
        try {
            await new Promise((res, rej) => {
                db.run(
                    `DELETE FROM inventory WHERE user_id = ? AND card = ?`,
                    [userId, card],
                    error => error ? rej(error) : res()
                );
            });

            // If this card is currently in the user's lineup, clear that slot
            // too so /lineup and /team don't keep pointing at a card they no
            // longer own.
            await new Promise((res, rej) => {
                db.run(
                    `UPDATE lineups SET
                        gk = CASE WHEN gk = ? THEN NULL ELSE gk END,
                        def1 = CASE WHEN def1 = ? THEN NULL ELSE def1 END,
                        def2 = CASE WHEN def2 = ? THEN NULL ELSE def2 END,
                        mid = CASE WHEN mid = ? THEN NULL ELSE mid END,
                        st1 = CASE WHEN st1 = ? THEN NULL ELSE st1 END,
                        st2 = CASE WHEN st2 = ? THEN NULL ELSE st2 END
                     WHERE user_id = ?`,
                    [card, card, card, card, card, card, userId],
                    error => error ? rej(error) : res()
                );
            });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function addPack(userId, pack) {
    return new Promise(async (resolve, reject) => {
        try {
            await ensureUser(userId);

            db.run(
                `INSERT INTO packs (user_id, pack, quantity)
                 VALUES (?, ?, 1)
                 ON CONFLICT(user_id, pack)
                 DO UPDATE SET quantity = quantity + 1`,
                [userId, pack],
                error => error ? reject(error) : resolve()
            );
        } catch (error) {
            reject(error);
        }
    });
}

// Returns true if a pack was actually removed, false if the user had none.
function removePack(userId, pack) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT quantity FROM packs WHERE user_id = ? AND pack = ?`,
            [userId, pack],
            (error, row) => {
                if (error) return reject(error);
                if (!row || row.quantity <= 0) return resolve(false);

                if (row.quantity === 1) {
                    db.run(
                        `DELETE FROM packs WHERE user_id = ? AND pack = ?`,
                        [userId, pack],
                        err => err ? reject(err) : resolve(true)
                    );
                } else {
                    db.run(
                        `UPDATE packs SET quantity = quantity - 1
                         WHERE user_id = ? AND pack = ?`,
                        [userId, pack],
                        err => err ? reject(err) : resolve(true)
                    );
                }
            }
        );
    });
}

function getPackCount(userId, pack) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT quantity FROM packs WHERE user_id = ? AND pack = ?`,
            [userId, pack],
            (error, row) => {
                if (error) reject(error);
                else resolve(row ? row.quantity : 0);
            }
        );
    });
}

function getPacks(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT pack, quantity FROM packs
             WHERE user_id = ? AND quantity > 0
             ORDER BY pack`,
            [userId],
            (error, rows) => {
                if (error) reject(error);
                else resolve(rows);
            }
        );
    });
}

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Returns { ready: true } or { ready: false, msRemaining }
function checkDaily(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT last_daily FROM users WHERE user_id = ?`,
            [userId],
            (error, row) => {
                if (error) return reject(error);

                const lastDaily = row ? row.last_daily : 0;
                const elapsed = Date.now() - lastDaily;

                if (elapsed >= DAILY_COOLDOWN_MS) {
                    resolve({ ready: true });
                } else {
                    resolve({ ready: false, msRemaining: DAILY_COOLDOWN_MS - elapsed });
                }
            }
        );
    });
}

function markDailyClaimed(userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE users SET last_daily = ? WHERE user_id = ?`,
            [Date.now(), userId],
            error => error ? reject(error) : resolve()
        );
    });
}

// lineup = { gk, def1, def2, mid, st1, st2, ovr } - card ids ("<pack>/<file>")
function saveLineup(userId, lineup) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO lineups (user_id, gk, def1, def2, mid, st1, st2, ovr)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
                gk = excluded.gk,
                def1 = excluded.def1,
                def2 = excluded.def2,
                mid = excluded.mid,
                st1 = excluded.st1,
                st2 = excluded.st2,
                ovr = excluded.ovr`,
            [userId, lineup.gk, lineup.def1, lineup.def2, lineup.mid, lineup.st1, lineup.st2, lineup.ovr],
            error => error ? reject(error) : resolve()
        );
    });
}

function getLineup(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT gk, def1, def2, mid, st1, st2, ovr FROM lineups WHERE user_id = ?`,
            [userId],
            (error, row) => {
                if (error) reject(error);
                else resolve(row || null);
            }
        );
    });
}

function getLeaderboard(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT user_id, ovr FROM lineups
             WHERE ovr IS NOT NULL
             ORDER BY ovr DESC
             LIMIT ?`,
            [limit],
            (error, rows) => {
                if (error) reject(error);
                else resolve(rows);
            }
        );
    });
}

module.exports = {
    addCard,
    ownsCard,
    getInventory,
    getCardCirculation,
    removeCard,
    addPack,
    removePack,
    getPackCount,
    getPacks,
    grantStarterPacksIfNew,
    checkDaily,
    markDailyClaimed,
    saveLineup,
    getLineup,
    getLeaderboard

};