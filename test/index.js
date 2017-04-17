const createKoaServer = require("./mock-servers/koa");
const createRestifyServer = require("./mock-servers/restify");

const request = require("supertest");
const expect = require("chai").expect;
const sinon = require("sinon");
const {ExplicitContext, Tracer} = require("zipkin");

let app, server, agent, record;
let app_2, server_2, record_2;

beforeEach("start restify server", function (done) {
	// Create a restify server.
	record_2 = sinon.spy();
	const recorder = {record: record_2};
	const ctxImpl = new ExplicitContext();
	const tracer = new Tracer({recorder, ctxImpl});
	
	app_2 = createRestifyServer({tracer, ctxImpl});
	server_2 = app_2.listen();

	done();
});

afterEach("stop restify server", function (done) {
	server_2.close(done);
});

describe("for a running restify service", function() {

	beforeEach("start koa server", function (done) {

		record = sinon.spy();
		const recorder = {record};
		const ctxImpl = new ExplicitContext();
		const tracer = new Tracer({recorder, ctxImpl});
		
		app = createKoaServer({tracer, ctxImpl, restifyUrl: `http://localhost:${server_2.address().port}`});
		server = app.listen();
		agent = request.agent(server);

		done();
	});

	afterEach("stop koa server", function (done) {
		server.close(done);
	});

	describe(", koa tracer middleware should", function () {
		
		it("accept valid trace headers and records annotations via middleware", function (done) {

			agent
			.get("/")
			.set("Accept", "application/json")
			.expect(() => {

				const annotations = record.args.map(args => args[0]);
				
				expect(annotations[0].annotation.annotationType).to.equal("ServiceName");
				expect(annotations[0].annotation.serviceName).to.equal("koa-test");
				
				// Verify that restify annotation have been added.
				const annotations_2 = record_2.args.map(args => args[0]);
				console.log("@@@@@@@@ annotations_2 ", annotations_2);
			})
			.expect(200, done);

		});
	});
});