const express = require('express');
const { F_Insert, F_Select, CreateActivity } = require('../modules/MasterModule');
const dateFormat = require('dateformat');

const DashboardRouter = express.Router();

DashboardRouter.get('/inc_adm_dashboard', async (req, res) => {
    var table_name = `(SELECT COUNT(id) AS closed_inc, 0 opened_inc, 0 approved_inc, 0 tot_emp, 0 tot_team FROM td_incident WHERE inc_status = 'O'
UNION
SELECT 0 closed_inc, COUNT(id) opened_inc, 0 approved_inc, 0 tot_emp, 0 tot_team FROM td_incident WHERE inc_status = 'C'
UNION
SELECT 0 closed_inc, 0 opened_inc, COUNT(id) approved_inc, 0 tot_emp, 0 tot_team FROM td_incident WHERE approval_status = 'A'
UNION
SELECT 0 closed_inc, 0 opened_inc, 0 approved_inc, COUNT(id) tot_emp, 0 tot_team FROM md_employee WHERE user_type != 'A' AND emp_status = 'A'
UNION
SELECT 0 closed_inc, 0 opened_inc, 0 approved_inc, 0 tot_emp, COUNT(id) tot_team FROM md_teams WHERE delete_flag = 'N')a`,
        select = 'SUM(closed_inc) closed_inc, SUM(opened_inc) opened_inc, SUM(approved_inc) approved_inc, SUM(tot_emp) tot_emp, SUM(tot_team) tot_team',
        whr = null;
    var dt = await F_Select(select, table_name, whr, null);
    res.send(dt);
})

DashboardRouter.get('/team_adm_dashboard', async (req, res) => {
    var now_dt = dateFormat(new Date(), "yyyy-mm-dd");
    var table_name = `td_team_log a, md_teams b, md_team_type c, td_team_members d, md_employee e`,
        select = 'a.id, a.team_id, DATE_FORMAT(a.from_date, "%d/%m/%Y") from_date, DATE_FORMAT(a.to_date, "%d/%m/%Y") to_date, b.team_name, c.team_type, c.team_short_code, e.emp_name, e.email, e.personal_cnct_no per_no, e.er_cnct_no er_no, e.user_type',
        whr = `a.team_id=b.id AND b.team_type_id=c.id AND a.team_id=d.team_id AND d.emp_id=e.id AND a.from_date <= '${now_dt}' AND a.to_date >= '${now_dt}'`,
        order = `GROUP BY a.team_id, d.emp_id`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

DashboardRouter.get('/active_emp_dashboard', async (req, res) => {
    var table_name = `td_activation a, td_team_members b, md_teams c, md_team_type d, md_employee e`,
        select = 'a.id, c.team_name, d.team_type, d.team_short_code, e.emp_name, e.user_type, e.personal_cnct_no per_no, e.er_cnct_no er_no',
        whr = `a.team_id=b.team_id AND a.team_id=c.id AND c.team_type_id=d.id AND b.emp_id=e.id AND a.active_flag = 'Y'`,
        order = `GROUP BY a.inc_id, e.id ORDER BY e.user_type, e.emp_name`;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

DashboardRouter.get('/get_incident_dtls', async (req, res) => {
    var inc_id = req.query.id,
        table_name = `td_incident a, md_incident_type b, md_location c, md_tier d`,
        select = 'a.id, a.inc_no, a.inc_dt, b.incident_name inc_type, a.inc_name, c.location_name, c.offshore_name, c.offshore_latt o_latt, c.offshore_long o_long, d.tier_type initial_tier, a.inc_status, a.brief_desc, a.close_date, (SELECT e.tier_type FROM md_tier e WHERE a.final_tier_id=e.id) final_tier, a.closing_remarks, a.close_date',
        whr = `a.inc_type_id=b.id AND a.inc_location_id=c.id AND a.initial_tier_id=d.id AND a.id="${inc_id}"`,
        order = null;
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

module.exports = { DashboardRouter }