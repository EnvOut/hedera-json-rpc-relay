const jsonResp = require('./lib/RpcResponse');
const jsonError = require('./lib/RpcError');
const crypto = require('crypto');
const parse = require('co-body');
const InvalidParamsError = require('./lib/RpcInvalidError');
const methodConfiguration = require('./lib/methodConfiguration.ts');
const hasOwnProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

class koaJsonRpc {
  constructor (ratelimit, opts) {
    this.limit = '1mb';
    this.registry = Object.create(null);
    this.registryTotal = Object.create(null);
    this.ratelimit = ratelimit;
    this.methodConfig = methodConfiguration.methodConfiguration;
    if (opts) {
      this.limit = opts.limit || this.limit;
      this.auth = opts.auth;
    }
    if (this.auth && (!hasOwnProperty(this.auth, 'username') || !hasOwnProperty(this.auth, 'password'))) {
      throw new Error('Invalid options parameters!');
    }
    if (this.auth) {
      this.token = crypto.createHmac('sha256', this.auth.password).update(this.auth.username).digest('hex');
    }
  }
  use (name, func, total) {
    this.registry[name] = func;
    this.registryTotal[name] = this.methodConfig[name].total;
    if (total) { 
      this.registryTotal[name] = total;
    }
  }

  app () {
    return async (ctx, next) => {
      let body, result;

      if (this.token) {
        const headerToken = ctx.get('authorization').split(' ').pop();
        if (headerToken !== this.token) {
          ctx.body = jsonResp(null, jsonError.Unauthorized());
          return;
        }
      }
      try {
        body = await parse.json(ctx, { limit: this.limit });
      } catch (err) {
        const errBody = jsonResp(null, jsonError.ParseError());
        ctx.body = errBody;
        return;
      }

      if (body.jsonrpc !== '2.0' || !hasOwnProperty(body, 'method') || !hasOwnProperty(body, 'id') || ctx.request.method !== 'POST') {
        ctx.body = jsonResp(body.id || null, jsonError.InvalidRequest());
        return;
      }
      if (!this.registry[body.method]) {
        ctx.body = jsonResp(body.id, jsonError.MethodNotFound());
        return;
      }
      
      const methodName = body.method;
      const methodTotalLimit = this.registryTotal[methodName];
      if (this.ratelimit.shouldRateLimit(ctx.ip, methodName, methodTotalLimit)){
        ctx.body = jsonResp(body.id, jsonError.RateLimitExceeded());
        return;
      }

      try {
        result = await this.registry[body.method](body.params);
      } catch (e) {
        if (e instanceof InvalidParamsError) {
          ctx.body = jsonResp(body.id, jsonError.InvalidParams(e.message));
          return;
        }
        ctx.body = jsonResp(body.id, jsonError.InternalError(e.message));
        return;
      }
      ctx.body = jsonResp(body.id, null, result);
    };
  }
}
module.exports = (...args) => new koaJsonRpc(...args);

module.exports.InvalidParamsError = InvalidParamsError;