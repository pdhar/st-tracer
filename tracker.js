const {BatchRecorder} = require("zipkin");
const {HttpLogger} = require("zipkin-transport-http");
const CLSContext = require("zipkin-context-cls");
const {Tracer} = require("zipkin");

module.exports = () => {
	console.log("######## INSIDE TRACKER ");

	const zipkinBaseUrl = "http://localhost:9411";
	const ctxImpl = new CLSContext("zipkin");

	this.recorder = new BatchRecorder({
		logger: new HttpLogger({
			endpoint: `${zipkinBaseUrl}/api/v1/spans`
		})
	});	

	this.ctxImpl = ctxImpl;
	this.tracer = new Tracer({ctxImpl, recorder: this.recorder});

	var foo = require("./global-tracer")();

	console.log(JSON.stringify(foo));

	return this;
};