this.x = 9; //this aqui se refere ao objeto global "window" do navegador
this.a = 0;
var module = {
	x: 81,
	getX: function () {
		this.a = 1;
		return this.a;
	},
};

module.getX(); // 81

var retrieveX = module.getX;
retrieveX();
// retorna 9 - a função foi invocada no escopo global

// Criando uma nova função com 'this' vinculada ao módulo
// Programadores novatos podem confundir a variável x
// global com a propriedade x do módulo
// var boundGetX = retrieveX.bind(this);
// console.log(boundGetX()); // 81
console.log(retrieveX()); // 81
console.log(this.a); // 81
