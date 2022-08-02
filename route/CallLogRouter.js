const express = require('express');
const { F_Insert, F_Select, CreateActivity } = require('../modules/MasterModule');
const dateFormat = require('dateformat');

const CallLogRouter = express.Router();

/////////////////////////////// INCIDENT BOARD ///////////////////////////////////////
CallLogRouter.get('/get_ref_no', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_call_log',
        select = 'IF(MAX(id) > 0, MAX(id)+1, 1) AS ref_no',
        whr = null;
    var dt = await F_Select(select, table_name, whr, null);
	var res_dt = '';
	if(dt.suc > 0 && inc_id){
		res_dt = {suc: 1, msg: inc_id + '-' + dt.msg[0].ref_no};
	}else{
		res_dt = dt;
	}
    res.send(res_dt);
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// LIVE LOG ///////////////////////////////////////
// FETCH 
CallLogRouter.get('/call_log', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_call_log',
        select = 'id, inc_id, ref_no, made_by, made_to, received_by, DATE_FORMAT(call_datetime, "%d/%m/%Y %h:%i:%s %p") AS call_datetime, call_datetime as call_dt, call_details',
        whr = id > 0 ? `id = ${id} AND delete_flag = 'N'` : `delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

CallLogRouter.post('/call_log', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'td_call_log',
        fields = data.id > 0 ? `ref_no = "${data.ref_no}", made_by = "${data.made_by}", made_to = "${data.made_to}", received_by = "${data.received_by}", call_datetime = "${data.call_datetime}", call_details = "${data.call_details}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(inc_id, ref_no, made_by, made_to, received_by, call_datetime, call_details, created_by, created_at)',
        values = `("${data.inc_id}", "${data.ref_no}", "${data.made_by}", "${data.made_to}", "${data.received_by}", "${data.call_datetime}", "${data.call_details}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `A Call Log Is ${flag_type} BY ${data.user} AT ${datetime}. RefNo ${data.ref_no}, Received By ${data.received_by}, Call time ${data.call_datetime} And Call Details - ${data.call_details}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag),
        res_dt = flag > 0 ? dt : { suc: dt.suc, msg: dt.msg };
    // dt.push({ inc_no })
    res.send(res_dt)
})

CallLogRouter.get('/call_log_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'td_call_log',
        fields = `delete_flag = 'Y', modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = 1,
        flag_type = 'DELETED';

    var select = 'ref_no',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `CallLog RefNO: ${select_dt.msg[0].ref_no} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

CallLogRouter.post('/approve_call_log', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'td_incident',
        fields = `approval_status = "${data.approval_status}", approved_by = "${data.user}", approved_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = 1,
        flag_type = 'APPROVED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `Incident ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
//////////////////////////////////////////////////////////////////////////////////

module.exports = {CallLogRouter}