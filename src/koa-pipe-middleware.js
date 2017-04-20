"use strict";
const { 
	Annotation, 
	Request
} = require("zipkin");

const request = require("koa-request");

module.exports = function(serviceHost, headers, { middleware = [] } = {}) {
	return function*() {
		console.log("PIPE MIDDLEWARE HIJACKER");

		let opts = {
			uri: serviceHost + this.request.path,
			qs: this.request.query,
			method: this.request.method
		};

		const tracer = require("./global-tracer")().tracer;

		let nextId;

		if(tracer._ctxImpl.getContext()){
			nextId = tracer.createChildId();
		} 
		else {
			nextId = tracer.createRootId();
		}

		tracer.setId(nextId);

		const traceId = tracer.id;
		const method = opts.method || "GET";
		
		tracer.recordServiceName("diagram-backend");
		tracer.recordRpc(method.toUpperCase());
		tracer.recordBinary("http.url", opts.uri);
		tracer.recordAnnotation(new Annotation.ClientSend());
		
		const zipkinOpts = Request.addZipkinHeaders({}, traceId);

		console.log("@@@@@@ zipkinOpts: ", zipkinOpts);
		console.log("before headers = ", headers);

		if (serviceHost) {
			tracer.recordAnnotation(new Annotation.ServerAddr({
				serviceName: serviceHost
			}));
		}

		if (opts.method.toUpperCase() !== "GET") {
			opts.json = this.request.body;
		}
		if (headers) {
			opts.headers = typeof headers === "object" ? headers : headers.call(this);
			opts.headers = Object.assign({}, opts.headers, zipkinOpts.headers);
		}
		try {

			console.log("###### OPTS: ", opts);

			for (let i = 0; i < middleware.length; i++) {
				yield middleware[i].call(this);
			}
			const response = yield request(opts);
			this.status = response.statusCode;
			this.body = response.body;

			tracer.scoped(() => {
				tracer.setId(traceId);
				tracer.recordBinary("http.status_code", response.statusCode.toString());
				tracer.recordBinary("http.text", JSON.stringify(response.body).toString());
				tracer.recordAnnotation(new Annotation.ClientRecv());
			});
		}
		catch (err) {
			this.status = 500;

			tracer.scoped(() => {
				tracer.setId(traceId);
				tracer.recordBinary("error", err.toString());
				tracer.recordAnnotation(new Annotation.ClientRecv());
			});
		}

	};
};