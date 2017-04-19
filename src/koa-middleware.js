const helpers = require("./helpers");

const {
	Annotation, 
	HttpHeaders: Header,
	TraceId,
	option: {Some}
} = require("zipkin");

module.exports = (serviceName, tracer) => {

	console.log("##### INSIDE KOA MIDDLEWARE: ", serviceName);

	if(!tracer)
		tracer = require("./global-tracer")().tracer;

	return function* (next) {

		this.set("Access-Control-Allow-Headers", [
			"Origin", "Accept", "X-Requested-With", "X-B3-TraceId",
			"X-B3-ParentSpanId", "X-B3-SpanId", "X-B3-Sampled"
		].join(", "));

		if (helpers.containsRequiredHeaders(this.req.headers)) {

			const spanId = helpers.readHeader(this.req.headers, Header.SpanId);
			spanId.ifPresent(sid => {
				const traceId = helpers.readHeader(this.req.headers, Header.TraceId);
				const parentSpanId = helpers.readHeader(this.req.headers, Header.ParentSpanId);
				const sampled = helpers.readHeader(this.req.headers, Header.Sampled);
				const flags = helpers.readHeader(this.req.headers, Header.Flags).flatMap(helpers.stringToIntOption).getOrElse(0);
				
				const id = new TraceId({
					traceId,
					parentId: parentSpanId,
					spanId: sid,
					sampled: sampled.map(helpers.stringToBoolean),
					flags
				});
				tracer.setId(id);
			});
		} 
		else {

			console.log("######## header not found ");
			// No Header Present, create a new Trace.
			tracer.setId(tracer.createRootId());
			console.log("####### TRACER ", tracer);
		}

		const id = tracer.id;

		tracer.recordServiceName(serviceName);
		tracer.recordRpc("GET");
		tracer.recordAnnotation(new Annotation.ServerRecv());

		const onCloseOrFinish = () => {
			this.res.removeListener("close", onCloseOrFinish);
			this.res.removeListener("finish", onCloseOrFinish);

			tracer.scoped(() => {
				tracer.setId(id);
				tracer.recordBinary("http.status_code", this.res.statusCode.toString());
				tracer.recordAnnotation(new Annotation.ServerSend());
			});
		};

		this.res.once("close", onCloseOrFinish);
		this.res.once("finish", onCloseOrFinish);

		yield* next;
	};
};