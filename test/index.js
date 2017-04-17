const createKoaServer = require("./mock-servers/koa");
const fetch = require("node-fetch");
let koaServer, baseUrl;

beforeEach("start koa server", function (done) {
	koaServer = createKoaServer().listen(function () {
		baseUrl = `http://localhost:${this.address().port}/`;
		done();
	});
});

afterEach("stop koa server", function (done) {
	koaServer.close(done);
});

describe("koa tracer middleware ", function () {
	it("accepts valid trace headers and records annotations via middleware", function (done) {
		fetch(baseUrl, {
			method: "get",
			headers: {
				"X-B3-TraceId": "aaa",
				"X-B3-SpanId": "bbb",
				"X-B3-Flags": "1"
			}
		})
		.then(res => res.json())
		.then((res) => {
			console.log("RES: ", res);
			done();
		})
		.catch(err => {
		//   koaServer.close();
			done(err);
		});
	});
});
