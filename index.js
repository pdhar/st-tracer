const koaTracerMiddleware = require("./src/koa-middleware");
const koaRequest = require("./src/koa-request");
const superagent = require("./src/superagent");
const superagentClient = require("./src/superagent-cs");
const restifyTracerMiddleware = require("./src/restify-middleware");

module.exports = {
	koaTracerMiddleware,
	koaRequest,
	superagent,
	restifyTracerMiddleware,
	superagentClient
};