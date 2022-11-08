const mongoose = require('mongoose');

module.exports = function () {
	mongoose
		.connect(
			'mongodb+srv://danish478:danish478@cq-6.5lcbyyz.mongodb.net/alarm?retryWrites=true&w=majority'
		)
		.then(function () {
			console.log('Connected to db');
		})
		.catch((e) => {
			console.log(e);
		});
};
