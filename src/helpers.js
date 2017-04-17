const {
  HttpHeaders: Header,
  option: {Some, None}
} = require("zipkin");

function readHeader(headers, headerKey) {
	const val = headers[headerKey.toLowerCase()] || headers[headerKey];
	console.log("VAL ", val);
	if (val !== null && val !== undefined) {
		return new Some(val);
	} 
	else {
		console.log("returnining None");
		return None;
	}
}

function containsRequiredHeaders(headers) {
	return headers[Header.TraceId.toLowerCase()] !== undefined && headers[Header.SpanId.toLowerCase()] !== undefined;
}

function stringToBoolean(str) {
	return str === "1";
}

function stringToIntOption(str) {
	try {
		return new Some(parseInt(str));
	} 
	catch (err) {
		return None;
	}
}

module.exports = {
	containsRequiredHeaders,
	stringToBoolean,
	stringToIntOption,
	readHeader
};