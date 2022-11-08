const mongoose = require('mongoose');

const { Schema } = mongoose;

const alarmSchema = new Schema({
	label: String,
	date: String,
	time: String,
	createdBy: String,
	timestamps: true,
});

const alarmModel = new mongoose.model('alarm', alarmSchema);

module.exports = alarmModel;
