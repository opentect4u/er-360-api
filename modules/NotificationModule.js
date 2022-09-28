const db = require('../core/db');

module.exports = {
    Notificatio: (io) => {
        let sql = ''
        let sql1 = ''
        // sql = `SELECT * FROM td_notification WHERE view_flag = 'N' AND user = ${user.emp_code} GROUP BY TIME(created_at), activity ORDER BY id DESC LIMIT 4`
        // sql1 = `SELECT COUNT(id) total FROM td_notification WHERE view_flag = 'N' AND user = ${user.emp_code}`
        sql = `SELECT * FROM td_notification WHERE view_flag = 'N' ORDER BY user, id DESC`
        sql1 = `SELECT user, COUNT(id) total FROM td_notification WHERE view_flag = 'N' GROUP BY user ORDER BY user`
        db.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                io.emit('notification', err)
            } else {
                db.query(sql1, (error, res) => {
                    result.push({ total: res })
                    // console.log(result, res[0].total);
                    io.emit('notification', result)
                })
            }
        })
    },
    UserStatus: (io) => {
        var sql = `SELECT a.employee_id, a.emp_name, a.email, a.personal_cnct_no, a.user_type, a.emp_status, a.user_status, b.team_id, c.team_name, d.position, a.img,
		IF(a.user_status = 'L', TIMESTAMPDIFF(MINUTE,a.login_dt, NOW()), IF(a.user_status = 'O', TIMESTAMPDIFF(MINUTE,a.login_dt, a.logout_dt), 0)) last_login, DATE_FORMAT(a.login_dt, '%d/%m/%Y') log_dt,
        a.login_dt as last_log_time 
		FROM md_employee a, td_team_members b, md_teams c, md_position d 
		WHERE a.id=b.emp_id AND b.team_id=c.id AND a.emp_pos_id=d.id AND a.delete_flag = "N" AND a.employee_id > 0 AND a.emp_status = 'A'
		ORDER BY a.emp_name`;
        // console.log(sql);
        db.query(sql, (err, result) => {
            io.emit('user_status', { users: result });
        })
    },
    ActiveUser: (io) => {
        var sql = `SELECT employee_id, emp_name, email, personal_cnct_no, user_type, emp_status, user_status, img FROM md_employee WHERE user_status != 'O' AND employee_id > 0`;
        db.query(sql, (err, result) => {
            io.emit('active_user', { users: result });
        })
    },
    IncBoard: (io, inc_id) => {
        var sql = `SELECT id, inc_id, date, installation, coordinates, visibility, visibility_unit, wind_speed, wind_speed_unit, wind_direc, sea_state, temp, temp_unit, summary, status, time, people, env, asset, reputation FROM td_inc_board WHERE inc_id = "${inc_id}" ORDER BY id DESC`
        var res_dt = '';
        db.query(sql, (err, result) => {
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            console.log(res_dt);
            io.emit('inc_board', res_dt);
        })
    },
    VesselStatus: (io, inc_id) => {
        var sql = `SELECT id, inc_id, date, vessel_name, vessel_type, form_at, etd, to_at, eta, time_to_location, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time FROM td_vessel_board WHERE inc_id = "${inc_id}" ORDER BY id DESC`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('vessel_board', res_dt);
        })
    },
    HelicupterStatus: (io, inc_id) => {
        var sql = `SELECT id, inc_id, date, call_sign, heli_type, form_at, etd, to_at, eta, time_to_location, remarks, DATE_FORMAT(date, "%h:%i:%s %p") AS time FROM td_helicopter_board WHERE inc_id = "${inc_id}" ORDER BY id DESC`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('helicopter_board', res_dt);
        })
    },
    ProbStatus: (io, inc_id) => {
        var sql = `SELECT a.inc_id, b.name as prob_cat, SUM(a.value) as value, SUM(a.total_prob) total_prob FROM td_prob_board a, md_prob_category b WHERE a.prob_cat_id=b.id AND a.inc_id = "${inc_id}" GROUP BY a.prob_cat_id ORDER BY a.prob_cat_id`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('prob_board_dashboard', res_dt);
        })
    },
    CasualtyStatus: (io, inc_id) => {
        var sql = `SELECT a.full_name, (SELECT b.location FROM td_casualty_board_dt b WHERE b.board_id=a.id ORDER BY b.id DESC LIMIT 1) location, (SELECT b.emp_condition FROM td_casualty_board_dt b WHERE b.board_id=a.id ORDER BY b.id DESC LIMIT 1) emp_condition, (SELECT b.time FROM td_casualty_board_dt b WHERE b.board_id=a.id ORDER BY b.id DESC LIMIT 1) time FROM td_casualty_board a WHERE a.inc_id = "${inc_id}"`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('casualty', res_dt);
        })
    },
    EvacuationStatus: (io, inc_id) => {
        var sql = `SELECT id, inc_id, date, destination, dest_to, mode_of_transport, pob_remaining, remarks, time FROM td_evacuation_board WHERE inc_id = "${inc_id}" ORDER BY id DESC`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('evacuation_board', res_dt);
        })
    },
    EventStatus: (io, inc_id) => {
        var sql = `SELECT id, inc_id, date, situation_status, resource_assigned, time FROM td_events_log_board WHERE inc_id = "${inc_id}" ORDER BY id DESC`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('event_log_board', res_dt);
        })
    },
    IncObjStatus: (io, inc_id) => {
        var sql = `SELECT id, inc_id, op_period_from, op_period_to, obj_general, people, environment, assets, reputation, awareness FROM td_inc_obj_board WHERE inc_id = "${inc_id}" ORDER BY id DESC`
        db.query(sql, (err, result) => {
            // console.log(result);
            if (err) res_dt = { suc: 0, msg: err };
            else res_dt = { suc: 1, msg: result };
            io.emit('inc_obj', res_dt);
        })
    }
}