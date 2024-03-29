/*
	Open Zipkin library - Restify Middleware - Modified for ST tracing.
	https://github.com/openzipkin/zipkin-js/tree/master/packages/zipkin-instrumentation-restify
*/

const {
  Annotation,
  HttpHeaders: Header,
  option: {Some, None},
  TraceId
} = require("zipkin");

// const url = require("url");

function containsRequiredHeaders(req) {
	return req.header(Header.TraceId) !== undefined &&
	req.header(Header.SpanId) !== undefined;
}

function stringToBoolean(str) {
	return str === "1";
}

function stringToIntOption(str) {
	try {
		return new Some(parseInt(str));
	} catch (err) {
		return None;
	}
}

module.exports = function restifyMiddleware(serviceName = "unknown", tracer, port = 0) {
	
	if(!tracer)
		tracer = require("./global-tracer")().tracer;

	return (req, res, next) => {
		// try {
			// "X-Requested-With", "X-B3-TraceId",
			// "X-B3-ParentSpanId", "X-B3-SpanId", "X-B3-Sampled"
		console.log("###### INSIDE RESTIFY. ", req.header("X-B3-TraceId"));
		
		// console.log("@@@@@@@ HEADERS ", JSON.stringify(req.headers));

		tracer.scoped(() => {
			
			function readHeader(header) {
				const val = req.header(header);
				if (val != null) {
					return new Some(val);
				} else {
					return None;
				}
			}

			if (containsRequiredHeaders(req)) {
				console.log("###### CONTAINS HEADERS");
				const spanId = readHeader(Header.SpanId);
				spanId.ifPresent(sid => {
					const traceId = readHeader(Header.TraceId);
					const parentSpanId = readHeader(Header.ParentSpanId);
					const sampled = readHeader(Header.Sampled);
					const flags = readHeader(Header.Flags).flatMap(stringToIntOption).getOrElse(0);
					const id = new TraceId({
						traceId,
						parentId: parentSpanId,
						spanId: sid,
						sampled: sampled.map(stringToBoolean),
						flags
					});
					tracer.setId(id);
				});
			} else {
				console.log("###### NO HEADERS");
				tracer.setId(tracer.createRootId());
				if (req.header(Header.Flags)) {
					const currentId = tracer.id;
					const idWithFlags = new TraceId({
						traceId: currentId.traceId,
						parentId: currentId.parentId,
						spanId: currentId.spanId,
						sampled: currentId.sampled,
						flags: readHeader(Header.Flags)
					});
					tracer.setId(idWithFlags);
				}
			}

			const id = tracer.id;

			console.log("service name : ", serviceName);
			tracer.recordServiceName(serviceName);
			tracer.recordRpc(req.method);
			// tracer.recordBinary("http.url", url.format({
			// 	protocol: req.isSecure() ? "https" : "http",
			// 	host: req.header("host"),
			// 	pathname: req.path()
			// }));
			tracer.recordAnnotation(new Annotation.ServerRecv());
			tracer.recordAnnotation(new Annotation.LocalAddr({port}));

			if (id.flags !== 0 && id.flags != null) {
				tracer.recordBinary(Header.Flags, id.flags.toString());
			}

			const onCloseOrFinish = () => {
				res.removeListener("close", onCloseOrFinish);
				res.removeListener("finish", onCloseOrFinish);

				tracer.scoped(() => {
					tracer.setId(id);
					tracer.recordBinary("http.status_code", res.statusCode.toString());
					tracer.recordAnnotation(new Annotation.ServerSend());
				});
			};

			res.once("close", onCloseOrFinish);
			res.once("finish", onCloseOrFinish);

			next();
		});

		// } catch (error) {
		// 	console.log("ERROR ", error);
		// 	next();
		// }
	};
};