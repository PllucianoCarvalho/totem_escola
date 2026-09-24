const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataPath = path.join(__dirname, "..", "dados");

fs.mkdirSync(dataPath, { recursive: true });
fs.mkdirSync(path.join(dataPath, "videos"), { recursive: true });

const databasePath = path.join(dataPath, "totem.db");

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        video TEXT
    );

    CREATE TABLE IF NOT EXISTS avisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mensagem TEXT NOT NULL,
        inicio TEXT NOT NULL,
        fim TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1
    );
`);

db.prepare(`
    INSERT OR IGNORE INTO configuracoes (id, video)
    VALUES (1, NULL)
`).run();

module.exports = db;