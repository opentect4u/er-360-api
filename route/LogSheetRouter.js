const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const { convert } = require('html-to-text');

const LogsheetRouter = express.Router();

/////////////////////////////// FETCH MANUAL LOG DATA ///////////////////////////////////////
LogsheetRouter.get('/manuallog', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_activity',
        select = 'id, inc_id, act_by, DATE_FORMAT(act_at, "%d/%m/%Y %h:%i:%s %p") act_at_dt, act_at, act_type, activity',
        whr = id > 0 ? `id = ${id} AND act_type = "W"` : 'act_type = "W"';
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

/////////////////////////////// INSERT MANUAL LOG DATA ///////////////////////////////////////
LogsheetRouter.post('/manuallog', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'td_activity',
        fields = data.id > 0 ? `act_by = "${data.act_by}", act_at = "${data.act_at}", act_type = "${data.act_type}", activity = "${data.activity}"` :
            '(inc_id, act_by, act_at, act_type, activity)',
        values = `("${data.inc_id}", "${data.act_by}", "${data.act_at}", "${data.act_type}", "${data.activity}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt);
})

/////////////////////////////// DELETE MANUAL LOG ///////////////////////////////////////
LogsheetRouter.get('/manuallog_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'td_activity',
        whr = `id = ${data.id}`;    
    var dt = await F_Delete(table_name, whr);
    res.send(dt)
})

/////////////////////////////// FETCH AUTO LOG DATA ///////////////////////////////////////
LogsheetRouter.get('/get_autolog', async(req, res) => {
	var inc_id = req.query.inc_id,
		frm_dt = req.query.frm_dt,
		to_dt = req.query.to_dt;
	 var table_name = 'td_activity a, md_employee b',
        select = `a.id, a.inc_id, b.emp_name, DATE_FORMAT(a.act_at, "%d/%m/%Y %h:%i:%s %p") AS act_at, IF(a.act_type = 'C', 'Created', IF(a.act_type = 'M', 'Modified', 'Deleted')) AS act_type, a.activity`,
        whr = `a.act_by=b.email AND a.act_by != "admin@gmail.com" AND a.inc_id = ${inc_id} AND DATE(a.act_at) >= "${frm_dt}" AND DATE(a.act_at) <= "${to_dt}" AND act_type != 'W'`;
    var dt = await F_Select(select, table_name, whr, null),
		result = dt.msg;
	var body = '<body>';
	if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            body = body + '<div><p>' + result[i].emp_name + ' has ' + result[i].act_type + ' <b>' + result[i].activity + '</b> at '
            body = body + result[i].act_at + '</p></div>'
            body = body + '<hr>';
        }
    }
	body = body + '</body>';
    const body_text = convert(body, {
        wordwrap: 100
    });
    res.send({ suc: 1, msg: body_text });
})

/////////////////////////////// MANUAL LOG REPORT DATA ///////////////////////////////////////
LogsheetRouter.get('/get_manuallog', async(req, res) => {
	var inc_id = req.query.inc_id,
		frm_dt = req.query.frm_dt,
		to_dt = req.query.to_dt;
	 var table_name = 'td_activity a',
        select = `a.id, a.inc_id, a.act_by, DATE_FORMAT(a.act_at, "%d/%m/%Y %h:%i:%s %p") AS act_at, a.act_type, a.activity`,
        whr = `a.act_by != "admin@gmail.com" AND a.inc_id = ${inc_id} AND DATE(a.act_at) >= "${frm_dt}" AND DATE(a.act_at) <= "${to_dt}" AND act_type = 'W'`;
    var dt = await F_Select(select, table_name, whr, null),
		result = dt.msg;
	var body = '<body>';
	if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            body = body + '<div><p>' + result[i].act_by + ' has added <b>' + result[i].activity + '</b> at '
            body = body + result[i].act_at + '</p></div>'
            body = body + '<hr>';
        }
    }
	body = body + '</body>';
    const body_text = convert(body, {
        wordwrap: 100
    });
    res.send({ suc: 1, msg: body_text });
})

module.exports = {LogsheetRouter}