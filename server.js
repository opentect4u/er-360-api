const express = require('express'),
	bodyParser = require('body-parser'),
	cors = require('cors'),
	app = express(),
	port = process.env.PORT || 3000,
	http = require('http'),
	socketIO = require('socket.io'),
	db = require('./core/db'),
	fs = require('fs');
const dateFormat = require('dateformat');

// USING CORS //
app.use(cors());
// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.use(express.static(__dirname + "/assets"))

/////////////////////////////////////////////////////////////////////////
const { AdmRouter } = require('./route/AdminRouter');
const { TeamRouter } = require('./route/TeamRouter');
const { LoginRouter } = require('./route/LoginRouter');
const { IncidentRouter } = require('./route/IncidentRouter');
const { BoardRouter } = require('./route/BoardRouter');
const { F_Select } = require('./modules/MasterModule');
const { MessageRouter } = require('./route/MessageRouter');
const { ActivationRouter } = require('./route/ActivationRouter');
const { FormRouter } = require('./route/FormsChecklistRouter');
const { CallLogRouter } = require('./route/CallLogRouter');
const { LogsheetRouter } = require('./route/LogsheetRouter');
const { UserRouter } = require('./route/UserRouter');
const { RepoRouter } = require('./route/RepositoryRouter');
const { ReportRouter } = require('./route/ReportRouter');
const { DashboardRouter } = require('./route/DashboardRouter');
/////////////////////////////////////////////////////////////////////////

app.use(AdmRouter);

app.use(TeamRouter);

app.use(LoginRouter);

app.use(IncidentRouter);

app.use(BoardRouter);

app.use(MessageRouter);

app.use(ActivationRouter);

app.use(FormRouter);

app.use(CallLogRouter);

app.use(LogsheetRouter);

app.use(UserRouter);

app.use(RepoRouter);

app.use(ReportRouter);

app.use(DashboardRouter);

app.get('/', (req, res) => {
	res.send('Welcome');
})

app.get('/send_mail', async (req, res) => {
	const { AssignTeamMail } = require('./modules/EmailModule');
	var data = req.query;
	var res_dt = await AssignTeamMail(data.email, data.name, data.team);
	res.send(res_dt)
})

app.get('/test1', async (req, res) => {
	var datetime = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
	var sql = `SELECT id, team_id, inc_id FROM td_activation WHERE active_flag = 'Y'`;
	db.query(sql, (err, result) => {
		if (result.length > 0) {
			var team_id = result[0].team_id;
			var chk_sql = `SELECT MAX(id) id, team_id, MAX(from_date) from_date, MAX(to_date) to_date FROM td_team_log WHERE team_id = ${team_id}`;
			db.query(chk_sql, (err, dt_res) => {
				if (err) { res.send(err); }
				else {
					var new_dt = new Date(dt_res[0].to_date);
					if (dateFormat(new_dt, 'yyyy-mm-dd') != dateFormat(new Date(), 'yyyy-mm-dd')) {
						var dt = dateFormat(new_dt.setDate(new_dt.getDate() + 1), 'yyyy-mm-dd');
						var up_sql = `UPDATE td_team_log SET to_date = "${dt}", modified_by = 'SYSTEM', modified_at = "${datetime}" WHERE id = ${dt_res[0].id}`;
						db.query(up_sql, (err, last_id) => {
							if (err) console.log(err)
							else console.log('Success')
						})
						//res.send(up_sql)
					}
					//res.send({dt, old_dt: dateFormat(dt_res[0].to_date, 'yyyy-mm-dd')});
				}
			})
		}

	})
})

app.get('/test2', async (req, res) => {
	var inc_id = 1;
	var time = [{ 'from': '00:00:00', 'to': '03:59:59', 'serial': 1 }, { 'from': '04:00:00', 'to': '07:59:59', 'serial': 2 }, { 'from': '08:00:00', 'to': '11:59:59', 'serial': 3 }, { 'from': '12:00:00', 'to': '15:59:59', 'serial': 4 }, { 'from': '16:00:00', 'to': '19:59:59', 'serial': 5 }, { 'from': '20:00:00', 'to': '23:59:59', 'serial': 6 }];
	var dt = {};
	for (let i = 0; i < time.length; i++) {
		var result = await GetRes(time[i].from, time[i].to, inc_id);
		dt[time[i].serial] = result.msg;
	}
	res.send(dt)
})

app.get('/test3', async (req, res) => {
	var s1_id = req.query.s1_id
	var s2_id = req.query.s2_id
	var s3_id = req.query.s3_id

	var data1 = { user: 'Tanmoy Mondal', room: 1, emp_code: '32' }
	var data2 = { user: 'Subham Samanta', room: 1, emp_code: '132' }
	var data3 = { user: 'Siman Mitra', room: 1, emp_code: '134' }
	var arr = [];
	arr[s1_id] = data1
	arr[s2_id] = data2
	arr[s3_id] = data3
	// console.log('before', arr);
	// var dt = [{ user: 'Tanmoy Mondal', room: 1, emp_code: '32' }, { user: 'Subham Samanta', room: 1, emp_code: '132' }, { user: 'Siman Mitra', room: 1, emp_code: '134' }];
	// var i = dt.findIndex(d => d.emp_code == '32')
	// console.log('before', dt);
	// dt.splice(dt.findIndex(d => d.emp_code == '32'), 1)

	// arr.splice(arr.findIndex(dt => dt['h1SFaxZs36OjHdPxAAAC']), 1)
	// console.log('after', arr);
	// console.log(i);

})

const GetRes = (frm, to, inc_id) => {
	let sql = `SELECT a.prob_cat_id, b.name as prob_cat, SUM(a.value) AS value FROM td_prob_board a, md_prob_category b WHERE a.prob_cat_id=b.id AND a.time >= '${frm}' AND a.time <= '${to}' AND a.inc_id = "${inc_id}" GROUP BY b.id ORDER BY b.id`;
	return new Promise((resolve, reject) => {
		db.query(sql, (err, result) => {
			resolve({ msg: result })
		})
	})
}
//app.listen(port, (err) => {
//    if (err) console.log(err);
//    else console.log(`App is Running at PORT - ${port}`);
//})

const server = http.createServer(app)
const io = socketIO(server, {
	cors: {
		origin: ["https://verm.opentech4u.co.in", "http://localhost:4200"]
	}
})

var user_data = []
// Handle connection
io.on('connection', async function (socket) {
	console.log(`Connected succesfully to the socket ... ${socket.id}`);
	setInterval(function () {
		var sql = `SELECT employee_id, emp_name, email, personal_cnct_no, user_type, emp_status, user_status, img FROM md_employee WHERE user_status != 'O' AND employee_id > 0`;
		db.query(sql, (err, result) => {
			socket.emit('active_user', { users: result });
		})
	}, 10000);

	setInterval(function () {
		//var sql = `SELECT employee_id, emp_name, email, personal_cnct_no, user_type, emp_status, user_status FROM md_employee WHERE delete_flag = "N" AND employee_id > 0 AND emp_status = 'A' ORDER BY emp_name`;
		var sql = `SELECT a.employee_id, a.emp_name, a.email, a.personal_cnct_no, a.user_type, a.emp_status, a.user_status, b.team_id, c.team_name, d.position, a.img FROM md_employee a, td_team_members b, md_teams c, md_position d WHERE a.id=b.emp_id AND b.team_id=c.id AND a.emp_pos_id=d.id AND a.delete_flag = "N" AND a.employee_id > 0 AND a.emp_status = 'A' ORDER BY a.emp_name`;
		db.query(sql, (err, result) => {
			// console.log(result);
			socket.emit('user_status', { users: result });
		})
	}, 10000);

	setInterval(function () {
		for (let user of user_data) {
			let sql = ''
			let sql1 = ''
			sql = `SELECT * FROM td_notification WHERE view_flag = 'N' AND user = ${user.emp_code} GROUP BY TIME(created_at), activity ORDER BY id DESC LIMIT 4`
			sql1 = `SELECT COUNT(id) total FROM td_notification WHERE view_flag = 'N' AND user = ${user.emp_code}`
			// console.log(sql);
			db.query(sql, (err, result) => {
				if (err) {
					console.log(err);
					socket.broadcast.to(user.s_id).emit('notification', err)
				} else {
					db.query(sql1, (error, res) => {
						result.push({ total: res[0].total })
						// console.log(result, res[0].total);
						socket.broadcast.to(user.s_id).emit('notification', result)
					})

				}
			})
		}
	}, 10000)

	socket.on('join', (data) => {
		console.log(`${data.user} join the room ${data.room}`);
		data['s_id'] = socket.id
		user_data.push(data)
		// console.log(data);
		socket.broadcast.emit('newUserJoined', { user: data.user, msg: 'has joined' });
	})

	socket.on('notification', () => {
		if (user_data.length > 0) {
			for (let user of user_data) {
				let sql = ''
				let sql1 = ''
				sql = `SELECT * FROM td_notification WHERE view_flag = 'N' AND user = ${user.emp_code} GROUP BY TIME(created_at), activity ORDER BY id DESC LIMIT 4`
				sql1 = `SELECT COUNT(id) total FROM td_notification WHERE view_flag = 'N' AND user = ${user.emp_code}`
				db.query(sql, (err, result) => {
					if (err) {
						console.log(err);
						socket.broadcast.to(user.s_id).emit('notification', err)
					} else {
						db.query(sql1, (error, res) => {
							result.push({ total: res[0].total })
							// console.log(result, res[0].total);
							socket.broadcast.to(user.s_id).emit('notification', result)
						})
					}
				})
			}
		}
	})

	socket.on('message', (data) => {
		var buffer = data.file,
			file_name = buffer.length > 0 ? data.file_name : '',
			file_flag = buffer.length > 0 ? 1 : 0;
		if (file_name != '') {
			upload_status = fs.writeFileSync('assets/uploads/' + file_name, buffer)
		}
		var datetime = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')
		let sql = `INSERT INTO td_chat (inc_id, chat_dt, employee_id, chat, file) VALUES ("${data.inc_id}", "${datetime}", "${data.emp_id}", "${data.message}", "${file_name}")`;
		console.log(sql);
		db.query(sql, (err) => {
			if (err) console.log(err);
		})
		var broadcast_data = {
			user: data.user,
			message: data.message,
			date_time: dateFormat(new Date(), 'dd/mm/yyyy HH:MM:ss'),
			emp_id: data.emp_id,
			file_name,
			file_flag
		};
		socket.broadcast.emit('message', broadcast_data);
	});

	// socket.on('message', (data) => {
	//     // console.log(data);
	//     // console.log(`${socket.id.substr(0, 2)} said ${message}`);
	//     var datetime = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')
	//     let sql = `INSERT INTO td_chat (inc_id, chat_dt, employee_id, chat) VALUES ("${data.inc_id}", "${datetime}", "${data.emp_id}", "${data.message}")`;
	//     db.query(sql, (err) => {
	//         if (err) console.log(err);
	//     })
	//     socket.broadcast.emit('message', { user: data.user, message: data.message, date_time: dateFormat(new Date(), 'dd/mm/yyyy HH:MM:ss'), emp_id: data.emp_id });
	//     //socket.broadcast.emit('message', {user: data.user, message: data.message, date_time: dateFormat(new Date(), 'dd/mm/yyyy HH:MM:ss')});
	// });

	socket.on('disconnect', () => {
		console.log('a user disconnected!');
		// console.log('disconnect', socket.id);
		user_data.splice(user_data.findIndex(dt => dt.s_id == socket.id), 1)

		// console.log('out', user_data);
		// var sql = `UPDATE md_employee SET user_status = 'O' WHERE employee_id = ${user[socket.id]}`;
		// db.query(sql, (err) => {
		//     if(err) console.log(err);
		//     else{ 
		// if(user.emp_id){
		//     const index = user.findIndex(dt => dt.socket_id == socket.id);
		//     console.log(index);
		//     user.splice(index, 1);
		// }

		// // }
		// console.log('dis');
		// console.log(user);
		// })
	});
});

server.listen(port, (err) => {
	if (err) console.log(err);
	else console.log(`App is Running at PORT - ${port} && HOST - http://localhost:${port}`);
});