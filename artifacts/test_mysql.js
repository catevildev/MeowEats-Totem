const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://meoweats:meoweats@127.0.0.1:6010/meoweats');
  const [rows] = await conn.query('SELECT criado_em FROM pedidos ORDER BY id DESC LIMIT 1');
  console.log(rows[0].criado_em);
  console.log(rows[0].criado_em.toISOString());
  conn.end();
}
run();
