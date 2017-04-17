const createKoaServer = require("./mock-servers/koa");
const request = require("supertest");
const expect = require("chai").expect;
const sinon = require("sinon");
const {ExplicitContext, Tracer} = require("zipkin");

let app, server, agent, record;
beforeEach("start koa server", function (done) {
	
	record = sinon.spy();
	const recorder = {record};
	const ctxImpl = new ExplicitContext();
	const tracer = new Tracer({recorder, ctxImpl});
	
	app = createKoaServer({tracer, ctxImpl});
	server = app.listen();
	agent = request.agent(server);
	done();
});

afterEach("stop koa server", function (done) {
	server.close(done);
});

describe("koa tracer middleware ", function () {
	
	it("accepts valid trace headers and records annotations via middleware", function (done) {

		agent
		.get("/")
		.set("Accept", "application/json")
		.expect(() => {

			const annotations = record.args.map(args => args[0]);
			
			expect(annotations[0].annotation.annotationType).to.equal("ServiceName");
			expect(annotations[0].annotation.serviceName).to.equal("koa-test");
		})
		.expect(200, done);

	});

	
});
