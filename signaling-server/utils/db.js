const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../chat.db'));

// 建立訊息表格
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channelId TEXT,
      fromId TEXT,
      text TEXT,
      timestamp TEXT
    )
  `);
});

function saveMessage({ channelId, fromId, text, timestamp }) {
  db.run(
    `INSERT INTO messages (channelId, fromId, text, timestamp) VALUES (?, ?, ?, ?)`,
    [channelId, fromId, text, timestamp]
  );
}

function getMessages(channelId, callback) {
  db.all(
    `SELECT * FROM messages WHERE channelId = ? ORDER BY id ASC`,
    [channelId],
    (err, rows) => {
      callback(err, rows);
    }
  );
}

module.exports = { saveMessage, getMessages };