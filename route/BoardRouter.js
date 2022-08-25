const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const BoardRouter = express.Router();

/////////////////////////////// ACTIVE INCIDENT DETAILS ///////////////////////////////////////
BoardRouter.get('/get_active_inc', async (req, res) => {
    var table_name = 'td_incident a, md_location b, md_tier c, md_incident_type d',
        select = 'a.id, a.inc_no, a.inc_name, a.brief_desc, a.initial_tier_id, b.offshore_name, b.offshore_latt as lat, b.offshore_long lon, c.tier_type, a.inc_dt, TIMESTAMPDIFF(HOUR,a.inc_dt, NOW()) as dif_time, d.incident_name incident_type, (SELECT COUNT(id) FROM td_casualty_board e WHERE a.id=e.inc_id) AS tot_casualty',
        whr = `a.inc_location_id=b.id AND a.initial_tier_id=c.id AND a.inc_type_id=d.id AND a.inc_status = 'O'`,
        order = 'ORDER BY a.id';
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// INCIDENT BOARD ///////////////////////////////////////
BoardRouter.get('/inc_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_inc_board',
        select = 'id, inc_id, date, installation, coordinates, visibility, visibility_unit, wind_speed, wind_speed_unit, wind_direc, sea_state, temp, temp_unit, summary, status, time, people, env, asset, reputation',
        whr = `inc_id = "${inc_id}"`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/inc_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        date = dateFormat(new Date(), "yyyy-mm-dd"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dt => {
            var table_name = 'td_inc_board',
                fields = dt.id > 0 ? `inc_id = "${data.inc_id}", date = "${date}", time = "${dt.time_inc}", installation = "${data.installation}", 
                coordinates = "${data.coordinates}", visibility = "${dt.visibility}", visibility_unit = "${dt.visibility_unit}", wind_speed = "${dt.wind_speed}", wind_speed_unit = "${dt.wind_speed_unit}",
                wind_direc = "${dt.wind_direc}", sea_state = "${dt.sea_state}", temp = "${dt.temp}", temp_unit = "${dt.temp_unit}", summary = "${data.summary}",
                status = "${data.status}", people = "${data.people}", env = "${data.env}", asset = "${data.asset}", reputation = "${data.reputation}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, time, installation, coordinates, visibility, visibility_unit, wind_speed, wind_speed_unit, wind_direc, sea_state, temp, temp_unit, summary, status, people, env, asset, reputation, created_by, created_at)',
                values = `("${data.inc_id}", "${date}", "${dt.time_inc}", "${data.installation}", "${data.coordinates}", "${dt.visibility}", "${dt.visibility_unit}",
                "${dt.wind_speed}", "${dt.wind_speed_unit}", "${dt.wind_direc}", "${dt.sea_state}", "${dt.temp}", "${dt.temp_unit}", "${data.summary}", "${data.status}", "${data.people}", "${data.env}", "${data.asset}", "${data.reputation}", "${data.user}", "${datetime}")`,
                whr = `id = ${dt.id}`,
                flag = dt.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Incident Board ${data.installation} IS ${flag_type} BY ${data.user} AT ${datetime}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// VESSEL BOARD ///////////////////////////////////////
BoardRouter.get('/vessel_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_vessel_board',
        select = 'id, inc_id, date, vessel_name, vessel_type, form_at, etd, to_at, eta, time_to_location, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time',
        whr = `inc_id = "${inc_id}"`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/vessel_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dta => {
            var table_name = 'td_vessel_board',
                fields = dta.id > 0 ? `inc_id = "${data.inc_id}", date = "${datetime}", vessel_name = "${dta.vessel_name}",
                vessel_type = "${dta.vessel_type}", form_at = "${dta.form_at}", etd = "${dta.etd}",
                to_at = "${dta.to_at}", eta = "${dta.eta}", time_to_location = "${dta.time_to_location}", remarks = "${dta.remarks}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, vessel_name, vessel_type, form_at, etd, to_at, eta, time_to_location, remarks, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.vessel_name}", "${dta.vessel_type}", "${dta.form_at}",
                "${dta.etd}", "${dta.to_at}", "${dta.eta}", "${dta.time_to_location}", "${dta.remarks}", "${data.user}", "${datetime}")`,
                whr = `id = ${dta.id}`,
                flag = dta.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Vessel Board ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// HELICOPTER BOARD ///////////////////////////////////////
BoardRouter.get('/helicopter_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_helicopter_board',
        select = 'id, inc_id, date, call_sign, heli_type, form_at, etd, to_at, eta, time_to_location, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time',
        whr = `inc_id = "${inc_id}"`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/helicopter_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dta => {
            var table_name = 'td_helicopter_board',
                fields = dta.id > 0 ? `inc_id = "${data.inc_id}", date = "${datetime}", call_sign = "${dta.call_sign}",
                heli_type = "${dta.heli_type}", form_at = "${dta.form_at}", etd = "${dta.etd}",
                to_at = "${dta.to_at}", eta = "${dta.eta}", time_to_location = "${dta.time_to_location}", remarks = "${dta.remarks}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, call_sign, heli_type, form_at, etd, to_at, eta, time_to_location, remarks, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.call_sign}", "${dta.heli_type}", "${dta.form_at}",
                "${dta.etd}", "${dta.to_at}", "${dta.eta}", "${dta.time_to_location}", "${dta.remarks}", "${data.user}", "${datetime}")`,
                whr = `id = ${dta.id}`,
                flag = dta.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Helicopter Board ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// CASULTY BOARD ///////////////////////////////////////
BoardRouter.get('/casualty_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name, select, whr, order;

    table_name = 'td_casualty_board'
    select = 'id, inc_id, inc_dt, full_name, employer'
    whr = `inc_id = "${inc_id}"`
    order = `ORDER BY id DESC`
    var dt = await F_Select(select, table_name, whr, order);
    if (dt.suc > 0 && dt.msg.length > 0) {
        for (let c_dt of dt.msg) {
            table_name = 'td_casualty_board_dt'
            select = 'id, inc_id, board_id, emp_condition, location, time'
            whr = `board_id = ${c_dt.id} AND inc_id = "${inc_id}"`
            order = `ORDER BY id DESC`
            let e_dt = await F_Select(select, table_name, whr, order)
            c_dt['casualtygrid'] = e_dt.msg
        }
    }

    res.send(dt);
})

BoardRouter.get('/casualty', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_casualty_board a',
        select = 'a.full_name, (SELECT b.location FROM td_casualty_board_dt b WHERE b.board_id=a.id ORDER BY b.id DESC LIMIT 1) location, (SELECT b.emp_condition FROM td_casualty_board_dt b WHERE b.board_id=a.id ORDER BY b.id DESC LIMIT 1) emp_condition, (SELECT b.time FROM td_casualty_board_dt b WHERE b.board_id=a.id ORDER BY b.id DESC LIMIT 1) time',
        whr = `a.inc_id = "${inc_id}"`,
        order = null;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/casualty_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        time = dateFormat(new Date(), "HH:MM:ss"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {

        // console.log(data);
        var table_name, fields, values, whr, flag, flag_type, res_dt;
        for (let c_dt of data.dt) {
            table_name = 'td_casualty_board'
            fields = c_dt.id > 0 ? `inc_id = "${data.inc_id}", inc_dt = "${datetime}", full_name = "${c_dt.full_name}", employer = "${c_dt.employer}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                `(inc_id, inc_dt, full_name, employer, created_by, created_at)`
            values = `("${data.inc_id}", "${datetime}", "${c_dt.full_name}", "${c_dt.employer}", "${data.user}", "${datetime}")`
            whr = `id = ${c_dt.id}`
            flag = c_dt.id > 0 ? 1 : 0
            flag_type = flag > 0 ? 'UPDATED' : 'CREATED'
            c_dt_save = await F_Insert(table_name, fields, values, whr, flag)
            if (c_dt_save.suc > 0) {
                let c_id = c_dt_save.lastId.insertId
                let condition = ''
                for (let e_dt of c_dt.casualtygrid) {
                    table_name = 'td_casualty_board_dt'
                    fields = c_dt.id > 0 ? `emp_condition = "${e_dt.emp_condition}", location = "${e_dt.location}", time = "${e_dt.time}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                        `(inc_id, board_id, emp_condition, location, time, created_by, created_at)`
                    values = `("${data.inc_id}", "${c_id}", "${e_dt.emp_condition}", "${e_dt.location}", "${e_dt.time}", "${data.user}", "${datetime}")`
                    whr = `id = ${e_dt.id}`
                    flag = c_dt.id > 0 ? 1 : 0
                    flag_type = flag > 0 ? 'UPDATED' : 'CREATED'
                    e_dt_save = await F_Insert(table_name, fields, values, whr, flag)
                    if (e_dt_save.suc > 0) {
                        res_dt = { suc: e_dt_save.suc, msg: e_dt_save.msg }
                        condition = e_dt.emp_condition
                    } else {
                        res_dt = { suc: e_dt_save.suc, msg: e_dt_save.msg };
                        break;
                    }
                }
                let user_id = data.user
                let act_type = flag > 0 ? 'M' : 'C'
                let activity = `Casualty Board ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}. Employee: ${c_dt.full_name}, Condition: ${condition} Time: ${time}`
                let activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);
            } else {
                res_dt = { suc: c_dt_save.suc, msg: c_dt_save.msg }
                break;
            }
        }
        res.send(res_dt)
    } else {
        res_dt = { suc: 0, msg: 'Please Fill All Fields Before Submit!!' }
    }
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// EVACUATION BOARD ///////////////////////////////////////
BoardRouter.get('/evacuation_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_evacuation_board',
        select = 'id, inc_id, date, destination, dest_to, mode_of_transport, pob_remaining, remarks, time',
        whr = `inc_id = "${inc_id}"`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/evacuation_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dta => {
            var table_name = 'td_evacuation_board',
                fields = dta.id > 0 ? `date = "${datetime}", time = "${dta.time}", destination = "${dta.destination}", dest_to = "${dta.dest_to}",
                mode_of_transport = "${dta.mode_of_transport}", pob_remaining = "${dta.pob_remaining}", remarks = "${dta.remarks}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, time, destination, dest_to, mode_of_transport, pob_remaining, remarks, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.time}", "${dta.destination}", "${dta.dest_to}", "${dta.mode_of_transport}", "${dta.pob_remaining}", "${dta.remarks}",
                "${data.user}", "${datetime}")`,
                whr = `id = ${dta.id}`,
                flag = dta.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';
            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Evacuation Board For Incident ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}. Mode of transport is ${dta.mode_of_transport}, ${dta.pob_remaining} no of Prob Remains`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// EVENT BOARD ///////////////////////////////////////
BoardRouter.get('/event_log_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_events_log_board',
        select = 'id, inc_id, date, situation_status, resource_assigned, time',
        whr = `inc_id = "${inc_id}"`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/event_log_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dta => {
            var table_name = 'td_events_log_board',
                fields = dta.id > 0 ? `inc_id = "${data.inc_id}", date = "${datetime}", time = "${dta.time}", situation_status = "${dta.situation_status}",
                resource_assigned = "${dta.resource_assigned}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, time, situation_status, resource_assigned, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.time}", "${dta.situation_status}", "${dta.resource_assigned}",
                "${data.user}", "${datetime}")`,
                whr = `id = ${dta.id}`,
                flag = dta.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Event Log Board For Incident ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}. Resource Assigned = ${dta.resource_assigned} and Situation Status = ${dta.situation_status}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// PROB BOARD ///////////////////////////////////////
BoardRouter.get('/get_prob_cat', async (req, res) => {
    var table_name = 'md_prob_category',
        select = 'id, name',
        whr = null,
        order = `ORDER BY id`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.get('/prob_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_prob_board a',
        select = 'a.id, a.inc_id, DATE_FORMAT(a.date, "%Y-%m-%d") date, a.prob_cat_id, a.time, a.value, a.total_prob',
        whr = `a.inc_id = "${inc_id}"`,
        order = `ORDER BY a.id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/prob_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        now_dt = dateFormat(new Date(), "yyyy-mm-dd"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dta => {
            var table_name = 'td_prob_board',
                fields = dta.id > 0 ? `date = "${now_dt}", prob_cat_id = "${dta.prob_cat_id}", time = "${dta.Time}", value = "${dta.value}", total_prob = "${dta.total_prob}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, prob_cat_id, time, value, total_prob, created_by, created_at)',
                values = `("${data.inc_id}", "${now_dt}", "${dta.prob_cat_id}", "${dta.Time}", "${dta.value}", "${dta.total_prob}", "${data.user}", "${datetime}")`,
                whr = `id = ${dta.id}`,
                flag = dta.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

            var user_id = data.user,
                cat_table = 'md_prob_category',
                cat_select = `name`,
                cat_whr = `id = ${dta.prob_cat_id}`,
                cat = await F_Select(cat_select, cat_table, cat_whr, null),
                cat_name = cat.msg[0].name,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `A Prob Board is ${flag_type} Under Category ${cat_name}, Time: ${dta.Time}, Value: ${dta.value} at ${datetime} by ${data.user}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})

BoardRouter.get('/prob_board_dashboard', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_prob_board a, md_prob_category b',
        select = 'a.inc_id, b.name as prob_cat, SUM(a.value) as value, SUM(a.total_prob) total_prob',
        whr = `a.prob_cat_id=b.id AND inc_id = "${inc_id}"`,
        order = `GROUP BY a.prob_cat_id ORDER BY a.prob_cat_id`;
    var dt = await F_Select(select, table_name, whr, order);
    // console.log(dt);
    res.send(dt);
})

BoardRouter.get('/prob_board_report', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_prob_board a, md_prob_category b',
        select = 'a.id, a.inc_id, a.date, DATE_FORMAT(a.date, "%d/%m/%Y") AS date_format, a.prob_cat_id, b.name as prob_cat, a.time, DATE_FORMAT(a.time, "%h:%i %p") AS time_format, a.value, a.total_prob',
        whr = `a.prob_cat_id=b.id AND inc_id = "${inc_id}"`,
        order = `ORDER BY id`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})
//////////////////////////////////////////////////////////////////////////////////

BoardRouter.get('/delete_board', async (req, res) => {
    var id = req.query.id,
        board_id = req.query.board_id;
    var table_name = '',
        whr = '',
        resDt = '';
    switch (board_id) {
        case "1":  // INCIDENT BOARD
            table_name = 'td_inc_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "2": // VESSEL BOARD
            table_name = 'td_vessel_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "3": // HELICOPTER BOARD
            table_name = 'td_helicopter_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "4": // PROB BOARD
            table_name = 'td_prob_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "5": // CASULTY BOARD
            table_name = 'td_casualty_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "6": // EVACUATION BOARD
            table_name = 'td_evacuation_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "7": // EVENT LOG BOARD
            table_name = 'td_events_log_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "8": // CASUALTY BOARD DT
            table_name = 'td_casualty_board_dt'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        case "9": // Incident Objectives BOARD
            table_name = 'td_inc_obj_board'
            whr = `id = ${id}`
            resDt = await F_Delete(table_name, whr)
            break;
        default:
            resDt = { suc: 0, msg: 'No Board Selected !!' }
            break;
    }
    res.send(resDt)
})

/////////////////////////////// INCIDENT OBJECTIVE ///////////////////////////////////////
BoardRouter.get('/inc_obj', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_inc_obj_board',
        select = `id, inc_id, op_period_from, op_period_to, obj_general, people, environment, assets, reputation, awareness`,
        whr = `inc_id = ${inc_id}`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order)
    res.send(dt)
})

BoardRouter.post('/inc_obj', async (req, res) => {
    var data = req.body,
        datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        table_name, fields, values, whr, flag, flag_type, res_dt;
    for (let dt of data.dt) {
        table_name = 'td_inc_obj_board'
        fields = dt.id > 0 ? `op_period_from = "${dt.op_period_from}", op_period_to = "${dt.op_period_to}", obj_general = "${dt.obj_general}", people = "${dt.people}", environment = "${dt.environment}", assets = "${dt.assets}", reputation = "${dt.reputation}", awareness = "${dt.awareness}", created_by = "${data.user}", created_at = "${datetime}"` :
            '(inc_id, op_period_from, op_period_to, obj_general, people, environment, assets, reputation, awareness, created_by, created_at)'
        values = `("${data.inc_id}", "${dt.op_period_from}", "${dt.op_period_to}", "${dt.obj_general}", "${dt.people}", "${dt.environment}", "${dt.assets}", "${dt.reputation}", "${dt.awareness}", "${data.user}", "${datetime}")`
        whr = dt.id > 0 ? `id = ${dt.id}` : null
        flag = dt.id > 0 ? 1 : 0
        flag_type = flag > 0 ? 'UPDATED' : 'CREATED'
        let dt_save = await F_Insert(table_name, fields, values, whr, flag)
        res_dt = { suc: dt_save.suc, mag: dt_save.msg }
        if (dt_save.suc == 0) break;
        let user_id = data.user
        let act_type = flag > 0 ? 'M' : 'C'
        let activity = `Incident Objective Board ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}.`
        let activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);
    }
    res.send(res_dt)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// WEEKLY MEETING ///////////////////////////////////////
BoardRouter.get('/meeting', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_weekly_meeting',
        select = `id, inc_id, date, ref_no, handover_date, handover_by, handover_to, attended_by, ongoing_act, upcoming_act, logistics, shore_act, others, file_path, final_flag`,
        whr = id > 0 ? `id = ${id}` : null,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order)
    res.send(dt)
})
//////////////////////////////////////////////////////////////////////////////////


module.exports = { BoardRouter };