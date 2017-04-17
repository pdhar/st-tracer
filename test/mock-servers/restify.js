"use strict";
const restify = require("restify");
const restifyMiddleware = require("../../src/restify-middleware");

module.exports = function (tracerOptions) {
	const app = restify.createServer();

	console.log("tracerOptions ", tracerOptions);
	if(!tracerOptions)
		tracerOptions = require("../../src/global-tracer")();

	const db = {
		tobi: { name: "tobi", species: "ferret" },
		loki: { name: "loki", species: "ferret" },
		jane: { name: "jane", species: "ferret" }
	};

	const pets = {
		list: () => {
			const names = Object.keys(db);
			
			return { pets:  names.join(", ") };
		},

		show: (ctx, name) => {
			
			const pet = db[name];
			if (!pet) return ctx.throw("cannot find that pet", 404);
			ctx.body = pet.name + " is a " + pet.species;
		}
	};

	// app.use(restifyMiddleware("restify-server", tracerOptions));

	app.get("/", (req, res, next)=>{
		console.log("####### HIT ", pets.list());
		res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
		res.end(JSON.stringify(pets.list()));

		return next();
		
	});

	return app;
};