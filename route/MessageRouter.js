const express = require('express');
const { F_Insert, F_Select } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const MessageRouter = express.Router();

const db = require('../core/db')
const fs = require('fs')
const { convert } = require('html-to-text');
//var api_url = 'http://localhost:3000/';
var api_url = 'https://vermapi.opentech4u.co.in/';

/////////////////////////////// FETCH OLD MESSAGES ///////////////////////////////////////
MessageRouter.get('/oldMessage', async (req, res) => {
    var inc_id = req.query.id,
        min = req.query.min,
        max = req.query.max,
        table_name = 'td_chat a, md_employee b',
        //select = `a.inc_id, CONCAT(IF(DATE(NOW()) = DATE(a.chat_dt), 'Today', DATE_FORMAT(a.chat_dt, "%d/%m/%Y")), ' ', DATE_FORMAT(a.chat_dt, "%h:%i:%s %p")) as chat_dt, a.employee_id, a.chat, b.emp_name`,
        select = `a.inc_id, CONCAT(IF(DATE(NOW()) = DATE(a.chat_dt), 'Today', DATE_FORMAT(a.chat_dt, "%d/%m/%Y")), ' ', DATE_FORMAT(a.chat_dt, "%H:%i %p")) as chat_dt, a.employee_id, a.chat, b.emp_name, a.file, IF(a.file != '', 1, 0) file_flag`,
        whr = `a.employee_id=b.employee_id AND a.inc_id=${inc_id > 0 ? inc_id : 0}`,
        group = `ORDER BY a.id DESC LIMIT ${min}, ${max}`;
    var dt = await F_Select(select, table_name, whr, group);
    res.send(dt);
})

/////////////////////////////// FETCH CHAT LOG DATA FOR REPORT DOWNLOAD ///////////////////////////////////////
MessageRouter.get('/get_chat_log', async (req, res) => {
    var frm_dt = req.query.frm_dt,
        to_dt = req.query.to_dt,
        inc_id = req.query.inc_id;
    var body = '<body>';
    var table_name = 'td_chat a, md_employee b',
        select = `a.id, a.inc_id, CONCAT(IF(DATE(NOW()) = DATE(a.chat_dt), 'Today', DATE_FORMAT(a.chat_dt, "%d/%m/%Y")), ' ', DATE_FORMAT(a.chat_dt, "%h:%i:%s %p")) as chat_dt, a.employee_id, a.chat, b.emp_name, a.file, IF(a.file != '', 1, 0) file_flag`,
        whr = `a.employee_id=b.employee_id AND a.inc_id = ${inc_id} AND DATE(a.chat_dt) >= "${frm_dt}" AND DATE(a.chat_dt) <= "${to_dt}"`,
        order = 'ORDER BY a.id',
        dt = await F_Select(select, table_name, whr, order),
        result = dt.msg;
    //var sql = `SELECT a.id, a.inc_id, CONCAT(IF(DATE(NOW()) = DATE(a.chat_dt), 'Today', DATE_FORMAT(a.chat_dt, "%d/%m/%Y")), ' ', DATE_FORMAT(a.chat_dt, "%h:%i:%s %p")) as chat_dt, a.employee_id, a.chat, b.emp_name, a.file, IF(a.file != '', 1, 0) file_flag FROM td_chat a, md_employee b WHERE a.employee_id=b.employee_id AND a.inc_id = ${inc_id} AND DATE(a.chat_dt) >= "${frm_dt}" AND DATE(a.chat_dt) <= "${to_dt}" ORDER BY a.id`;
    // db.query(sql, (err, result) => {
    //     if (err) { console.log(err); }
    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            body = body + '<div><label>' + result[i].emp_name + ' <small><i>' + result[i].chat_dt + '</i></small>:</label></div>'
            body = body + '<div>' + result[i].chat + '</div>'
            if (result[i].file_flag > 0) {
                body = body + '<div><a href="' + api_url + 'uploads/' + result[i].file + '">' + result[i].file + '</a></div>'
            }
            body = body + '<hr>';
        }
    }
    body = body + '</body>';
    const body_text = convert(body, {
        wordwrap: 100
    });
    //fs.appendFileSync('test.txt', body_text)
    res.send({ suc: 1, msg: body_text })
    //})
})


module.exports = { MessageRouter }