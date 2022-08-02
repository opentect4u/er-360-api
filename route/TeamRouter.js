const express = require('express');
const { F_Insert, F_Select, F_Check, F_Delete, CreateActivity } = require('../modules/MasterModule');
const { AssignTeamMail } = require('../modules/EmailModule');
const dateFormat = require('dateformat');
const TeamRouter = express.Router();

/////////////////////////////// FETCH ALL EMPLOYEE LIST ///////////////////////////////////////
TeamRouter.get('/get_emp_list', async (req, res) => {
    var table_name = 'md_employee a',
        select = `a.id as emp_id, a.employee_id, a.emp_name, a.user_type, a.user_status, IF((SELECT COUNT(id) FROM td_team_members b WHERE a.id=b.emp_id AND b.emp_status = 'O') > 0, 'Assigned', 'Not Assigned') as assign_status`,
        whr = `a.emp_status = 'A' AND a.id != 0`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

/////////////////////////////// FETCH ASSIGNED TEAMS ///////////////////////////////////////
TeamRouter.get('/assign_team_dash', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_team_members a, md_teams b',
        select = 'a.id, a.team_id, b.team_name, a.effective_date, a.emp_id, a.emp_status, COUNT(a.emp_id) as no_of_emp',
        whr = id > 0 ? `a.team_id=b.id AND id = ${id}` : `a.team_id=b.id`,
        group = `GROUP BY b.id`;
    var dt = await F_Select(select, table_name, whr, group);
    res.send(dt);
})

/////////////////////////////// FETCH ALL MEMBER LIST AGAINST A TEAM ///////////////////////////////////////
TeamRouter.get('/assign_team', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_team_members a, md_teams b, md_employee c, md_position e',
        select = `a.id, b.team_name, a.effective_date, a.emp_id, c.emp_name, a.emp_status, c.employee_id, IF(a.emp_status = 'O', 'Assigned', 'Not Assigned') as assign_status, c.user_type, c.id as emp_id, c.email, IF((SELECT COUNT(id) FROM td_activation d WHERE a.team_id=d.team_id AND a.emp_id=d.emp_id AND d.active_flag = 'Y') > 0, 'Y', 'N') active_flag, e.position`,
        whr = id > 0 ? `a.team_id=b.id AND a.emp_id=c.id AND c.emp_pos_id=e.id AND team_id = ${id}` : `a.team_id=b.id AND a.emp_id=c.id AND c.emp_pos_id=e.id`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

/////////////////////////////// ASIGN EMPLOYEES TO A TEAM ///////////////////////////////////////
TeamRouter.post('/assign_team', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        date = dateFormat(new Date(), "yyyy-mm-dd"),
        res_dt = { suc: 1, msg: "Success" };
    var data = req.body;
    var v = '',
        v1 = '';
    for (let i = 0; i < data.emp_list.length; i++) {
        if (data.emp_list[i].id > 0) {
            v = data.emp_list[i].id;
            if (v1 != '') {
                v1 = v + ',' + v1;
            } else {
                v1 = v;
            }
        }
    }
    var del_table_name = 'td_team_members',
        del_whr = `team_id = "${data.team_id}" AND emp_id NOT IN(${v1})`,
        del = await F_Delete(del_table_name, del_whr);
    data.emp_list.forEach(async dt => {
        var chk_fileds = 'id',
            chk_table_name = 'td_team_members',
            chk_whr = `team_id = "${data.team_id}" AND emp_id = "${dt.id}"`,
            chk_dt = await F_Check(chk_fileds, chk_table_name, chk_whr);
        // console.log(chk_dt.msg);
        var table_name = 'td_team_members',
            fields = chk_dt.msg > 0 ? `team_id = "${data.team_id}", effective_date = "${date}", emp_id = "${dt.id}", emp_status = "${dt.emp_status}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                '(team_id, effective_date, emp_id, emp_status, created_by, created_at)',
            values = `("${data.team_id}", "${date}", "${dt.id}", "${dt.emp_status}", "${data.user}", "${datetime}")`,
            whr = `team_id = "${data.team_id}" AND emp_id = "${dt.id}"`,
            flag = chk_dt.msg > 0 ? 1 : 0;
        // console.log({ flag })

        /////////////////// store record in td_activity //////////////////////////
        var user_id = data.user,
            act_type = flag > 0 ? 'M' : 'C',
            activity = `${dt.emp_name} has been assigned to a Team, name as ${dt.team_name} by ${user_id} at ${datetime}`;
        var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
        if (flag == 0) {
            var email = await AssignTeamMail(dt.emp_id, dt.team_name);
        }
        //////////////////////////////////////////////////////////////////////
        res_dt = await F_Insert(table_name, fields, values, whr, flag);
    })
    // var table_name = 'td_team_members',
    //     fields = data.id > 0 ? `team_id = "${data.team_id}", effective_date = "${date}", emp_id = "${data.emp_id}", emp_status = "${data.emp_status}", modified_by = "${data.user}", modified_at = "${datetime}"` :
    //         '(team_id, effective_date, emp_id, emp_status, created_by, created_at)',
    //     values = `("${data.team_id}", "${date}", "${data.emp_id}", "${data.emp_status}", "${data.user}", "${datetime}")`,
    //     whr = `id = ${data.id}`,
    //     flag = data.id > 0 ? 1 : 0;
    // var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(res_dt);
})

/////////////////////////////// TEAM STATUS DASHBOARD ///////////////////////////////////////
TeamRouter.get('/team_status_dash', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_team_log a, md_teams b',
        select = 'a.id, a.team_id, DATE_FORMAT(a.from_date, "%d/%m/%Y") from_date, DATE_FORMAT(a.to_date, "%d/%m/%Y") to_date, b.team_name',
        whr = id > 0 ? `a.team_id = b.id AND id = ${id}` : `a.team_id=b.id`,
        group = `GROUP BY a.team_id`;
    var dt = await F_Select(select, table_name, whr, group);
    res.send(dt);
})

/////////////////////////////// FETCH TEAM STATUS ///////////////////////////////////////
TeamRouter.get('/team_status', async (req, res) => {
    var now = dateFormat(new Date(), "yyyy-mm-dd");
    var id = req.query.id,
        table_name = 'td_team_log',
        select = 'id, team_id, from_date, to_date',
        whr = id > 0 ? `to_date >= "${now}" AND team_id = ${id}` : `to_date >= "${now}"`,
        order = `ORDER BY MONTH(from_date) DESC, DAY(from_date) ASC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

/////////////////////////////// CHECK ACTIVE DATE AND CREATE A ROSTER FOR A TEAM ///////////////////////////////////////
TeamRouter.post('/team_status', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        res_dt = { suc: 1, msg: "Success" };
    var data = req.body;
    var chk_fileds = 'id',
        chk_table_name = 'td_team_log',
        chk_whr = `team_id = "${data.team_id}" AND from_date = "${data.from_date}" AND to_date = "${data.to_date}"`,
        chk_dt = await F_Check(chk_fileds, chk_table_name, chk_whr);
    if (chk_dt.msg.length > 0) {
        res_dt = { suc: 0, msg: 'Data Already Exist..' }
    } else {
        var table_name = 'td_team_log',
            fields = data.id > 0 ? `team_id = "${data.team_id}", from_date = "${data.from_date}", to_date = "${data.to_date}", modified_by = "${data.user}", modified_at = "${datetime}"` : `(team_id, from_date, to_date, created_by, created_at)`,
            values = `("${data.team_id}", "${data.from_date}", "${data.to_date}", "${data.user}", "${datetime}")`,
            whr = `id = ${data.id}`,
            flag = data.id > 0 ? 1 : 0;

        /////////////////// store record in td_activity //////////////////////////
        var user_id = data.user,
            act_type = flag > 0 ? 'M' : 'C',
            activity = `A Team named, ${data.team_name} has been assigned for the duety from ${data.from_date} to ${data.to_date} by ${user_id} at ${datetime}`;
        var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
        //////////////////////////////////////////////////////////////////////
        res_dt = await F_Insert(table_name, fields, values, whr, flag);

    }
    res.send(res_dt);
})

/////////////////////////////// PREVIOUS TEAM ROSTER ///////////////////////////////////////
TeamRouter.get('/pre_team_status', async (req, res) => {
    var now = dateFormat(new Date(), "yyyy-mm-dd");
    var id = req.query.id,
        table_name = 'td_team_log',
        select = `team_id, DATE_FORMAT(from_date, "%d/%m/%Y") from_date, DATE_FORMAT(to_date, "%d/%m/%Y") to_date, DATE_FORMAT(created_at, '%d/%m/%Y %h:%i:%s %p') created_at, created_by`,
        whr = id > 0 ? `from_date <= "${now}" AND to_date <= "${now}" AND team_id = ${id}` : `frmo_date <= "${now}" AND to_date >= "${now}"`,
        order = `ORDER BY MONTH(from_date) DESC, DAY(from_date) ASC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

/////////////////////////////// DELETE TEAM STATUS ///////////////////////////////////////
TeamRouter.get('/del_team_status', async (req, res) => {
    var team_id = req.query.team_id,
        del_table_name = 'td_team_log',
        del_whr = `team_id = "${team_id}"`,
        del = await F_Delete(del_table_name, del_whr);
    res.send(del);
})

/////////////////////////////// FETCH ASSIGNED DATE FORM & TO ///////////////////////////////////////
TeamRouter.get('/get_max_frm_dt', async (req, res) => {
    var team_id = req.query.team_id,
        table_name = 'td_team_log',
        select = `DATE_FORMAT(DATE_ADD(MAX(to_date), INTERVAL 1 DAY), '%Y-%m-%d') as from_date`,
        whr = null,//team_id > 0 ? `team_id = ${team_id}` : null,
        group = null;
    var dt = await F_Select(select, table_name, whr, group);
    res.send(dt);
})

/////////////////////////////// GET TEAM ID AGENST AN EMPLOYEE ///////////////////////////////////////
TeamRouter.get('/get_assigned_team', async (req, res) => {
    var emp_id = req.query.emp_id,
        table_name = `td_team_members a, md_teams b`,
        select = `a.id, a.team_id, b.team_name`,
        whr = `a.team_id=b.id AND a.emp_id = ${emp_id}`,
        order = null;
    var dt = await F_Select(select, table_name, whr, order)
    res.send(dt)
})

module.exports = { TeamRouter }