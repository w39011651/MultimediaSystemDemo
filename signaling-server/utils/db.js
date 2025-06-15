const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '104.199.252.51',
  user: 'sql',
  password: 'password',
  database: 'chat_db'
});

function toMySQLDatetime(dateString) {
  const d = new Date(dateString);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  async saveMessage({ channelId, fromId, text, timestamp }) {
    try {
      await pool.query(
        'INSERT INTO messages (channel_id, from_id, text, timestamp) VALUES (?, ?, ?, ?)',
        [channelId, fromId, text, toMySQLDatetime(timestamp)]
      );
    } catch (err) {
      console.error('[db.saveMessage] error:', err);
    }
  },

  async getMessages(channelId){
    const sql = 'SELECT id, from_id AS fromID, channel_id as channelID, text, timestamp FROM messages WHERE channel_id = ? ORDER BY timestamp ASC';
    //const [rows] = await pool.query('SELECT * FROM messages ORDER BY id DESC LIMIT 5');
    const [rows] = await pool.execute(sql, [channelId]);
    console.log('Recent messages:', rows);
    return rows;
  }
};