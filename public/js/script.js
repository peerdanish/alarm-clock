const submitBtn = document.getElementById('submitData');
const timeBtn = document.getElementById('time');
const dateBtn = document.getElementById('date');
const parent = document.getElementById('parent');
submitBtn.addEventListener('click', getData);

var socket = io();
socket.on('connection', () => {
	console.log('Connection id : ', socket.id);
});
socket.on('To-client', (message) => {
	alert(message);
});

window.addEventListener('load', (event) => {
	socket.emit('start');
});
console.log(socket.id);

// window.onload(function () {
// 	let request = new XMLHttpRequest();
// 	request.open('get', '/startTimers');
// 	request.send();
// });

function getData(e) {
	e.preventDefault();
	let time = timeBtn.value;
	let date = dateBtn.value;
	let [userHour, userMinute] = time.split(':');
	let [userYear, userMonth, userDay] = date.split('-');
	let d = new Date();
	let userSecs = d.getSeconds();
	let body = {
		userHour: parseInt(userHour),
		userYear: parseInt(userYear),
		userMonth: parseInt(userMonth),
		userDay: parseInt(userDay),
		userMinute: parseInt(userMinute),
		isExpired: false,
	};
	body = validAlarm(body);
	console.log('In script afte validation : ', body);
	addToList(body);
	socket.emit('user-data', body);

	let request = new XMLHttpRequest();
	request.open('POST', '/setAlarm');
	request.setRequestHeader('Content-Type', 'application/json');
	request.send(JSON.stringify(body));
}

function addToList(body) {
	let element = document.createElement('div');
	element.setAttribute('class', 'alarm-item');

	element.innerHTML = `
		<div class="time-top">
			<div class="time">${body.userHour} : ${body.userMinute}</div>
				<div class="date">${body.userDay}-${body.userMonth}-${body.userYear}</div>
			</div>
		</div>
		<div class="delete">
			<button onclick="deleteAlarm(this)">Delete</button>
		</div>
		`;
	parent.appendChild(element);
}

function deleteAlarm(e) {
	let id = e.id;
	let item = e.parentElement.parentElement;
	item.remove();

	let request = new XMLHttpRequest();
	request.open('POST', `/deleteAlarm/${id}`);
	request.send();
}

function validAlarm(alarm) {
	let date = new Date();
	let year = date.getFullYear();
	let month = date.getMonth() + 1;
	let day = date.getDate();
	let hour = date.getHours();
	let minutes = date.getMinutes();
	let body = JSON.parse(JSON.stringify(alarm));
	console.log('Body in script : ', body);
	if (
		year <= alarm.userYear &&
		month <= alarm.userMonth &&
		day <= alarm.userDay &&
		hour <= alarm.userHour &&
		minutes <= alarm.userMinute
	) {
		console.log('Valid alarm ');
		return body;
	} else {
		body.isExpired = true;
		return body;
	}
}
