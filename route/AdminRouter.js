const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const bcrypt = require('bcrypt');
const { UserCredential } = require('../modules/EmailModule');

const AdmRouter = express.Router();

/////////////////// CHECKING USER /////////////////
AdmRouter.get('/chk_email', async (req, res) => {
    var email = req.query.email,
        table_name = 'md_employee',
        select = 'email',
        whr = `email = "${email}"`;
    var dt = await F_Select(select, table_name, whr, null);
    var res_dt = dt.msg.length > 0 ? { suc: 0, msg: "Email Already Exist" } : { suc: 1, msg: "Fresh Email" }
    res.send(res_dt);
})

AdmRouter.get('/chk_emp_id', async (req, res) => {
    var emp_id = req.query.emp_id,
        table_name = 'md_employee',
        select = 'employee_id',
        whr = `employee_id = "${emp_id}"`;
    var dt = await F_Select(select, table_name, whr, null);
    var res_dt = dt.msg.length > 0 ? { suc: 0, msg: "Employee ID Already Exist" } : { suc: 1, msg: "Fresh Employee ID" }
    res.send(res_dt);
})
///////////////////////////////////////////////////

/////////////////// OFFSHORE //////////////////////
AdmRouter.get('/offshore', async (req, res) => {
    var flag = req.query.flag,
        table_name = 'md_location',
        select = 'id, offshore_name, location_name, offshore_latt, offshore_long, no_of_workers, status',
        whr = flag != '' ? (req.query.id > 0 ? `id = ${req.query.id} AND delete_flag = 'N'` : `status = "${flag}" AND delete_flag = 'N'`) : ` delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

AdmRouter.post('/offshore', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_location',
        fields = data.id > 0 ? `offshore_name = "${data.offshore_name}", location_name = "${data.location}", offshore_latt = "${data.lattitude}", offshore_long = "${data.longitude}", no_of_workers = "${data.workers_no}", status = "${data.status}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(offshore_name, location_name, offshore_latt, offshore_long, no_of_workers, status, created_by, created_at)',
        values = `("${data.offshore_name}", "${data.location}", "${data.lattitude}", "${data.longitude}", "${data.workers_no}", "${data.status}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0
    flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    // store record in td_activity
    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `OFFSHORE ${data.offshore_name} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/offshore_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_location',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = 1;

    var select = 'offshore_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `OFFSHORE ${select_dt.msg[0].offshore_name} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// INCIDENT //////////////////////
AdmRouter.get('/incident', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_incident_type',
        select = 'id, incident_name',
        whr = id > 0 ? `id = ${id} AND delete_flag = 'N'` : `delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

AdmRouter.post('/incident', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_incident_type',
        fields = data.id > 0 ? `incident_name = "${data.incident_type}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(incident_name, created_by, created_at)',
        values = `("${data.incident_type}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `INCIDENT ${data.incident_type} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/incident_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_incident_type',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'incident_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `INCIDENT ${select_dt.msg[0].incident_name} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// TIER /////////////////////////
AdmRouter.get('/tier', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_tier',
        select = 'id, tier_type',
        whr = id > 0 ? `id = ${id} AND delete_flag = 'N'` : `delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

AdmRouter.post('/tier', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_tier',
        fields = data.id > 0 ? `tier_type = "${data.tier_type}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(tier_type, created_by, created_at)',
        values = `("${data.tier_type}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `TIER ${data.tier_type} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/tier_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_tier',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'tier_type',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `TIER ${select_dt.msg[0].tier_type} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// POSITION //////////////////////
AdmRouter.get('/position', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_position',
        select = 'id, position',
        whr = id > 0 ? `id = ${id} AND delete_flag = 'N'` : `delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

AdmRouter.post('/position', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_position',
        fields = data.id > 0 ? `position = "${data.position}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(position, created_by, created_at)',
        values = `("${data.position}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `POSITION ${data.position} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/position_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_position',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'position',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `POSITION ${select_dt.msg[0].position} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// DEPARTMENT ////////////////////
AdmRouter.get('/department', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_department',
        select = 'id, department_name',
        whr = id > 0 ? `id = ${id} AND delete_flag = 'N'` : `delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

AdmRouter.post('/department', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_department',
        fields = data.id > 0 ? `department_name = "${data.department}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(department_name, created_by, created_at)',
        values = `("${data.department}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `DEPARTMENT ${data.department} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/department_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_department',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'department_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `DEPARTMENT ${select_dt.msg[0].department_name} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// EMPLOYEE //////////////////////
AdmRouter.get('/employee', async (req, res) => {
    var id = req.query.id,
        flag = req.query.flag,
        emp_id = req.query.emp_id,
        emp_whr = emp_id > 0 ? `AND employee_id = ${emp_id}` : '',
        table_name = 'md_employee',
        select = 'id, employee_id, emp_name, emp_depart_id, emp_pos_id, email, password, p_code, personal_cnct_no, er_code, er_cnct_no, user_type, user_status, emp_status, approval_flag, img, user_role',
        whr = flag != '' ? (id > 0 ? `id = ${id} AND delete_flag = 'N'` : `emp_status = "${flag}" AND delete_flag = 'N' ${emp_whr}`) : `delete_flag = 'N' ${emp_whr}`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
    //res.send({select, table_name, whr});
})

AdmRouter.post('/employee', async (req, res) => {
    var data = req.body;

    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var alpha = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
        'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    var a = alpha[Math.floor(Math.random() * 62)];
    var b = alpha[Math.floor(Math.random() * 62)];
    var c = alpha[Math.floor(Math.random() * 62)];
    var d = alpha[Math.floor(Math.random() * 62)];
    var e = alpha[Math.floor(Math.random() * 62)];
    var sum = a + b + c + d + e;
    var pwd = bcrypt.hashSync(sum, 10);
    var dt = '';
    var approval_flag = data.approval_flag;

    var table_name = 'md_employee',
        fields = data.id > 0 ? `employee_id = "${data.employee_id}", emp_name = "${data.name}", emp_depart_id = "${data.department}", emp_pos_id = "${data.position}", email = "${data.email}", p_code = "${data.p_code}", personal_cnct_no = "${data.p_contact}", er_code = "${data.er_code}", er_cnct_no = "${data.er_contact}", user_type = "${data.user_type}", approval_flag = "${data.approval_flag}", emp_status = "${data.emp_status}", user_role = '${data.user_role}', modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(employee_id, emp_name, emp_depart_id, emp_pos_id, email, password, p_code, personal_cnct_no, er_code, er_cnct_no, user_type, approval_flag, emp_status, user_role, created_by, created_at)',
        values = `("${data.employee_id}", "${data.name}", "${data.department}", "${data.position}", "${data.email}", "${pwd}", "${data.p_code}", "${data.p_contact}", "${data.er_code}", "${data.er_contact}", "${data.user_type}", "${approval_flag}", "${data.emp_status}", '${data.user_role}', "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `An employee, ${data.name} having id: ${data.employee_id} email: ${data.email} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
    if (flag == 0) {
        var email = await UserCredential(data.email, data.name, sum);
    }
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/employee_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_employee',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'emp_name, employee_id',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `An employee ${select_dt.msg[0].emp_name} having employee id ${select_dt.msg[0].employee_id} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/check_contact_personal', async (req, res) => {
    var no = req.query.no,
        table_name = 'md_employee',
        select = 'COUNT(id) as count_dt',
        whr = `personal_cnct_no = "${no}" AND delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null),
        res_dt = dt.msg[0].count_dt > 0 ? { suc: 0, msg: 'Contact Personal Already Exist' } : { suc: 1, msg: 'Fresh Contact Personal' };
    res.send(res_dt);
})

AdmRouter.get('/check_contact_er', async (req, res) => {
    var no = req.query.no,
        table_name = 'md_employee',
        select = 'COUNT(id) as count_dt',
        whr = `er_cnct_no = "${no}" AND delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null),
        res_dt = dt.msg[0].count_dt > 0 ? { suc: 0, msg: 'Contact ER Already Exist' } : { suc: 1, msg: 'Fresh Contact ER' };
    res.send(res_dt);
})
///////////////////////////////////////////////////

/////////////////// TEAMS //////////////////////
AdmRouter.get('/teams', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_teams a, md_team_type b',
        select = 'a.id, a.team_type_id, a.team_name, b.team_type, b.team_short_code, b.team_location, (SELECT COUNT(c.id) FROM td_team_members c WHERE a.id=c.team_id) AS no_of_emp',
        whr = id > 0 ? `a.team_type_id=b.id AND a.id = ${id} AND a.delete_flag = 'N'` : `a.team_type_id=b.id AND a.delete_flag = 'N'`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

AdmRouter.post('/teams', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_teams',
        fields = data.id > 0 ? `team_type_id = "${data.team_type}", team_name = "${data.team_name}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(team_type_id, team_name, created_by, created_at)',
        values = `("${data.team_type}", "${data.team_name}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `A team named ${data.team_name} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/teams_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_teams',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'team_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `A team named ${select_dt.msg[0].team_name}, IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/team_type', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_team_type',
        select = 'id, team_type, team_short_code, team_location',
        whr = id > 0 ? `id = ${id}` : null;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})
///////////////////////////////////////////////////

/////////////////// CONTACT CATEGORY //////////////////////
AdmRouter.get('/contact_catg', async (req, res) => {
    var id = req.query.id,
        table_name = 'md_contact_catg',
        select = 'id, catg_name',
        whr = id > 0 ? `delete_flag = 'N' AND id=${id}` : `delete_flag = 'N'`,
        order = null;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

AdmRouter.post('/contact_catg', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_contact_catg',
        fields = data.id > 0 ? `catg_name = "${data.catg_name}", modified_by = "${data.user}", modified_dt = "${datetime}"` :
            '(catg_name, created_by, created_dt)',
        values = `("${data.catg_name}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `Contact Category ${data.catg_name} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

AdmRouter.get('/contact_catg_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'md_contact_catg',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_dt = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0;

    var select = 'catg_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `Contact Category: ${select_dt.msg[0].catg_name} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// CONTACT INFO //////////////////////
AdmRouter.get('/contact_info', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_contact_info a, md_contact_catg b',
        select = 'a.id, a.catg_id, b.catg_name, a.con_desc, a.con_name, a.con_addr, a.con_email, a.con_no',
        whr = id > 0 ? `a.catg_id=b.id AND a.catg_id=${id}` : `a.catg_id=b.id`,
        order = null;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

AdmRouter.post('/contact_info', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        data = req.body,
        table_name, fields, values, whr, flag, res_dt;
    if (data.dt.length > 0) {
        for (let dt of data.dt) {
            table_name = 'td_contact_info'
            fields = dt.id > 0 ? `catg_id = "${data.catg_id}", con_desc = "${dt.con_desc}", con_name = "${dt.con_name}", con_addr = "${dt.con_addr}", con_email = "${dt.con_email}", con_no = "${dt.con_no}", modified_by = "${data.user}", modified_dt = "${datetime}"` :
                `(catg_id, con_desc, con_name, con_addr, con_email, con_no, created_by, created_dt)`;
            values = `("${data.catg_id}", "${dt.con_desc}", "${dt.con_name}", "${dt.con_addr}", "${dt.con_email}", "${dt.con_no}", "${data.user}", "${datetime}")`;
            whr = dt.id > 0 ? `id = ${dt.id}` : null;
            flag = dt.id > 0 ? 1 : 0;
            res_dt = await F_Insert(table_name, fields, values, whr, flag);
            if (res_dt.suc == 0) {
                break;
            }
        }
        res.send(res_dt)
    }
})

AdmRouter.get('/contact_info_dash', async (req, res) => {
    var select, table_name, whr, order, con_info = {};
    table_name = 'td_contact_info a, md_contact_catg b'
    select = 'DISTINCT a.catg_id, b.catg_name'
    whr = `a.catg_id=b.id`;
    order = null
    var catg_list = await F_Select(select, table_name, whr, order)
    var i = 0
    // console.log(catg_list);
    for (let catg of catg_list.msg) {
        select = 'id, con_desc, con_name, con_addr, con_email, con_no'
        table_name = 'td_contact_info'
        whr = `catg_id = ${catg.catg_id}`
        let cat_info = await F_Select(select, table_name, whr, order)
        con_info[catg.catg_name] = { catg_id: catg.catg_id, info: cat_info.msg }
        i++;
    }
    res.send({ suc: 1, msg: con_info })
    // console.log(con_info);
})

AdmRouter.get('/contact_info_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'td_contact_info',
        select = 'con_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `Contact Information Named, ${select_dt.msg[0].con_name} IS DELETED at ${datetime} by ${data.user}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var whr = `id = ${data.id}`;
    var dt = await F_Delete(table_name, whr)

    res.send(dt)
})
///////////////////////////////////////////////////

module.exports = { AdmRouter }