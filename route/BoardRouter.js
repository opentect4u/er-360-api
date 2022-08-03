const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const BoardRouter = express.Router();

/////////////////////////////// ACTIVE INCIDENT DETAILS ///////////////////////////////////////
BoardRouter.get('/get_active_inc', async (req, res) => {
    var table_name = 'td_incident a, md_location b, md_tier c, md_incident_type d',
        select = 'a.id, a.inc_no, a.inc_name, b.offshore_name, b.offshore_latt as lat, b.offshore_long lon, c.tier_type, a.inc_dt, TIMESTAMPDIFF(HOUR,a.inc_dt, NOW()) as dif_time, d.incident_name incident_type, (SELECT COUNT(id) FROM td_casualty_board e WHERE a.id=e.inc_id) AS tot_casualty',
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
        select = 'id, inc_id, date, installation, coordinates, visibility, wind_speed, wind_direc, sea_state, temp, temp_unit, summary, status, DATE_FORMAT(created_at, "%h:%i:%s %p") AS time',
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
                fields = dt.id > 0 ? `inc_id = "${data.inc_id}", date = "${date}", installation = "${data.installation}", 
                coordinates = "${data.coordinates}", visibility = "${dt.visibility}", wind_speed = "${dt.wind_speed}", 
                wind_direc = "${dt.wind_direc}", sea_state = "${dt.sea_state}", temp = "${dt.temp}", temp_unit = "${dt.temp_unit}", summary = "${data.summary}",
                status = "${data.status}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, installation, coordinates, visibility, wind_speed, wind_direc, sea_state, temp, temp_unit, summary, status, created_by, created_at)',
                values = `("${data.inc_id}", "${date}", "${data.installation}", "${data.coordinates}", "${dt.visibility}", 
                "${dt.wind_speed}", "${dt.wind_direc}", "${dt.sea_state}", "${dt.temp}", "${dt.temp_unit}", "${data.summary}", "${data.status}", "${data.user}", "${datetime}")`,
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
        select = 'id, inc_id, date, vessel_name, vessel_type, form_at, etd, to_at, eta, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time',
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
                to_at = "${dta.to_at}", eta = "${dta.eta}", remarks = "${dta.remarks}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, vessel_name, vessel_type, form_at, etd, to_at, eta, remarks, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.vessel_name}", "${dta.vessel_type}", "${dta.form_at}",
                "${dta.etd}", "${dta.to_at}", "${dta.eta}", "${dta.remarks}", "${data.user}", "${datetime}")`,
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
        select = 'id, inc_id, date, call_sign, heli_type, form_at, etd, to_at, eta, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time',
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
                to_at = "${dta.to_at}", eta = "${dta.eta}", remarks = "${dta.remarks}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, call_sign, heli_type, form_at, etd, to_at, eta, remarks, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.call_sign}", "${dta.heli_type}", "${dta.form_at}",
                "${dta.etd}", "${dta.to_at}", "${dta.eta}", "${dta.remarks}", "${data.user}", "${datetime}")`,
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
        table_name = 'td_casualty_board',
        select = 'id, inc_id, date, full_name, employer, emp_condition, location, time',
        whr = `inc_id = "${inc_id}"`,
        order = `ORDER BY id DESC`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.get('/casualty', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_casualty_board a',
        select = 'COUNT(a.id) as tot_cas, b.offshore_name, b.offshore_latt latt, b.offshore_long lon, a.location',
        whr = `a.inc_id = "${inc_id}"`,
        order = `GROUP BY a.location`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

BoardRouter.post('/casualty_board', async (req, res) => {
    var data = req.body;
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        time = dateFormat(new Date(), "HH:MM:ss"),
        res_data = { suc: 1, msg: 'Success' };
    if (data.dt.length > 0) {
        data.dt.forEach(async dta => {
            var table_name = 'td_casualty_board',
                fields = dta.id > 0 ? `inc_id = "${data.inc_id}", date = "${datetime}", full_name = "${dta.full_name}",
                employer = "${dta.employer}", emp_condition = "${dta.condition}",
                location = "${dta.location}", time = "${dta.time}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, full_name, employer, emp_condition, location, time, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.full_name}", "${dta.employer}", "${dta.condition}",
                "${dta.location}", "${dta.time}", "${data.user}", "${datetime}")`,
                whr = `id = ${dta.id}`,
                flag = dta.id > 0 ? 1 : 0,
                flag_type = flag > 0 ? 'UPDATED' : 'CREATED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Casualty Board ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${datetime}. Employee: ${dta.full_name}, Condition: ${dta.condition} Time: ${time}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);

            res_data = await F_Insert(table_name, fields, values, whr, flag);
        })
    }
    res.send(res_data)
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// EVACUATION BOARD ///////////////////////////////////////
BoardRouter.get('/evacuation_board', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_evacuation_board',
        select = 'id, inc_id, date, destination, mode_of_transport, pob_remaining, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time',
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
                fields = dta.id > 0 ? `inc_id = "${data.inc_id}", date = "${datetime}", destination = "${dta.destination}",
                mode_of_transport = "${dta.mode_of_transport}", pob_remaining = "${dta.pob_remaining}", remarks = "${dta.remarks}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, destination, mode_of_transport, pob_remaining, remarks, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.destination}", "${dta.mode_of_transport}", "${dta.pob_remaining}", "${dta.remarks}",
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
        select = 'id, inc_id, date, situation_status, resource_assigned, DATE_FORMAT(date, "%h:%i:%s %p") AS time',
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
                fields = dta.id > 0 ? `inc_id = "${data.inc_id}", date = "${datetime}", situation_status = "${dta.situation_status}",
                resource_assigned = "${dta.resource_assigned}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, situation_status, resource_assigned, created_by, created_at)',
                values = `("${data.inc_id}", "${datetime}", "${dta.situation_status}", "${dta.resource_assigned}",
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
        select = 'a.id, a.inc_id, DATE_FORMAT(a.date, "%Y-%m-%d") date, a.prob_cat_id, a.time, a.value',
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
                fields = dta.id > 0 ? `date = "${now_dt}", prob_cat_id = "${dta.prob_cat_id}", time = "${dta.Time}", value = "${dta.value}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(inc_id, date, prob_cat_id, time, value, created_by, created_at)',
                values = `("${data.inc_id}", "${now_dt}", "${dta.prob_cat_id}", "${dta.Time}", "${dta.value}", "${data.user}", "${datetime}")`,
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
        select = 'a.inc_id, b.name as prob_cat, SUM(a.value) as value',
        whr = `a.prob_cat_id=b.id AND inc_id = "${inc_id}"`,
        order = `GROUP BY a.prob_cat_id ORDER BY a.prob_cat_id`;
    var dt = await F_Select(select, table_name, whr, order);
    // console.log(dt);
    res.send(dt);
})

BoardRouter.get('/prob_board_report', async (req, res) => {
    var inc_id = req.query.inc_id,
        table_name = 'td_prob_board a, md_prob_category b',
        select = 'a.id, a.inc_id, a.date, DATE_FORMAT(a.date, "%d/%m/%Y") AS date_format, a.prob_cat_id, b.name as prob_cat, a.time, DATE_FORMAT(a.time, "%h:%i %p") AS time_format, a.value',
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
        default:
            resDt = { suc: 0, msg: 'No Board Selected !!' }
            break;
    }
    res.send(resDt)
})

module.exports = { BoardRouter };