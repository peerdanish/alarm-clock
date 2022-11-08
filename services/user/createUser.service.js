const UserModel = require('../../database/models/user');

module.exports = async function (user) {
	const updatedUser = await UserModel.create(user);
	console.log('User created :', updatedUser);
	return;
};
