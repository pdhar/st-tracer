/*
	Koa-request library modified to implement tracing 
	https://github.com/dionoid/koa-request

	Simple wrapper to request library
	http://github.com/mikeal/request
	For use in Koa.
*/

const { 
	Annotation, 
	Request
} = require("zipkin");

const _request = require("request");

function request (config, options) { 
	return function (callback) { 
		_request(config, options, function (error, response, body) { 
			callback(error, response, body); 
		});
	};
}

function generateTrace(error, response, config, options={}) {

	const serviceName = "diagram-backend", remoteServiceName="event-service";
	// const {tracer, ctxImpl, localVariable} = require("./global-tracer")();
	let tracer = config.tracer;

	if(!tracer){
		tracer = require("./global-tracer")().tracer;
	}

	console.log("@@@@@@@@@@@@ KOA ", config.tracer);
	// console.log("KOA RES: ", response);
	// console.log("OPTIONS : ", options);

	// console.log("localVariable ", localVariable);
	// console.log("###### KOA REQ TRACER", tracer);
	// console.log("###### KOA REQ ctxImpl", ctxImpl.getContext());

	// const prevContext = ctxImpl.getContext();
	console.log("###### prevContext ", tracer._ctxImpl);

	let nextId;

	if(tracer._ctxImpl.getContext()){
		nextId = tracer.createChildId();
	} else {
		nextId = tracer.createRootId();
	}
	// console.log("error:  ", error);
	// console.log("RESP:  ", response);
	// console.log("response ", response.body);

	// const childId = tracer.createChildId();
	// console.log("@@@@@@@@@ childId ", childId);

	tracer.setId(nextId);

	const traceId = tracer.id;
	const method = options.method || "GET";
	
	tracer.recordServiceName(serviceName);
	tracer.recordRpc(method.toUpperCase());
	tracer.recordBinary("http.url", config.url);
	tracer.recordAnnotation(new Annotation.ClientSend());

	if (remoteServiceName) {
	// TODO: can we get the host and port of the http connection?
		tracer.recordAnnotation(new Annotation.ServerAddr({
			serviceName: remoteServiceName
		}));
	}

	const zipkinOpts = Request.addZipkinHeaders(options, traceId);
	console.log("############## zipkinOpts ", zipkinOpts);
	// console.log("traceId: ", traceId);
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
}

//copy request"s properties
for (var attr in _request) {
	if (_request.hasOwnProperty(attr)) {
		if (["get","post","put","patch","head","del"].indexOf(attr) > -1) {
			
			request[attr] = ((attr) => {
				return function (config, options) { 
					
					return function (callback) { 
						_request[attr](config, options, function (error, response, body) { 
							
							// console.log("INSIDE RES, ", response);
							// console.log("INSIDE ERR, ", error);
							// console.log("OPTIONS ", options);
							generateTrace(error, response, config, options);

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