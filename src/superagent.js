const {
    Tracer, 
	Annotation, 
	Request, 
	ExplicitContext
} = require("zipkin");

const _superagent = require("superagent");
const overrideSuperAgent = {};

for (const attr in _superagent) {
	if (_superagent.hasOwnProperty(attr)) {
		if (["get","post","put","patch","head","del"].indexOf(attr) > -1) {
			overrideSuperAgent[attr] = _superagent[attr];
			overrideSuperAgent[`${attr}WithTrace`] = (url, opts) => zipkinWrapper(_superagent, attr, url, opts);
		}
	}
	else {
		overrideSuperAgent[attr] = _superagent[attr];
	}
}

function zipkinWrapper(superagent, attr, url, opts={}) {
	
	const {serviceName = "unknown", remoteServiceName} = opts;
	const ctxImpl = new ExplicitContext();
	const {recorder} = require("./recorder");
	const tracer = new Tracer({ctxImpl, recorder});

	return new Promise((resolve, reject) => {

		tracer.scoped(() => {
			tracer.setId(tracer.createRootId());
			const traceId = tracer.id;

			const method = opts.method || "GET";
			tracer.recordServiceName(serviceName);
			tracer.recordRpc(method.toUpperCase());
			tracer.recordBinary("http.url", url);
			tracer.recordAnnotation(new Annotation.ClientSend());

			if (remoteServiceName) {
			// TODO: can we get the host and port of the http connection?
				tracer.recordAnnotation(new Annotation.ServerAddr({
					serviceName: remoteServiceName
				}));
			}

			const zipkinOpts = Request.addZipkinHeaders(opts, traceId);
			console.log("zipkinOpts ", zipkinOpts);
			console.log("attr", attr);

			superagent[attr](url)
			.set(zipkinOpts.headers)
			.then(res => {
				console.log("RES: ", res);
				tracer.scoped(() => {
					tracer.setId(traceId);
					tracer.recordBinary("http.status_code", res.status.toString());
					tracer.recordBinary("http.text", res.text.toString());
					tracer.recordAnnotation(new Annotation.ClientRecv());
				});
				resolve(res);
			}).catch(err => {
				tracer.scoped(() => {
					tracer.setId(traceId);
					tracer.recordBinary("error", err.toString());
					tracer.recordAnnotation(new Annotation.ClientRecv());
				});
				reject(err);
			});
		});
	});
}

module.exports = overrideSuperAgent;