const mysql = require('mysql');

// LOCAL
const db = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'verm'
});

// SERVER
// const db = mysql.createPool({
//     connectionLimit: 10,
//     host: 'localhost',
//     user: 'er-360-user',
//     password: 'Er-360-user@123',
//     database: 'er-360'
// });

db.getConnection((err, connection) => {
    if (err) console.log(err);
    connection.release();
    return;
})

module.exports = db;