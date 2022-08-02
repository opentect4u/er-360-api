const express = require('express');
const { F_Insert, F_Select, CreateActivity } = require('../modules/MasterModule');
const { ResetPasswordEmail } = require('../modules/EmailModule');
const dateFormat = require('dateformat');
const bcrypt = require('bcrypt');
const Buffer = require('buffer').Buffer;
const UserRouter = express.Router();

UserRouter.post('/update_info_admin', async (req, res) => {
	var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var data = req.body;
	var table_name = 'md_employee',
		fields = `emp_name = "${data.emp_name}", personal_cnct_no = "${data.per_cnct_no}", er_cnct_no = "${data.er_cnct_no}", modified_by = "${data.user}", modified_at = "${datetime}"`,
		whr = `employee_id = ${data.emp_id}`,
		flag = 1,
		flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

	var user_id = data.user,
		act_type = flag > 0 ? 'M' : 'C',
		activity = `An Employee, ${data.emp_name} has changed his personal informations AT ${datetime}`;
	var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

	var dt = await F_Insert(table_name, fields, null, whr, flag),
		res_dt = flag > 0 ? dt : { suc: dt.suc, msg: dt.msg, inc_no };
	// dt.push({ inc_no })
	res.send(res_dt)
})

UserRouter.post('/reset_pass', async (req, res) => {
	var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var res_dt = '';
	var data = req.body,
		table_name = 'md_employee',
		select = 'id, employee_id, emp_name, password',
		whr = `employee_id = "${data.emp_id}" AND emp_status = "A"`;
	var dt = await F_Select(select, table_name, whr, null);
	var db_pass = dt.msg[0].password;
	if (await bcrypt.compare(data.old_pass, db_pass)) {
		var pass = bcrypt.hashSync(data.pass, 10);
		var fields = `password = "${pass}", modified_by = "${data.user}", modified_at = "${datetime}"`,
			values = null,
			flag = 1;
		var insert_dt = await F_Insert(table_name, fields, values, whr, flag);
		if (insert_dt.suc == 1) {
			res_dt = { suc: 1, msg: "Password Has Changed Successfully!!" };
			var user_id = data.user,
				act_type = flag > 0 ? 'M' : 'C',
				activity = `An Employee, ${dt.msg[0].emp_name} has changed his password AT ${datetime}`;
			var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
		} else {
			res_dt = insert_dt;
		}
	} else {
		res_dt = { suc: 2, msg: "Please Enter Your Correct Old Password!!" };
	}
	res.send(res_dt);
})

UserRouter.post('/update_info_user', async (req, res) => {
	var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var data = req.body;
	var table_name = 'md_employee',
		fields = `emp_name = "${data.emp_name}", emp_depart_id = "${data.depart_id}", emp_pos_id = "${data.pos_id}", personal_cnct_no = "${data.per_cnct_no}", er_cnct_no = "${data.er_cnct_no}", modified_by = "${data.user}", modified_at = "${datetime}"`,
		whr = `employee_id = ${data.emp_id}`,
		flag = 1,
		flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

	var user_id = data.user,
		act_type = flag > 0 ? 'M' : 'C',
		activity = `An Employee, ${data.emp_name} has changed his personal informations AT ${datetime}`;
	var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

	var dt = await F_Insert(table_name, fields, null, whr, flag),
		res_dt = flag > 0 ? dt : { suc: dt.suc, msg: dt.msg, inc_no };
	// dt.push({ inc_no })
	res.send(res_dt)
})

UserRouter.post('/update_user_status', async (req, res) => {
	var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var data = req.body;
	var table_name = 'md_employee',
		fields = `user_status = "${data.user_status}", modified_by = "${data.user}", modified_at = "${datetime}"`,
		whr = `employee_id = ${data.emp_id}`,
		flag = 1,
		flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

	var user_id = data.user,
		act_type = flag > 0 ? 'M' : 'C',
		activity = `An Employee, ${data.emp_name} has changed his activity status AT ${datetime}`;
	var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

	var dt = await F_Insert(table_name, fields, null, whr, flag),
		res_dt = flag > 0 ? dt : { suc: dt.suc, msg: dt.msg, inc_no };
	// dt.push({ inc_no })
	res.send(res_dt)
})

UserRouter.post('/reset_password', async (req, res) => {
	var email = req.body.email,
		flag = req.body.flag,
		table_name = 'md_employee',
		select = `id, emp_name`,
		whr = `email="${email}"`;
	var dt = await F_Select(select, table_name, whr, null);
	var user_name = dt.msg[0].emp_name;
	var str = dt.msg[0].id + '/' + user_name;
	var en_dt = Buffer.from(str).toString('base64');
	var email = await ResetPasswordEmail(email, user_name, en_dt, flag);
	res.send(email);
})

UserRouter.post('/update_pass', async (req, res) => {
	var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var res_dt = '';
	var data = req.body;
	var en_dt = data.en_dt;
	var str = Buffer.from(en_dt, 'base64').toString('ascii'),
		de_dt = str.split('/'),
		id = de_dt[0],
		email = de_dt[1];

	var table_name = 'md_employee',
		select = 'id, emp_name, password',
		whr = `id = "${id}"`;
	var dt = await F_Select(select, table_name, whr, null);
	var pass = bcrypt.hashSync(data.password, 10);
	var fields = `password = "${pass}", modified_by = "${dt.msg[0].emp_name}", modified_at = "${datetime}"`,
		values = null,
		flag = 1;
	var insert_dt = await F_Insert(table_name, fields, values, whr, flag);
	if (insert_dt.suc == 1) {
		res_dt = { suc: 1, msg: "Password Has Changed Successfully!!" };
		var user_id = data.user,
			act_type = flag > 0 ? 'M' : 'C',
			activity = `An Employee, ${dt.msg[0].emp_name} has changed his password AT ${datetime}`;
		var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
	} else {
		res_dt = insert_dt;
	}
	res.send(res_dt);
})

UserRouter.post('/post_notification', async (req, res) => {
	var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var data = req.body;
	var adm_flag = data.activity == 'F' && data.activity == 'AT' && data.activity == 'TR' ? 'N' : 'Y';
	var id = req.query.id,
		table_name = 'td_activation a, td_team_members b, md_employee c',
		select = 'a.id, a.inc_id, b.team_id, b.emp_id, c.employee_id, c.user_type',
		whr = `a.team_id=b.team_id AND b.emp_id=c.id AND a.active_flag='Y'`,
		group = `GROUP BY b.team_id, b.emp_id`;
	var dt = await F_Select(select, table_name, whr, group);
	var id = data.id;
	var res_dt = '';
	if (id > 0) {
		var i_table_name = 'td_notification',
			i_fields = `view_flag="${data.view_flag}"`,
			i_values = null,
			i_flag = 1,
			i_whr = `id= "${id}"`;
		var insert_dt = await F_Insert(i_table_name, i_fields, i_values, i_whr, i_flag);
		res_dt = insert_dt;
	} else {
		if (dt.msg.length > 0) {
			if (adm_flag != 'N') {
				dt.msg.push({ id: dt.msg[0].id, inc_id: dt.msg[0].inc_id, emp_id: 1, employee_id: 1, user_type: 'A' })
			}
			for (let i = 0; i < dt.msg.length; i++) {
				var i_table_name = 'td_notification',
					i_fields = `(inc_no, narration, view_flag, admin, user, activity, created_at)`,
					i_values = `("${data.inc_no}", "${data.narration}", "${data.view_flag}", "${adm_flag}", "${dt.msg[i].employee_id}", "${data.activity}", "${datetime}")`,
					i_flag = 0,
					i_whr = null;
				var insert_dt = await F_Insert(i_table_name, i_fields, i_values, i_whr, i_flag);
			}
			res_dt = { suc: 1, msg: "Inserted Successfully!!" };
		} else {
			var emp_select = `id, employee_id`,
				emp_from = `md_employee`,
				emp_whr = `emp_status = 'A' AND approval_flag = 'Y'`,
				emp_order = null;
			var emp_dt = await F_Select(emp_select, emp_from, emp_whr, emp_order)
			if (emp_dt.msg.length > 0) {
				for (let emp of emp_dt.msg) {
					var i_table_name = 'td_notification',
						i_fields = `(inc_no, narration, view_flag, admin, user, activity, created_at)`,
						i_values = `("${data.inc_no}", "${data.narration}", "${data.view_flag}", "${adm_flag}", "${emp.employee_id}", "${data.activity}", "${datetime}")`,
						i_flag = 0,
						i_whr = null;
					var insert_dt = await F_Insert(i_table_name, i_fields, i_values, i_whr, i_flag);
				}
			}
			res_dt = { suc: 1, msg: "Inserted Successfully!!" };
			// res_dt = { suc: 0, msg: "No User Found" };
		}
	}
	res.send(dt);
})

UserRouter.get('/notification', async (req, res) => {
	var data = req.query
	var limit = data.limit
	var select = `*`,
		table_name = `td_notification`,
		whr = data.emp_code > 1 ? `view_flag = 'N' AND user = ${data.emp_code}` : `view_flag = 'N' AND admin = 'Y'`,
		order = data.emp_code > 1 ? `ORDER BY id DESC ${limit > 0 ? 'LIMIT ' + limit : ''}` : `GROUP BY TIME(created_at), activity ORDER BY id DESC ${limit > 0 ? 'LIMIT ' + limit : ''}`;
	var res_dt = await F_Select(select, table_name, whr, order)
	res.send(res_dt)
})

UserRouter.post('/notification', async (req, res) => {
	var data = req.body
	var table_name = 'td_notification',
		fields = `view_flag = 'Y'`,
		values = null,
		whr = `id = ${data.id}`,
		flag = 1;
	var res_dt = await F_Insert(table_name, fields, values, whr, flag)
	res.send(res_dt)
})

module.exports = { UserRouter }