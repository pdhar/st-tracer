const {BatchRecorder, Tracer} = require("zipkin");
const {HttpLogger} = require("zipkin-transport-http");
const CLSContext = require("zipkin-context-cls");

var STracker = (() => {
	function STracker(){
		this.localVariable = 5;

		const zipkinBaseUrl = process.env.zipkinUrl || "http://localhost:9411";
		
		this.ctxImpl = new CLSContext("zipkin");

		this.recorder = new BatchRecorder({
			logger: new HttpLogger({
				endpoint: `${zipkinBaseUrl}/api/v1/spans`
			})
		});	

		this.tracer = new Tracer({ctxImpl: this.ctxImpl, recorder: this.recorder});
	}

	// Object can have instance methods as usually.
	STracker.prototype.getLocalVariable = function() {
		return this.localVariable;
	};

	var instance;

	return function() {
		if (!instance) {
			instance = new STracker();
		}
		return instance;
	};
})();

module.exports = function () {
	return new STracker();
};