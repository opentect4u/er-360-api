const express = require('express');
const { F_Insert, F_Select } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const bcrypt = require('bcrypt');
const LoginRouter = express.Router();

/////////////////////////////// ADMIN LOGIN ///////////////////////////////////////
LoginRouter.post('/admin_login', async (req, res) => {
    var res_dt = '';
    var data = req.body,
        table_name = 'md_employee',
        select = 'id, employee_id, emp_name, emp_depart_id, emp_pos_id, email, password, personal_cnct_no, er_cnct_no, user_type, emp_status, first_login',
        whr = `email = "${data.email}" AND emp_status = "A" AND user_type = "A"`;
    var dt = await F_Select(select, table_name, whr, null);
    if (dt.msg.length > 0) {
        var db_pass = dt.msg[0].password;
        if (await bcrypt.compare(data.password, db_pass)) {
            var status = 'Login';
            var userUpdate = await UpdateUserStatus(dt.msg[0].employee_id, data.email, 'L');
            if (await UpdateUserLog(data.email, status)) {
                res_dt = { suc: 1, msg: dt.msg };
            } else {
                res_dt = { suc: 0, msg: "Something Went Wrong" }
            }

        } else {
            res_dt = { suc: 0, msg: "Please Check Your User ID or Password" };
        }
    } else {
        res_dt = { suc: 0, msg: "User Does Not Exist" }
    }
    res.send(res_dt)
})

/////////////////////////////// USER LOGIN ///////////////////////////////////////
LoginRouter.post('/login', async (req, res) => {
    var res_dt = '';
    var data = req.body,
        table_name = 'md_employee',
        select = 'id, employee_id, emp_name, emp_depart_id, emp_pos_id, email, password, personal_cnct_no, er_cnct_no, user_type, emp_status, first_login, approval_flag',
        whr = `email = "${data.email}" AND emp_status = "A"`;
    var dt = await F_Select(select, table_name, whr, null);
    if (dt.msg.length > 0) {
        var db_pass = dt.msg[0].password;
        if (await bcrypt.compare(data.password, db_pass)) {
            var status = 'Login';
            var userUpdate = await UpdateUserStatus(dt.msg[0].employee_id, data.email, 'L');
            if (await UpdateUserLog(data.email, status)) {
                var ac_table_name = 'td_team_members a LEFT JOIN td_activation b ON a.team_id=b.team_id',
                    ac_select = 'COUNT(a.id) as active_flag',
                    ac_whr = `a.emp_id = ${dt.msg[0].id} AND (((SELECT c.from_date FROM td_team_log c WHERE c.team_id=b.team_id ORDER BY c.id DESC LIMIT 1) <= date(now()) AND (SELECT c.to_date FROM td_team_log c WHERE c.team_id=b.team_id ORDER BY c.id DESC LIMIT 1) >= date(now())) OR b.active_flag = 'Y')`;
                var ac_dt = await F_Select(ac_select, ac_table_name, ac_whr, null);
                res_dt = { suc: 1, msg: dt.msg, active_flag: ac_dt.msg[0].active_flag };
            } else {
                res_dt = { suc: 0, msg: "Something Went Wrong" }
            }

        } else {
            res_dt = { suc: 0, msg: "Please Check Your User ID or Password" };
        }
    } else {
        res_dt = { suc: 0, msg: "User Does Not Exist" }
    }
    res.send(res_dt)
})

/////////////////////////////// LOGOUT ///////////////////////////////////////
LoginRouter.post('/log_out', async (req, res) => {
    var data = req.body,
        id = data.id,
        user = data.user,
        status = 'O';
    var dt = await UpdateUserStatus(id, user, status);
    res.send(dt);
})

/////////////////////////////// AFTER LOGIN/LOGOUT CHANGE USER STATUS ///////////////////////////////////////
const UpdateUserStatus = async (id, user, status) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var table_name = 'md_employee',
        fields = `user_status = "${status}", modified_by = "${user}", modified_at = "${datetime}"`,
        values = null,
        whr = `employee_id = ${id}`,
        flag = 1;
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    return new Promise((resolve, reject) => {
        resolve(dt);
    })
}

/////////////////////////////// STORE USER STATUS RECORDS ///////////////////////////////////////
const UpdateUserLog = async (user_id, log_status) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var table_name = 'td_user_log',
        fields = '(user_id, date_time, log_status)',
        values = `("${user_id}", "${datetime}", "${log_status}")`,
        whr = null,
        flag = 0;
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    return new Promise((resolve, reject) => {
        resolve(dt);
    })
}

/////////////////////////////// FIRST TIME LOGIN CHANGE PASSWORD ///////////////////////////////////////
LoginRouter.post('/first_change_pass', async (req, res) => {
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
        var fields = `password = "${pass}", first_login = 1, modified_by = "${data.user}", modified_at = "${datetime}"`,
            values = null,
            flag = 1;
        var insert_dt = await F_Insert(table_name, fields, values, whr, flag);
        if (insert_dt.suc == 1) {
            res_dt = { suc: 1, msg: "Password Has Changed Successfully!!" };
        } else {
            res_dt = insert_dt;
        }
    } else {
        res_dt = { suc: 2, msg: "Please Enter Your Correct Old Password!!" };
    }
    res.send(res_dt);
})

module.exports = { LoginRouter };