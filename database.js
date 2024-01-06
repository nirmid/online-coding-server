const { Pool } = require('pg');

const pool = new Pool ({
    user: "postgres",
    password: "qwe123",
    host: "localhost",
    port: 5432,
    database: "online_coding"
});

module.exports = pool;