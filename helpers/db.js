const Sequelize = require("sequelize");
const user = require("./user");
const friends = require("./friends");

/**
 * Retorna um usuário pelo ID
 * @param {number} id - O ID do usuário
 * @returns {Promise<Object>} - O usuário encontrado ou nulo
 */
const getUserById = async (id) => {
	const _user = await user.findByPk(id);
	return _user?.dataValues ?? null;
};

/**
 * Retorna um usuário pelo nome de usuário
 * @param {string} username - O nome de usuário
 * @returns {Promise<Object>} - O usuário encontrado ou nulo
 */
const getUserByUsername = async (username) => {
	const _user = await user.findOne({
		where: Sequelize.where(
			Sequelize.fn("lower", Sequelize.col("username")),
			Sequelize.fn("lower", username)
		),
	});
	return _user?.dataValues ?? null;
};

/**
 * Retorna um usuário pelo endereço de e-mail
 * @param {string} email - O endereço de e-mail
 * @returns {Promise<Object>} - O usuário encontrado ou nulo
 */
const getUserByEmail = async (email) => {
	const _user = await user.findOne({
		where: Sequelize.where(
			Sequelize.fn("lower", Sequelize.col("email")),
			Sequelize.fn("lower", email)
		),
	});
	return _user?.dataValues ?? null;
};

/**
 * Retorna os amigos de um usuário pelo ID, criando uma entrada se ela não existir
 * @param {number} id - O ID do usuário
 * @returns {Promise<Object>} - Os amigos encontrados ou um objeto vazio se não houver amigos
 */
const getFriendsOrCreateByID = async (id) => {
	const [_friends] = await friends.findOrCreate({
		where: { uid: id },
		defaults: { uid: id },
	});
	const ObjFriends = {};
	const keys = [
		"friendsAccepted",
		"friendsAcceptedNew",
		"friendsIncoming",
		"friendsIncomingNew",
		"friendsOutgoing",
	];
	keys.forEach((key) => {
		ObjFriends[key] = JSON.parse(_friends[key] ?? "[]");
	});
	return ObjFriends;
};

/**
 * Atualiza os amigos de um usuário pelo ID
 * @param {string[]} keys - As chaves dos amigos a serem atualizados
 * @param {Object} friendsObj - O objeto de amigos atualizado
 * @param {number} id - O ID do usuário
 * @returns {Promise<void>}
 */
const updateFriends = async (keys, friendsObj, id) => {
	const options = {};
	keys.forEach((key) => {
		options[key] = JSON.stringify(friendsObj[key] ?? []);
	});
	await friends.update(options, {
		where: { uid: id },
	});
};
/**
	
	* Cria uma conta de usuário com o nome de usuário e senha fornecidos
	* @param {string} username - O nome de usuário
	* @param {string} password - A senha
	* @returns {Promise<Object>} - O usuário criado
	*/
const createAccount = async (username, password) => {
	return await user.create({ username, password });
};
module.exports = {
	getUserById,
	getUserByUsername,
	getUserByEmail,
	getFriendsOrCreateByID,
	updateFriends,
	createAccount,
};
