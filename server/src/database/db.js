const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const logger = require('../utils/logger');

let db = null;

function normalizeArgs(args) {
  if (!args || args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

if (env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN) {
  logger.info(`Database: Connecting to Turso Cloud LibSQL (${env.TURSO_DATABASE_URL})`);
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  });

  db = {
    isTurso: true,
    client,
    async get(sql, ...args) {
      const flat = normalizeArgs(args);
      const rs = await client.execute({ sql, args: flat });
      return rs.rows[0] || undefined;
    },
    async all(sql, ...args) {
      const flat = normalizeArgs(args);
      const rs = await client.execute({ sql, args: flat });
      return rs.rows || [];
    },
    async run(sql, ...args) {
      const flat = normalizeArgs(args);
      const rs = await client.execute({ sql, args: flat });
      return {
        lastInsertRowid: rs.lastInsertRowid !== undefined && rs.lastInsertRowid !== null ? Number(rs.lastInsertRowid) : null,
        changes: rs.rowsAffected || 0
      };
    },
    async exec(sql) {
      return client.executeMultiple(sql);
    },
    prepare(sql) {
      return {
        get: async (...args) => {
          const flat = normalizeArgs(args);
          const rs = await client.execute({ sql, args: flat });
          return rs.rows[0] || undefined;
        },
        all: async (...args) => {
          const flat = normalizeArgs(args);
          const rs = await client.execute({ sql, args: flat });
          return rs.rows || [];
        },
        run: async (...args) => {
          const flat = normalizeArgs(args);
          const rs = await client.execute({ sql, args: flat });
          return {
            lastInsertRowid: rs.lastInsertRowid !== undefined && rs.lastInsertRowid !== null ? Number(rs.lastInsertRowid) : null,
            changes: rs.rowsAffected || 0
          };
        }
      };
    }
  };
} else {
  // Local SQLite fallback
  const dir = path.dirname(env.DATABASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(env.DATABASE_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  logger.info(`Database: Using local SQLite at ${env.DATABASE_PATH}`);

  db = {
    isTurso: false,
    sqlite,
    async get(sql, ...args) {
      const flat = normalizeArgs(args);
      return sqlite.prepare(sql).get(...flat);
    },
    async all(sql, ...args) {
      const flat = normalizeArgs(args);
      return sqlite.prepare(sql).all(...flat);
    },
    async run(sql, ...args) {
      const flat = normalizeArgs(args);
      return sqlite.prepare(sql).run(...flat);
    },
    async exec(sql) {
      return sqlite.exec(sql);
    },
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      return {
        get: async (...args) => {
          const flat = normalizeArgs(args);
          return stmt.get(...flat);
        },
        all: async (...args) => {
          const flat = normalizeArgs(args);
          return stmt.all(...flat);
        },
        run: async (...args) => {
          const flat = normalizeArgs(args);
          return stmt.run(...flat);
        }
      };
    }
  };
}

module.exports = db;
