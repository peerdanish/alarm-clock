const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const uuidv4 = require('uuid').v4;

const cors = require('cors');
// const session = require('express-session');
const startDb = require('./database/init');
const userModel = require('./database/models/user');

startDb();

const createUserService = require('./services/user/createUser.service');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// app.use(
// 	session({
// 		secret: 'keyboard cat',
// 		resave: false,
// 		saveUninitialized: false,
// 		cookie: { secure: false },
// 		isLoggedIn: false,
// 		username: '',
// 	})
// );

const session = {};

var email;
var currentUser;
server.listen(3000, function () {
	console.log('server is running ');
});

app.route('/').get(async function (req, res) {
	const sessionId = req.headers.cookie?.split('=')[1];
	// console.log('Header ', req.headers);
	const userSession = session[sessionId];
	// console.log('SessionId : ', session[sessionId]);
	// console.log('SessionId : ', session);
	// console.log('In login after i click login : ', userSession);
	if (/*!req.session.isLoggedIn*/ !userSession) {
		res.render('login');
		return;
	}
	const email = userSession.email;
	let alarmData = await userModel.find({ email: /*req.session.email*/ email });
	// email = req.session.email;
	let alarms = alarmData[0].alarms;
	currentUser = /*session.currentUser*/ userSession.currentUser;
	res.render('home', {
		email: /*req.session.email */ userSession.email,
		alarms,
	});
});

app.route('/setAlarm').post(alarmData);

app
	.route('/login')
	.get(function (req, res) {
		// console.log('sfhdfhsdhfj');
		const sessionId = req.headers.cookie?.split('=')[1];
		// console.log('Sesssion in login : ', session);
		const userSession = session[sessionId];
		// console.log('In login after i click logout : ', userSession);
		if (userSession) {
			// console.log('User id in login ', req.session.isLoggedIn);
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
				const sessionId = uuidv4();
				session[sessionId] = {
					username: user[0].username,
					isLoggedIn: true,
					email: user[0].email,
					currentUser,
				};
				console.log('Session id = ', session);
				res.set('Set-Cookie', `session=${sessionId}`);
				console.log('Session = ', session);
				// req.session.isLoggedIn = true;
				// req.session.currentUser = currentUser;
				// req.session.username = user[0].username;
				// req.session.email = user[0].email;
				// email = user[0].email;
				// console.log('EMail : ', req.session.email);
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
let arr = [];
io.on('connection', async (socket) => {
	// let socketMap = {};
	console.log('User connected');
	// let email;
	socket.once('user', (email) => {
		// email = userEmail;
		console.log('email in socket ', email);

		if (socketMap[email] == undefined) {
			socketMap[email] = [socket.id];
		} else {
			socket.join(socketMap[email]);
		}

		console.log('EMAFAIDSFJ : ', email);

		console.log(socketMap);
		let interval = setInterval(async () => {
			let data = await userModel.find({ email: email });
			arr = [];
			if (data[0].alarms !== undefined) {
				arr.push(...data[0].alarms);
			}

			arr.forEach(async (alarm) => {
				let id;
				id = alarm._id.toString().split('"')[0];
				if (alarm.isExpired == false) {
					let result = checkExpired(alarm);
					console.log('Result : ', result);
					if (result) {
						alarm.isExpired = result;
						console.log('Inside result section ');
						// console.log('ID : ', id);

						await userModel
							.find({ 'alarms._id': id })
							.update(
								{ 'alarms.isExpired': false },
								{ $set: { 'alarms.$.isExpired': true } }
							)
							.then((err, data) => {
								if (err) {
									console.log('Error new : ', err.alarms);
								} else {
									console.log('Data  new : ', data);
								}
							});
					}
				}
				if (alarm.isExpired == false) {
					let result = checkAlarm(alarm);
					console.log('Alarm status : ', result);
					if (result) {
						await userModel
							.find({ 'alarms._id': id })
							.update(
								{ 'alarms.isExpired': false },
								{ $set: { 'alarms.$.isExpired': true } }
							);
						console.log('Email in current : ', email);
						io.to(socketMap[email]).emit('To-client', 'WAKE UP!');
						return;
					}
				}
				// console.log('Alarm after : ', alarm);
			});

			// let result = check(arr);

			// console.log('User alarms : ', arr);
		}, 1000);
	});
});

async function alarmData(req, res) {
	const sessionId = req.headers.cookie?.split('=')[1];
	const userSession = session[sessionId];
	console.log('REQ BODY : ', req.body);
	let alarmObj = await userModel
		.find({ _id: userSession.currentUser })
		.updateOne({
			$push: { alarms: req.body },
		});
	alarmArr.push(req.body);
	return;
}

function logoutUser(req, res) {
	const sessionId = req.headers.cookie?.split('=')[1];
	delete session[sessionId];
	// res.set('Set-cookie',`session=null`);
	res.clearCookie();
	// req.session.destroy();
	res.redirect('/login');
}

async function deleteAlarm(req, res) {
	const sessionId = req.headers.cookie?.split('=')[1];
	const userSession = session[sessionId];
	let id = req.params.id;
	let userId = userSession?.currentUser;
	await userModel
		.find({ _id: userId })
		.update({}, { $pull: { alarms: { _id: id } } });
	let alarms = await userModel.find({ _id: userId });
	alarmArr = [];
	alarmArr.push(...alarms[0].alarms);
}

function checkExpired(alarm) {
	console.log('Array in check : ', alarm);
	let date = new Date();
	let year = date.getFullYear();
	let month = date.getMonth() + 1;
	let day = date.getDate();
	let hour = date.getHours();
	let minutes = date.getMinutes();
	if (
		alarm.userYear < year ||
		alarm.userHour < hour ||
		alarm.userDay < day ||
		alarm.userMonth < month ||
		alarm.userHour < hour ||
		alarm.userMinute < minutes
	) {
		return true;
		// io.to(socketMap[email]).emit('To-client', 'WAKE UP!');
	} else {
		return false;
	}
}

function checkAlarm(alarm) {
	let date = new Date();
	let year = date.getFullYear();
	let month = date.getMonth() + 1;
	let day = date.getDate();
	let hour = date.getHours();
	let minutes = date.getMinutes();

	if (
		alarm.userYear == year &&
		alarm.userHour == hour &&
		alarm.userDay == day &&
		alarm.userMonth == month &&
		alarm.userHour == hour &&
		alarm.userMinute == minutes
	) {
		return true;
		// io.to(socketMap[email]).emit('To-client', 'WAKE UP!');
	}
	return false;
}
