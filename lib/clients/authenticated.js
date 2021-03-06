const snakeCaseKeys = require('snakecase-keys');

const { signRequest, checkAuth } = require('../auth');
const { checkOrderParams } = require('../orders');
const PublicClient = require('./public.js');

class AuthenticatedClient extends PublicClient {
  constructor(key, secret, apiURI, options = {}) {
    super(apiURI, options);
    const { devOverride } = options;
    this.auth = checkAuth({ key, secret, devOverride });
  }

  request(method, uriParts, opts = {}, callback) {
    if (opts.qs) {
      // 'request' lib expects an object for qs
      opts.qs = snakeCaseKeys(opts.qs);
    }

    if (opts.body) {
      // 'request' lib expects a string for body
      opts.body = JSON.stringify(snakeCaseKeys(opts.body));
    }

    this.addHeaders(
      opts,
      this._getSignature(
        method.toUpperCase(),
        this.makeRelativeURI(uriParts),
        opts
      )
    );

    return super.request(method, uriParts, opts, callback);
  }

  _getSignature(method, relativeURI, opts) {
    // devOverride auth
    if (this.auth.devOverride) {
      return {
        'Authorization': `Trader ${this.auth.devOverride}`,
      };
    }

    // API key auth
    const sig = signRequest(this.auth, method, relativeURI, opts);
    return {
      'ACDX-ACCESS-KEY': sig.key,
      'ACDX-ACCESS-SIG': sig.sig,
      'ACDX-ACCESS-TIMESTAMP': sig.timestamp,
    };
  }

  // // // Orders // // //

  getOrders(args = {}, callback) {
    /*
     * args may include:
     *   - contractCode: string
     *   - status: string or list<string>
     */
    return this.get(['orders'], { qs: args }, callback);
  }

  getOrder(orderId, callback) {
    return this.get(['orders', orderId], callback);
  }

  placeOrder(params, callback) {
    checkOrderParams(params);
    return this.post(['orders'], { body: params }, callback);
  }

  modifyOrder(orderId, params, callback) {
    return this.patch(['orders', orderId], { body: params }, callback);
  }

  cancelOrder(orderId, callback) {
    return this.delete(['orders', orderId], callback);
  }

  cancelOrders(contractCode, callback) {
    const args = { contractCode };
    return this.delete(['orders'], { qs: args }, callback);
  }

  // // // Fills // // //

  getFills(callback) {
    return this.get(['fills'], callback);
  }

  // // // Positions // // //

  getPositions(callback) {
    return this.get(['positions'], callback);
  }

  // // // Accounts // // //

  getAccounts(callback) {
    return this.get(['accounts'], callback);
  }

  getAccount(traderId, callback) {
    return this.get(['accounts', traderId], callback);
  }
}

module.exports = exports = AuthenticatedClient;
