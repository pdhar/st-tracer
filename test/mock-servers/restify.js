"use strict";
const restify = require("restify");
const restifyMiddleware = require("../../index").restifyTracerMiddleware;
const koaRequest = require("../../index").koaRequest;
const Co = require("co");

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

	app.use(restifyMiddleware("restify-server", tracerOptions.tracer));

	app.get("/", (req, res, next)=>{
		

		// make another request back to koa service.
		console.log("@@@@@@@@@ NEED TO MAKE REQ", koaRequest);
		Co(function* () {

			return yield koaRequest.get({
				url: "http://localhost:3012/pets/tobi",
				json: true,
				tracer: tracerOptions.tracer
			});
		})
		.then((result) => {
			console.log("@@@@@@@@@@ REPLY ", result[0].body);
			// res.send(201);
		}, (err) => {
			console.log("ERROR: ", err);
			// res.send(422, err);
		})
		.then(() => {
			console.log("####### HIT ", pets.list());
			res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
			res.end(JSON.stringify(pets.list()));
		})
		.then(next);

	});

	return app;
};