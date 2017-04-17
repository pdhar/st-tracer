const helpers = require("./helpers");
const {
	Tracer, 
	Annotation, 
	Request,
	HttpHeaders: Header,
	ExplicitContext,
	TraceId
} = require("zipkin");

module.exports = (tracer, serviceName, ctxImpl) => {
	
	return function* (next) {
		// const {recorder} = require("./recorder");

		// if (!tracer){
		// 	const ctxImpl = new ExplicitContext();
		// 	tracer = new Tracer({ctxImpl, recorder});
		// } 
		// else {
		// 	console.log("######## TRACER exists");
		// }

		// tracer.scoped(() => {

			this.set("Access-Control-Allow-Headers", [
				"Origin", "Accept", "X-Requested-With", "X-B3-TraceId",
				"X-B3-ParentSpanId", "X-B3-SpanId", "X-B3-Sampled"
			].join(", "));

			if (this.req.url === "/event/7/v4EventId"){
				console.log("################################ REQ ", this.req.headers);
			}

			if (this.req.url === "/event/7/v4EventId"){
				
				if (helpers.containsRequiredHeaders(this.req.headers)) {
					console.log("@@@@@@@@@@ YOLO !!");
					
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
					
					// this.ctx.tracer = tracerfactory();
					// ctxImpl.setContext({prevTraceId: "asd"});
					console.log("@@@@@@@@@@ ???? SPANID !! ", spanId);
				} 
				else {
					console.log("!!!!!!!!! NOT FOUND HEADERS");
				}

				const id = tracer.id;

				console.log("@@@@@@@@@@ ID: ", id);

				console.log("@@@@@@@@@@@@ CONTEXT ", ctxImpl.getContext());
				

				// console.log("traceId: ", id);
				// console.log("$$$$$$ RECORDER ", tracer.recorder);
				tracer.recordServiceName("diagram-backend-newest");
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
					console.log("########## ON FINISH");
				};

				this.res.once("close", onCloseOrFinish);
				this.res.once("finish", onCloseOrFinish);

			}
		// });

		// ctxImpl.setContext({work: "A"});

		yield* next;
	};
};