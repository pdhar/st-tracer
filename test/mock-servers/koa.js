"use strict";
const koa = require("koa");
const _ = require("koa-route");
const koaMiddleware = require("../../src/koa-middleware");

module.exports = function (tracerOptions) {

	const app = new koa();
	
	if(!tracerOptions)
		tracerOptions = require("../../src/global-tracer")();

	const db = {
		tobi: { name: "tobi", species: "ferret" },
		loki: { name: "loki", species: "ferret" },
		jane: { name: "jane", species: "ferret" }
	};

	const pets = {
		list: (ctx) => {
			const names = Object.keys(db);
			
			ctx.body = { pets:  names.join(", ") };
		},

		show: (ctx, name) => {
			
			const pet = db[name];
			if (!pet) return ctx.throw("cannot find that pet", 404);
			ctx.body = pet.name + " is a " + pet.species;
		}
	};

	app.use(koaMiddleware("koa-test", tracerOptions.tracer, tracerOptions.ctxImpl));
	app.use(_.get("/", pets.list));
	app.use(_.get("/pets/:name", pets.show));

	return app;
};