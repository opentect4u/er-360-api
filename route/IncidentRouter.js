const express = require('express');
const { F_Insert, F_Select, CreateActivity, GetIncNo } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const { CreateRepositoryCategory } = require('./RepositoryRouter');

const IncidentRouter = express.Router();

/////////////////////////////// FETCH INCIDENT DETAILS WITH INCIDENT NUMBER ///////////////////////////////////////
IncidentRouter.get('/get_incident', async (req, res) => {
    var id = req.query.id,
        flag = req.query.flag,
        approval_flag = req.query.approval_flag,
        inc_no = req.query.inc_no,
        is_approve = req.query.is_approve,
        table_name = 'td_incident',
        select = '*',
        whr = id > 0 ? `id = ${id}` : (approval_flag && approval_flag != 'null' ? `approval_status = "${approval_flag}"` : (inc_no ? `inc_no = "${inc_no}"` : (flag != 'C' ? `inc_status = "${flag}"` : `inc_status = "${flag}" AND approval_status!= 'A'`)));
    // console.log(approval_flag, whr);
    var dt = await F_Select(select, table_name, whr, null),
        res_dt = inc_no ? (is_approve ? dt : (dt.msg.length > 0 ? (dt.msg[0].inc_status == 'O' ? dt : { suc: 2, msg: "Incident Is Already Closed" }) : { suc: 3, msg: "No Data Exist" })) : dt;
    res.send(res_dt);
})

/////////////////////////////// CREATE INCIDENT ///////////////////////////////////////
IncidentRouter.post('/create_incident', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        inc_no = await GetIncNo();
    var data = req.body;
    var table_name = 'td_incident',
        fields = data.id > 0 ? `inc_dt = "${datetime}", inc_type_id = "${data.inc_type_id}", inc_name = "${data.inc_name}", inc_location_id = "${data.inc_location_id}", initial_tier_id = "${data.initial_tier_id}", inc_status = "${data.inc_status}", brief_desc = "${data.brief_desc}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(inc_no, inc_dt, inc_type_id, inc_name, inc_location_id, initial_tier_id, inc_status, brief_desc, created_by, created_at)',
        values = `("${inc_no}", "${datetime}", "${data.inc_type_id}", "${data.inc_name}", "${data.inc_location_id}", "${data.initial_tier_id}", "${data.inc_status}", "${data.brief_desc}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `Incident ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag),
        res_dt = flag > 0 ? dt : { suc: dt.suc, msg: dt.msg, inc_no };
    // CREATE REPOSITORY CATEGORY
    var repo_data = { catg_name: inc_no, user: data.user }
    var create_repo_cat = await CreateRepositoryCategory(repo_data, datetime)
    // END
    // dt.push({ inc_no })
    res.send(res_dt)
})

/////////////////////////////// CLOSE INCIDENT ///////////////////////////////////////
IncidentRouter.post('/close_incident', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'td_incident',
        fields = `inc_status = "${data.inc_status}", close_date = "${datetime}", final_tier_id = "${data.final_tier_id}", closing_remarks = "${data.closing_remarks}", closed_by = "${data.user}", closed_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = 1,
        flag_type = 'CLOSED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `Incident ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);

    var deTable_name = 'td_activation',
        deFirlds = `active_flag = 'N', modified_by = "${data.user}", modified_at = "${datetime}"`,
        deValues = null,
        deWhere = `inc_id = ${data.id}`,
        deFlag = 1;
    var DeactivateTeam = await F_Insert(deTable_name, deFirlds, deValues, deWhere, deFlag)

    res.send(dt)
})

/////////////////////////////// APPROVE INCIDENT ///////////////////////////////////////
IncidentRouter.post('/approve_incident', async (req, res) => {
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

/////////////////////////////// ACTIVE TEAM FOR THE OPEN INCIDENT ///////////////////////////////////////
IncidentRouter.get('/get_active_team', async (req, res) => {
    var now_date = dateFormat(new Date(), "yyyy-mm-dd");
    table_name = 'td_team_log',
        select = `IF(COUNT(team_id) > 0, 'Y', 'N') AS active_flag, team_id`,
        whr = `from_date <= "${now_date}" AND to_date >= "${now_date}"`;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

module.exports = { IncidentRouter }