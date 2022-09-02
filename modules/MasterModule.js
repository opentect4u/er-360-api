const db = require('../core/db');
const dateFormat = require('dateformat');
require('dotenv').config();
const Vonage = require('@vonage/server-sdk')
const path = require('path')

const F_Select = (select, table_name, whr, order) => {
    var tb_whr = whr ? `WHERE ${whr}` : '';
    var tb_order = order ? order : '';
    let sql = `SELECT ${select} FROM ${table_name} ${tb_whr} ${tb_order}`;
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                data = { suc: 0, msg: JSON.stringify(err) };
            } else {
                data = { suc: 1, msg: result };
            }
            resolve(data)
        })
    })
}

const F_Insert = (table_name, fields, values, whr, flag) => {
    var sql = '',
        msg = '',
        tb_whr = whr ? `WHERE ${whr}` : '';
    // 0 -> INSERT; 1 -> UPDATE
    // IN INSERT flieds ARE TABLE COLOUMN NAME ONLY || IN UPDATE fields ARE TABLE NAME = VALUES
    if (flag > 0) {
        sql = `UPDATE ${table_name} SET ${fields} ${tb_whr}`;
        msg = 'Updated Successfully !!'
    } else {
        sql = `INSERT INTO ${table_name} ${fields} VALUES ${values}`;
        msg = 'Inserted Successfully !!';
    }
    return new Promise((resolve, reject) => {
        db.query(sql, (err, lastId) => {
            if (err) {
                console.log(err);
                data = { suc: 0, msg: JSON.stringify(err) };
            } else {
                data = { suc: 1, msg: msg, lastId };
            }
            resolve(data)
        })
    })
}

const F_Delete = (table_name, whr) => {
    whr = whr ? `WHERE ${whr}` : '';
    var sql = `DELETE FROM ${table_name} ${whr}`;
    return new Promise((resolve, reject) => {
        db.query(sql, (err, lastId) => {
            if (err) {
                console.log(err);
                data = { suc: 0, msg: JSON.stringify(err) };
            } else {
                data = { suc: 1, msg: 'Deleted Successfully !!' };
            }
            resolve(data)
        })
    })
}

const F_Check = async (fields, table_name, whr) => {
    var sql = `SELECT ${fields} FROM ${table_name} WHERE ${whr}`;
    console.log(sql);
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                data = { suc: 0, msg: JSON.stringify(err) };
            } else {
                data = { suc: 1, msg: result.length };
            }
            resolve(data)
        })
    })
}

const CreateActivity = async (user_id, datetime, act_type, activity, inc_id) => {
    var incident_id = inc_id > 0 ? inc_id : 0;
    var sql = `INSERT INTO td_activity (inc_id, act_by, act_at, act_type, activity) VALUES("${incident_id}", "${user_id}", "${datetime}", "${act_type}", "${activity}")`;
    return new Promise((resolve, reject) => {
        db.query(sql, (err, lastId) => {
            if (err) {
                console.log(err);
                data = { suc: 0, msg: JSON.stringify(err) };
            } else {
                data = { suc: 1, msg: 'Success !!' };
            }
            resolve(data)
        })
    })
}

const GetIncNo = async () => {
    var curr_year = dateFormat(new Date(), "yyyy");
    let sql = `SELECT (IF(MAX(id), MAX(id), 0) +1) as last_id FROM td_incident`;

    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                data = false;
            } else {
                data = curr_year + result[0].last_id;
            }
            resolve(data)
        })
    })
}

const MakeCall = async (emp_id, inc_name) => {
    var table_name = `md_employee`,
        select = `id, emp_id, emp_name, p_code, personal_cnct_no, er_code, er_cnct_no, user_type`,
        whr = `id = ${emp_id}`,
        order = null;
    var result = await F_Select(select, table_name, whr, order)
    return new Promise((resolve, reject) => {
        if (result.suc > 0) {
            var message = result.msg[0].user_type == 'I' || result.msg[0].user_type == 'A' ? `An incident ${inc_name} has been occurred. You are assigned for this incident.` : `An incident ${inc_name} has been occurred. You are assigned for this incident. Please contact to your INCIDENT COMMANDER`
            const vonage = new Vonage({
                apiKey: process.env.VONAGE_API_KEY,
                apiSecret: process.env.VONAGE_API_SECRET,
                applicationId: process.env.VONAGE_APPLICATION_ID,
                privateKey: path.join(__dirname, process.env.VONAGE_APPLICATION_PRIVATE_KEY_PATH)
            })

            vonage.calls.create({
                to: [{
                    type: 'phone',
                    number: `"${result.msg[0].p_code}${result.msg[0].personal_cnct_no}"`
                }],
                from: {
                    type: 'phone',
                    number: process.env.VONAGE_NUMBER
                },
                ncco: [{
                    "action": "talk",
                    "text": message
                }]
            }, (error, response) => {
                if (error) { console.error(error); resolve(error) }
                if (response) { console.log(response); resolve(response) }
            })
        }
    })
}

const SendMessage = async (emp_id, inc_name) => {
    var table_name = `md_employee`,
        select = `id, emp_id, emp_name, p_code, personal_cnct_no, er_code, er_cnct_no, user_type`,
        whr = `id = ${emp_id}`,
        order = null;
    var result = await F_Select(select, table_name, whr, order)
    return new Promise((resolve, reject) => {
        if (result.suc > 0) {
            const vonage = new Vonage({
                apiKey: process.env.VONAGE_API_KEY,
                apiSecret: process.env.VONAGE_API_SECRET
            })

            const from = process.env.VONAGE_NUMBER
            const to = `"${result.msg[0].p_code}${result.msg[0].personal_cnct_no}"`
            const text = result.msg[0].user_type == 'I' || result.msg[0].user_type == 'A' ? `An incident ${inc_name} has been occurred. You are assigned for this incident.` : `An incident ${inc_name} has been occurred. You are assigned for this incident. Please contact to your INCIDENT COMMANDER`

            vonage.message.sendSms(from, to, text, (err, responseData) => {
                if (err) {
                    console.log(err);
                    reject(err)
                } else {
                    if (responseData.messages[0]['status'] === "0") {
                        console.log("Message sent successfully.");
                        let msg = { msg: "Message sent successfully.", responseData }
                        resolve(msg)
                    } else {
                        console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
                        let msg = { msg: `Message failed with error: ${responseData.messages[0]['error-text']}`, responseData }
                        resolve(msg)
                    }
                }
            })
        }
    })
}

module.exports = { F_Select, F_Insert, F_Delete, F_Check, CreateActivity, GetIncNo, MakeCall, SendMessage }