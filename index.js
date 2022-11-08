const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const cors = require('cors');
const session = require('express-session');
const startDb = require('./database/init');
const userModel = require('./database/models/user');

startDb();

const createUserService = require('./services/user/createUser.service');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(
	session({
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false },
		isLoggedIn: false,
		username: '',
	})
);

var email;
var currentUser;
server.listen(3000, function () {
	console.log('server is running ');
});

app.route('/').get(async function (req, res) {
	if (!req.session.isLoggedIn) {
		console.log('I ran in home');
		res.render('login');
		return;
	}
	let alarmData = await userModel.find({ email: req.session.email });
	email = req.session.email;
	// console.log('Inside home one : ', alarmData[0].alarms);
	let alarms = alarmData[0].alarms;
	currentUser = req.session.currentUser;
	res.render('home', { email: req.session.email, alarms });
	startTimers(req.session.currentUser);
});

app.route('/setAlarm').post(alarmData);

app
	.route('/login')
	.get(function (req, res) {
		console.log('sfhdfhsdhfj');
		if (req.session.isLoggedIn) {
			console.log('User id in login ', req.session.isLoggedIn);
			res.redirect('/');
			return;
		}
		res.render('login');
	})
	.post(function (req, res) {
		getUser(req.body.email, req.body.password, function (err, user) {
			if (user != undefined) {
				currentUser = user[0]._id.toString();
			}
			if (user) {
				req.session.isLoggedIn = true;
				req.session.currentUser = currentUser;
				req.session.username = user[0].username;
				req.session.email = user[0].email;
				email = user[0].email;
				console.log('EMail : ', req.session.email);
				res.redirect('/');
			} else {
				res.render('login', {
					error: 'Invalid credentials ! Please Enter Correct details',
				});
			}
		});
	});

app
	.route('/signup')
	.get(function (req, res) {
		res.render('signup');
	})
	.post(function (req, res) {
		console.log('Here in signup post : ', req.body);
		checkUser(req.body.email, async function (err, data) {
			if (data.length == 0) {
				const user = {
					username: req.body.username,
					email: req.body.email,
					password: req.body.password,
				};
				try {
					await createUserService(user);
					res.render('login');
				} catch (err) {
					console.log(err);
				}
			} else {
				res.render('signup', { error: 'User already exists' });
				console.log('Error in signup', err);
			}
		});
	});
app.get('/logout', logoutUser);

app
	.route('/deleteAlarm/:id')
	.get(function (req, res) {
		res.redirect('/');
	})
	.post(deleteAlarm);
var alarmArr = [];
var socketMap = {};
// app.route('/startTimers').get();

async function startTimers(user) {
	console.log('Req body : ', user);
	io.on('connection', async (socket) => {
		console.log('User connnected with socket ');
		// console.log(socket.id);
		let data = await userModel.find({ _id: user });
		alarmArr = [];
		alarmArr.push(...data[0].alarms);
		console.log('Alarm arr : ', alarmArr);
		console.log('EMail in start timers : ', email);

		if (socketMap[email] == undefined) {
			socketMap[email] = [socket.id];
		} else {
			socket.join(socketMap[email]);
			// socketMap[email].push(socket.id);
		}
		// socket.join(socketMap[email]);
		console.log('socket map : ', socketMap);
		socket.on('start', () => {
			console.log('Inside user-data emit ');
			// alarmArr.push(body);
			console.log('Alarm array : ', alarmArr);
			alarmArr.forEach((alarm) => {
				console.log('Inside for each : ', alarm.isExpired);
				if (!alarm.isExpired) {
					console.log('THE FOREACH RAN ');
					let alarmID = setInterval(() => {
						console.log(alarmArr);
						let date = new Date();
						let year = date.getFullYear();
						let month = date.getMonth() + 1;
						let day = date.getDate();
						let hour = date.getHours();
						let minutes = date.getMinutes();
						console.log(
							alarm.userYear + '==' + year,
							alarm.userHour + '==' + hour,
							alarm.userDay + '==' + day,
							alarm.userMonth + '==' + month,
							alarm.userHour + '==' + hour,
							alarm.userMinute + '==' + minutes
						);
						if (
							alarm.userYear == year &&
							alarm.userHour == hour &&
							alarm.userDay == day &&
							alarm.userMonth == month &&
							alarm.userHour == hour &&
							alarm.userMinute == minutes
						) {
							console.log('Alarm time');
							io.to(socketMap[email]).emit('To-client', 'WAKE UP!');
							clearInterval(alarmID);
						}
					}, 1000);
				}
			});
		});
	});
}

//functions
function checkUser(email, callback) {
	userModel
		.find({ email: email })
		.then(function (data) {
			console.log('Data in checkUser function : ', data);
			callback(null, data);
		})
		.catch(function (err) {
			callback('user not found', err);
		});
}

function getUser(email, password, callback) {
	userModel
		.find({ email: email, password: password })
		.then(function (data) {
			callback(null, data);
		})
		.catch(function (err) {
			callback('Incorrect details');
		});
}

async function alarmData(req, res) {
	// console.log('Inside alarmData function : ', req.body);
	// let alarmObj = await userModel.find({ email: email });
	let alarmObj = await userModel
		.find({ _id: req.session.currentUser })
		.updateOne({
			$push: { alarms: req.body },
		});
	alarmArr.push(req.body);
	// console.log('Inside alarmobj : ', alarmObj);
	// let userData = {
	// 	userYear: parseInt(req.body.userYear),
	// 	userMonth: parseInt(req.body.userMonth),
	// 	userDay: parseInt(req.body.userDay),
	// 	userHour: parseInt(req.body.userHour),
	// 	userMinute: parseInt(req.body.userMinute),
	// };
	// console.log('Parse data : ', userData);
	// let alarmID = setInterval(() => {
	// 	console.log('Hi');
	// 	let date = new Date();
	// 	let year = date.getFullYear();
	// 	let month = date.getMonth() + 1;
	// 	let day = date.getDay() - 1;
	// 	let hour = date.getHours();
	// 	let minutes = date.getMinutes();
	// 	console.log(
	// 		userData.userYear == year,
	// 		userData.userHour == hour,
	// 		userData.userDay == day,
	// 		userData.userMonth == month,
	// 		userData.userHour == hour,
	// 		userData.userMinute == minutes
	// 	);
	// 	if (
	// 		userData.userYear == year &&
	// 		userData.userHour == hour &&
	// 		userData.userDay == day &&
	// 		userData.userMonth == month &&
	// 		userData.userHour == hour &&
	// 		userData.userMinute == minutes
	// 	) {
	// 		console.log('Alarm time');
	// 		clearInterval(alarmID);
	// 		io.emit('receive-message', 'WAKE UP!');
	// 		res.render('home');
	// 	}
	// }, 1000);
}

function logoutUser(req, res) {
	req.session.destroy();
	res.redirect('/login');
}

async function deleteAlarm(req, res) {
	let id = req.params.id;
	console.log(req.session.currentUser);
	let userId = req.session.currentUser;
	await userModel
		.find({ _id: userId })
		.update({}, { $pull: { alarms: { _id: id } } });
	let alarms = await userModel.find({ _id: userId });
	alarmArr = [];
	alarmArr.push(...alarms[0].alarms);
	console.log('ID = ', id);
}

// await function getAlarmData()
