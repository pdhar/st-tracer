const {BatchRecorder, Tracer} = require("zipkin");
const {HttpLogger} = require("zipkin-transport-http");
const CLSContext = require("zipkin-context-cls");

var STracker = (() => {
	function STracker(){
		this.localVariable = 5;

		const zipkinBaseUrl = "http://localhost:9411";
		
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


var instance1 = new STracker();
var instance2 = new STracker();

console.log(instance1 === instance2); // true

console.log(instance1.localVariable, instance2.localVariable); // 5 5

instance1.localVariable = 20;
console.log(instance1.localVariable, instance2.localVariable); // 20 20

console.log(instance1.getLocalVariable()); // 20

module.exports = function () {
	return new STracker();
};