/*
	Koa-request library modified to implement tracing 
	https://github.com/dionoid/koa-request

	Simple wrapper to request library
	http://github.com/mikeal/request
	For use in Koa.
*/

const {
    Tracer, 
	Annotation, 
	Request, 
	ExplicitContext
} = require("zipkin");

const helpers = require("./helpers");
const _request = require("request");

function request (uri, options) { 
	return function (callback) { 
		_request(uri, options, function (error, response, body) { 
			callback(error, response, body); 
		});
	};
}

function generateTrace(error, response, uri, options={}) {
	const serviceName = "diagram-backend", remoteServiceName="event-service";
	console.log("@@@@@@@@@@@@ KOA ");
	const {tracer, ctxImpl, localVariable} = require("./global-tracer")();

	console.log("localVariable ", localVariable);

	console.log("###### KOA REQ TRACER", tracer);
	console.log("###### KOA REQ ctxImpl", ctxImpl.getContext());
	
	// const traceId = ctxImpl.getContext().traceId;
	// console.log("@@@@@@ TID: ", traceId);

	const prevContext = ctxImpl.getContext();

	console.log("###### prevContext ", prevContext);
	console.log("response ", response.body);

	const childId = tracer.createChildId();
		
	console.log("@@@@@@@@@ childId ", childId);

	// return;

	// ctxImpl.letContext({error, response, uri, options, prevContext}, () => {

		// tracer.scoped(() => {
		// const {prevContext, error, response, uri, options} = ctxImpl.getContext();

		// console.log("########## prevContext: ", prevContext.traceId);
		// // console.log("@@@@@@@ ctxImpl: ", ctxImpl.getContext());

		// // if (helpers.containsRequiredHeaders(this.req.headers)) {
		// // 	console.log("@@@@@@@@@@ YOLO: Found headers ");
		// // }
		// // else {
		// // 	console.log("@@@@@@@@@@ NOLO: not Found headers ");
		// // }
		// // const id = new TraceId({
		// // 	traceId: prevContext.traceId,
		// // 	parentId: prevContext.traceId,
		// // 	spanId: tracer.createChildId(),
		// // 	sampled: sampled.map(helpers.stringToBoolean),
		// // 	flags
		// // });
		// // tracer.setId(id);
		
		// // tracer.setId(tracer.createRootId());
		// const childId = tracer.createChildId();
		
		// console.log("@@@@@@@@@ childId ", childId);

	tracer.setId(childId);

	const traceId = tracer.id;
	const method = options.method || "GET";
	
	tracer.recordServiceName(serviceName);
	tracer.recordRpc(method.toUpperCase());
	tracer.recordBinary("http.url", uri.url);
	tracer.recordAnnotation(new Annotation.ClientSend());

	if (remoteServiceName) {
	// TODO: can we get the host and port of the http connection?
		tracer.recordAnnotation(new Annotation.ServerAddr({
			serviceName: remoteServiceName
		}));
	}

	const zipkinOpts = Request.addZipkinHeaders(options, traceId);
	console.log("############## zipkinOpts ", zipkinOpts);
	console.log("traceId: ", traceId);
	if (!error){
		tracer.scoped(() => {
			tracer.setId(traceId);
			tracer.recordBinary("http.status_code", response.statusCode.toString());
			tracer.recordBinary("http.text", JSON.stringify(response.body).toString());
			tracer.recordAnnotation(new Annotation.ClientRecv());
		});
	} 
	else {
		tracer.scoped(() => {
			tracer.setId(traceId);
			tracer.recordBinary("error", error.toString());
			tracer.recordAnnotation(new Annotation.ClientRecv());
		});
	}
		// });
	// });
}

//copy request"s properties
for (var attr in _request) {
	if (_request.hasOwnProperty(attr)) {
		if (["get","post","put","patch","head","del"].indexOf(attr) > -1) {
			
			request[attr] = ((attr) => {
				return function (uri, options) { 
					return function (callback) { 
						_request[attr](uri, options, function (error, response, body) { 
							
							generateTrace(error, response, uri, options);

							callback(error, response, body); 

						});
					};
				};
			})(attr);

			
		} 
		else {
			request[attr] = _request[attr];
		}
	}
}

module.exports = request;