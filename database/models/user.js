const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
	username: String,
	email: String,
	password: String,
	alarms: [
		{
			userHour: Number,
			userYear: Number,
			userMonth: Number,
			userDay: Number,
			userMinute: Number,
			isExpired: Boolean,
		},
	],
});

const userModel = new mongoose.model('user', userSchema);

module.exports = userModel;
