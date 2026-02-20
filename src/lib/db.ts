import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'rehabvet.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs')
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // One-time bootstrap: create an initial admin user in production if DB has no users.
    // Controlled via env vars so we never hardcode credentials.
    try {
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get() as any
      if (row) {
        const countRow = db.prepare('SELECT COUNT(*) as c FROM users').get() as any
        const count = Number(countRow?.c || 0)

        const email = process.env.BOOTSTRAP_ADMIN_EMAIL
        const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
        const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Admin'

        if (count === 0 && email && password) {
          const { v4: uuidv4 } = require('uuid')
          const bcrypt = require('bcryptjs')
          const id = uuidv4()
          const hash = bcrypt.hashSync(password, 10)
          db.prepare('INSERT INTO users (id, email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)')
            .run(id, email, name, 'admin', hash)
          console.log(`✅ Bootstrapped admin user: ${email}`)
        }
      }
    } catch (e) {
      // Don't block app start if bootstrap fails.
      console.warn('Bootstrap admin skipped/failed:', (e as any)?.message || e)
    }
  }
  return db
}
