/*-
 *
 * Hedera JSON RPC Relay
 *
 * Copyright (C) 2022 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import jsonResp from './lib/RpcResponse';
import { ParseError, InvalidRequest, InternalError, RateLimitExceeded, MethodNotFound, Unauthorized, ServerError} from './lib/RpcError';
import crypto from 'crypto';
import parse from 'co-body';
import InvalidParamsError from './lib/RpcInvalidError';
import { methodConfiguration } from './lib/methodConfiguration';
import RateLimit from '../ratelimit';
const hasOwnProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

export default class koaJsonRpc {
  registry: any;
  registryTotal: any;
  token: any;
  methodConfig: any;
  duration: number;
  limit: string;
  auth: any;
  ratelimit: RateLimit;

  constructor (opts?) {
    this.limit = '1mb';
    this.duration = 6000
    this.registry = Object.create(null);
    this.registryTotal = Object.create(null);
    this.methodConfig = methodConfiguration;
    if (opts) {
      this.limit = opts.limit || this.limit;
      this.auth = opts.auth;
      this.duration = opts.limit || this.limit;
    }
    this.ratelimit = new RateLimit(this.duration);
    if (this.auth && (!hasOwnProperty(this.auth, 'username') || !hasOwnProperty(this.auth, 'password'))) {
      throw new Error('Invalid options parameters!');
    }
    if (this.auth) {
      this.token = crypto.createHmac('sha256', this.auth.password).update(this.auth.username).digest('hex');
    }
  }
  use (name, func, total?) {
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
          ctx.body = jsonResp(null, new Unauthorized(), null);
          return;
        }
      }

      try {
        body = await parse.json(ctx, { limit: this.limit });
      } catch (err) {
        const errBody = jsonResp(null, new ParseError(), null);
        ctx.body = errBody;
        return;
      }

      if (body.jsonrpc !== '2.0' || !hasOwnProperty(body, 'method') || !hasOwnProperty(body, 'id') || ctx.request.method !== 'POST') {
        ctx.body = jsonResp(body.id || null, new InvalidRequest(), null);
        return;
      }

      if (!this.registry[body.method]) {
        ctx.body = jsonResp(body.id, new MethodNotFound(), null);
        return;
      }

      const methodName = body.method;
      const methodTotalLimit = this.registryTotal[methodName];
      if (this.ratelimit.shouldRateLimit(ctx.ip, methodName, methodTotalLimit)){
        ctx.body = jsonResp(body.id, new RateLimitExceeded(), null);
        return;
      }

      try {
        result = await this.registry[body.method](body.params);
      } catch (e) {
        if (e instanceof InvalidParamsError) {
          ctx.body = jsonResp(body.id, new InvalidParamsError(e.message), null);
          return;
        }
        ctx.body = jsonResp(body.id, new InternalError(e), null);
        return;
      }

      ctx.body = jsonResp(body.id, null, result);
    };
  }
}