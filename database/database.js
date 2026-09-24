const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "totem.db");

const db = new Database(databasePath);

// Ativa integridade das chaves estrangeiras
db.pragma("foreign_keys = ON");

// Cria as tabelas caso ainda não existam
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

// Garante que exista uma configuração inicial
db.prepare(`
    INSERT OR IGNORE INTO configuracoes (id, video)
    VALUES (1, NULL)
`).run();

module.exports = db;