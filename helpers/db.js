const Sequelize = require("sequelize");
const user = require("./database/user");
const friends = require("./database/friends");
const news = require("./database/news");
const logger = require("./logger");

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
 * Lista todos os registros da tabela 'news'
 * @returns {Promise<Array>} - Uma Promise contendo um array de objetos que representam cada registro encontrado (apenas dataValues) ou um array vazio se não houver registros ou se ocorrer um erro
 */
const getNews = async () => {
	try {
		const _news = await news.findAll();
		logger.debug(
			"Obtido uma lista a partir da tabela 'news' do banco de dados"
		);
		return _news ? _news.map((n) => n.dataValues) : [];
	} catch (error) {
		logger.error(`Erro ao buscar os registros da tabela 'news': ${error}`);
		return [];
	}
};

/**
 * Atualiza os amigos de um usuário pelo ID
 * @param {string[]} lastNews - O ID da ultima noticia vista
 * @param {number} id - O ID do usuário
 * @returns {Promise<void>}
 */
const setUserNewsID = async (lastNews, id) => {
	const options = {
		news: lastNews,
	};
	await user.update(options, {
		where: { uid: id },
	});
};

/**
 * Atualiza os cristais de um usuário pelo ID
 * @param {number} crystal - A quantidade de cristais a ser atualizada
 * @param {number} id - O ID do usuário
 * @returns {Promise<void>}
 */
const updateCrystal = async (crystal, id) => {
	const options = {
		crystal,
	};
	await user.update(options, {
		where: { uid: id },
	});
};

/**
 * Atualiza a experiência de um usuário pelo ID
 * @param {number} experience - A quantidade de experiência a ser atualizada
 * @param {number} id - O ID do usuário
 * @returns {Promise<void>}
 */
const updateExperience = async (experience, id) => {
	const options = {
		experience,
	};
	await user.update(options, {
		where: { uid: id },
	});
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
	logger.debug(`Lista de amigos obtida para o usuário com ID ${id}`);
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
	getNews,
	setUserNewsID,
	updateFriends,
	createAccount,
	updateCrystal,
	updateExperience,
};
