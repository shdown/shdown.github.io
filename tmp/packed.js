(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = void 0;
const config = {
  APP_ID: 7184377
};
exports.config = config;

},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.htmlEscape = void 0;
const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

const htmlEscape = s => {
  return String(s).replace(/[&<>"'`=\/]/g, c => entityMap[c]);
};

exports.htmlEscape = htmlEscape;

},{}],3:[function(require,module,exports){
"use strict";

var _vk_request = require("./vk_request.js");

var _vk_api = require("./vk_api.js");

var _html_escape = require("./html_escape.js");

var _config = require("./config.js");

var _yoba = require("./yoba.js");

document.addEventListener('DOMContentLoaded', () => {
  new _vk_request.VkRequest('VKWebAppInit', {}).schedule();
  const session = new _vk_api.VkApiSession();
  const body = document.getElementsByTagName('body')[0];
  const logArea = document.createElement('div');

  const resetLogArea = () => {
    logArea.innerHTML = '<hr/><b>Log area:</b>';
    const clearBtn = document.createElement('input');
    clearBtn.setAttribute('type', 'button');
    clearBtn.setAttribute('value', 'Clear');

    clearBtn.onclick = () => {
      resetLogArea();
      return false;
    };

    logArea.appendChild(clearBtn);
  };

  resetLogArea();

  const say = what => {
    const line = document.createElement('div');
    line.innerHTML = (0, _html_escape.htmlEscape)(what);
    logArea.appendChild(line);
    return line;
  };

  const getAccessToken = async scope => {
    say('Requesting access token...');
    const result = await (0, _vk_request.vkSendRequest)('VKWebAppGetAuthToken', 'VKWebAppAccessTokenReceived', 'VKWebAppAccessTokenFailed', {
      app_id: _config.config.APP_ID,
      scope: scope
    });

    const splitPermissions = s => s ? s.split(',') : [];

    const isSubset = (a, b) => new Set([...a, ...b]).size == new Set(b).size;

    if (!isSubset(splitPermissions(scope), splitPermissions(result.scope))) throw new Error(`Requested scope "${scope}", got "${result.scope}"`);
    return result.access_token;
  };

  const work = async (uid, gid, timeLimitDays) => {
    session.setAccessToken((await getAccessToken('')));
    session.setRateLimitCallback(reason => {
      say(`We are being too fast (${reason})!`);
    });
    say('Getting server time...');
    const [serverTime] = await session.apiRequest('execute', {
      code: 'return [API.utils.getServerTime()];',
      v: '5.101'
    });
    const config = {
      session: session,
      oid: gid,
      uid: uid,
      timeLimit: serverTime - timeLimitDays * 24 * 60 * 60,
      rethrowOrIgnore: async err => {
        // TODO
        throw err;
      },
      callback: (what, datum) => {
        if (what === 'found') {
          say(`FOUND: https://vk.com/wall${gid}_${datum.postId}`);
        } else {
          say(`callback: ${what}: ${JSON.stringify(datum)}`);
        }
      }
    };
    say('Transferring control to sortItOut()...');
    await (0, _yoba.sortItOut)(config);
  };

  const form = document.createElement('form');
  const uid_div = document.createElement('div');
  uid_div.innerHTML = 'User ID: ';
  const uid_input = document.createElement('input');
  uid_input.setAttribute('type', 'number');
  uid_input.setAttribute('required', '1');
  const gid_div = document.createElement('div');
  gid_div.innerHTML = 'Group ID: ';
  const gid_input = document.createElement('input');
  gid_input.setAttribute('type', 'number');
  gid_input.setAttribute('required', '1');
  const tl_div = document.createElement('div');
  tl_div.innerHTML = 'Time limit (days): ';
  const tl_input = document.createElement('input');
  tl_input.setAttribute('type', 'number');
  tl_input.setAttribute('value', '7');
  tl_input.setAttribute('required', '1');
  const btn_div = document.createElement('div');
  const submitBtn = document.createElement('input');
  submitBtn.setAttribute('type', 'submit');
  const cancelBtn = document.createElement('input');
  cancelBtn.setAttribute('type', 'button');
  cancelBtn.setAttribute('value', 'Cancel');

  cancelBtn.onclick = () => {
    session.cancel();
    return false;
  };

  form.onsubmit = () => {
    const uid = parseInt(uid_input.value);
    const gid = parseInt(gid_input.value);
    const tl = parseFloat(tl_input.value);
    work(uid, gid, tl).then(() => {
      say('Done...');
    }).catch(err => {
      // TODO check if it's cancellation
      say(`ERROR: ${err.name}: ${err.message}`);
      console.log(err);
    }); // Do not reload the page!

    return false;
  };

  uid_div.appendChild(uid_input);
  gid_div.appendChild(gid_input);
  tl_div.appendChild(tl_input);
  btn_div.appendChild(submitBtn);
  btn_div.appendChild(cancelBtn);
  form.appendChild(uid_div);
  form.appendChild(gid_div);
  form.appendChild(tl_div);
  form.appendChild(btn_div);
  body.appendChild(form);
  body.appendChild(logArea);
  say('Initialized');
});

},{"./config.js":1,"./html_escape.js":2,"./vk_api.js":5,"./vk_request.js":6,"./yoba.js":7}],4:[function(require,module,exports){
(function (global){
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof define&&define.amd?define(n):(e=e||self).vkConnect=n()}(this,function(){"use strict";var i=function(){return(i=Object.assign||function(e){for(var n,t=1,o=arguments.length;t<o;t++)for(var r in n=arguments[t])Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r]);return e}).apply(this,arguments)};function p(e,n){var t={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&n.indexOf(o)<0&&(t[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)n.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(t[o[r]]=e[o[r]])}return t}var n=["VKWebAppInit","VKWebAppGetCommunityAuthToken","VKWebAppAddToCommunity","VKWebAppGetUserInfo","VKWebAppSetLocation","VKWebAppGetClientVersion","VKWebAppGetPhoneNumber","VKWebAppGetEmail","VKWebAppGetGeodata","VKWebAppSetTitle","VKWebAppGetAuthToken","VKWebAppCallAPIMethod","VKWebAppJoinGroup","VKWebAppAllowMessagesFromGroup","VKWebAppDenyNotifications","VKWebAppAllowNotifications","VKWebAppOpenPayForm","VKWebAppOpenApp","VKWebAppShare","VKWebAppShowWallPostBox","VKWebAppScroll","VKWebAppResizeWindow","VKWebAppShowOrderBox","VKWebAppShowLeaderBoardBox","VKWebAppShowInviteBox","VKWebAppShowRequestBox","VKWebAppAddToFavorites"],a=[],s=null,e="undefined"!=typeof window,t=e&&window.webkit&&void 0!==window.webkit.messageHandlers&&void 0!==window.webkit.messageHandlers.VKWebAppClose,o=e?window.AndroidBridge:void 0,r=t?window.webkit.messageHandlers:void 0,u=e&&!o&&!r,d=u?"message":"VKWebAppEvent";function f(e,n){var t=n||{bubbles:!1,cancelable:!1,detail:void 0},o=document.createEvent("CustomEvent");return o.initCustomEvent(e,!!t.bubbles,!!t.cancelable,t.detail),o}e&&(window.CustomEvent||(window.CustomEvent=(f.prototype=Event.prototype,f)),window.addEventListener(d,function(){for(var n=[],e=0;e<arguments.length;e++)n[e]=arguments[e];var t=function(){for(var e=0,n=0,t=arguments.length;n<t;n++)e+=arguments[n].length;var o=Array(e),r=0;for(n=0;n<t;n++)for(var i=arguments[n],p=0,a=i.length;p<a;p++,r++)o[r]=i[p];return o}(a);if(u&&n[0]&&"data"in n[0]){var o=n[0].data,r=(o.webFrameId,o.connectVersion,p(o,["webFrameId","connectVersion"]));r.type&&"VKWebAppSettings"===r.type?s=r.frameId:t.forEach(function(e){e({detail:r})})}else t.forEach(function(e){e.apply(null,n)})}));function l(e,n){void 0===n&&(n={}),o&&"function"==typeof o[e]&&o[e](JSON.stringify(n)),r&&r[e]&&"function"==typeof r[e].postMessage&&r[e].postMessage(n),u&&parent.postMessage({handler:e,params:n,type:"vk-connect",webFrameId:s,connectVersion:"1.6.8"},"*")}function c(e){a.push(e)}var b,v,w,A={send:l,subscribe:c,sendPromise:(b=l,v=c,w=function(){var t={current:0,next:function(){return this.current+=1,this.current}},r={};return{add:function(e){var n=t.next();return r[n]=e,n},resolve:function(e,n,t){var o=r[e];o&&(t(n)?o.resolve(n):o.reject(n),r[e]=null)}}}(),v(function(e){if(e.detail&&e.detail.data){var n=e.detail.data,t=n.request_id,o=p(n,["request_id"]);t&&w.resolve(t,o,function(e){return!("error_type"in e)})}}),function(o,r){return new Promise(function(e,n){var t=w.add({resolve:e,reject:n});b(o,i(i({},r),{request_id:t}))})}),unsubscribe:function(e){var n=a.indexOf(e);-1<n&&a.splice(n,1)},isWebView:function(){return!(!o&&!r)},supports:function(e){return!(!o||"function"!=typeof o[e])||(!(!r||!r[e]||"function"!=typeof r[e].postMessage)||!(r||o||!n.includes(e)))}};if("object"!=typeof exports||"undefined"==typeof module){var y=null;"undefined"!=typeof window?y=window:"undefined"!=typeof global?y=global:"undefined"!=typeof self&&(y=self),y&&(y.vkConnect=A,y.vkuiConnect=A)}return A});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VkApiSession = exports.VkApiCancellation = exports.VkApiError = void 0;

var _vk_request = require("./vk_request.js");

class VkApiError extends Error {
  constructor(code, msg) {
    super(`[${code}] ${msg}`);
    this.name = 'VkApiError';
    this.code = code;
    this.msg = msg;
  }

}

exports.VkApiError = VkApiError;

const monotonicNowMillis = () => window.performance.now();

const sleepMillis = ms => new Promise(resolve => setTimeout(resolve, ms));

class VkApiCancellation extends Error {
  constructor() {
    super('Cancellation');
    this.name = 'VkApiCancellation';
  }

}

exports.VkApiCancellation = VkApiCancellation;
const MIN_DELAY_MILLIS = 0.36 * 1000;

class VkApiSession {
  constructor() {
    this.accessToken = null;
    this.rateLimitCallback = null;
    this.lastRequestTimestamp = NaN;
    this.cancelFlag = false;
  }

  _maybeThrowForCancel() {
    if (this.cancelFlag) {
      this.cancelFlag = false;
      throw new VkApiCancellation();
    }
  }

  async _sleepMillis(ms) {
    const MAX_LAG = 200;

    while (ms >= MAX_LAG) {
      this._maybeThrowForCancel();

      await sleepMillis(MAX_LAG);
      ms -= MAX_LAG;
    }

    this._maybeThrowForCancel();

    await sleepMillis(ms);
  }

  cancel() {
    this.cancelFlag = true;
  }

  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    return this;
  }

  setRateLimitCallback(fn) {
    this.rateLimitCallback = fn;
    return this;
  }

  async _limitRate(reason, delayMillis) {
    if (this.rateLimitCallback) this.rateLimitCallback(reason);
    await this._sleepMillis(delayMillis);
  }

  async _apiRequestNoRateLimit(method, params) {
    if (!this.accessToken) throw 'Access token was not set for this VkApiSession instance';
    const now = monotonicNowMillis();
    const delay = now - this.lastRequestTimestamp;
    if (delay < MIN_DELAY_MILLIS) await this._sleepMillis(MIN_DELAY_MILLIS - delay);

    this._maybeThrowForCancel();

    this.lastRequestTimestamp = monotonicNowMillis();
    let result;

    try {
      result = await (0, _vk_request.vkSendRequest)('VKWebAppCallAPIMethod', 'VKWebAppCallAPIMethodResult', 'VKWebAppCallAPIMethodFailed', {
        method: method,
        params: Object.assign({
          access_token: this.accessToken
        }, params),
        request_id: '1'
      });
    } catch (err) {
      if (!(err instanceof _vk_request.VkRequestError)) throw err;

      if (err.data.error_type === 'client_error') {
        const reason = err.data.error_data.error_reason;
        throw new VkApiError(reason.error_code, reason.error_msg);
      } else {
        throw err;
      }
    }

    if (result.error) throw new VkApiError(result.error.error_code, result.error.error_msg);
    return result.response;
  }

  async apiRequest(method, params) {
    while (true) {
      try {
        return await this._apiRequestNoRateLimit(method, params);
      } catch (err) {
        if (!(err instanceof VkApiError)) throw err; // https://vk.com/dev/errors

        switch (err.code) {
          case 6:
            await this._limitRate('rate-limit', 3000);
            break;

          case 9:
            // this one was not seen in practice, but still...
            await this._limitRate('rate-limit-hard', 9000);
            break;

          case 1:
          case 10:
            await this._limitRate('server-unavailable', 1000);
            break;

          default:
            throw err;
        }
      }
    }
  }

}

exports.VkApiSession = VkApiSession;

},{"./vk_request.js":6}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.vkSendRequest = exports.VkRequestError = exports.VkRequest = void 0;

var _vkConnect = _interopRequireDefault(require("@vkontakte/vk-connect"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const methodsByKey = {};
const requestsByMethod = {};

const doSend = request => {
  for (const key in request.callbacks) methodsByKey[key] = request.method;

  requestsByMethod[request.method] = request;

  _vkConnect.default.send(request.method, request.params);
};

_vkConnect.default.subscribe(event => {
  const {
    type,
    data
  } = event.detail;
  const method = methodsByKey[type];
  if (!method) throw new Error(`Unknown VK event type: ${type}`);
  const request = requestsByMethod[method];
  if (request.next) doSend(request.next);else delete requestsByMethod[method];
  request.callbacks[type](data);
});

class VkRequest {
  constructor(method, params) {
    this.method = method;
    this.params = params;
    this.callbacks = {};
    this.next = null;
  }

  on(key, fn) {
    this.callbacks[key] = fn;
    return this;
  }

  schedule() {
    const ongoing = requestsByMethod[this.method];

    if (ongoing) {
      this.next = ongoing.next;
      ongoing.next = this;
    } else {
      doSend(this);
    }
  }

}

exports.VkRequest = VkRequest;

class VkRequestError extends Error {
  constructor(data) {
    super(JSON.stringify(data));
    this.name = 'VkRequestError';
    this.data = data;
  }

}

exports.VkRequestError = VkRequestError;

const vkSendRequest = (method, successKey, failureKey, params) => {
  return new Promise((resolve, reject) => {
    new VkRequest(method, params).on(successKey, resolve).on(failureKey, data => reject(new VkRequestError(data))).schedule();
  });
};

exports.vkSendRequest = vkSendRequest;

},{"@vkontakte/vk-connect":4}],7:[function(require,module,exports){
"use strict";

var _vk_api = require("./vk_api.js");

class Reader {
  constructor(config) {
    this.config = config;
    this.cache = [];
    this.cachePos = 0;
    this.eof = false;
    this.globalOffset = 0;
  }

  _setEOF(reason) {
    if (!this.eof) {
      this.config.callback('last', reason);
      this.eof = true;
    }
  }

  async _repopulateCache() {
    const MAX_POSTS = 100;
    const result = await this.config.session.apiRequest('wall.get', {
      owner_id: config.oid,
      offset: this.globalOffset,
      count: MAX_POSTS,
      v: '5.101'
    });
    const newCache = [...this.cache.slice(this.cachePos)];

    for (const datum of result.items) {
      if (datum.date < this.config.timeLimit) {
        this._setEOF('time-limit');

        break;
      }

      if (datum.from_id === config.uid) {
        // TODO pass the datum to the callback
        this.config.callback('found', {
          postId: datum.id,
          commentNo: 0
        });
        continue;
      } //if (datum.marked_as_ads)
      //    continue;


      newCache.push({
        id: datum.id,
        offset: 0,
        total: datum.comments.count
      });
    }

    this.cache = newCache;
    this.cachePos = 0;
    if (result.items.length < MAX_POSTS) this._setEOF('no-more-posts');
    this.globalOffset += result.items.length;
  }

  _advance(n) {
    const values = this.cache.slice(this.cachePos, this.cachePos + n);
    this.cachePos += n;
    return values;
  }

  async read(n) {
    while (true) {
      const available = this.cache.length - this.cachePos;
      if (available >= n) return {
        values: this._advance(n),
        eof: false
      };
      if (this.eof) return {
        values: this._advance(available),
        eof: true
      };
      await this._repopulateCache();
    }
  }

}

class HotGroup {
  constructor(config, reader, groupSize) {
    this.config = config;
    this.hotArray = [];
    this.eof = false;
    this.reader = reader;
    this.groupSize = groupSize;
  }

  async getHotGroup() {
    while (this.hotArray.length < this.groupSize && !this.eof) {
      const {
        values,
        eof
      } = await this.reader.read(this.groupSize - this.hotArray.length);

      for (const value of values) {
        this.config.callback('info-add', value);
        if (value.offset !== value.total) this.hotArray.push(value);
      }

      this.eof = eof;
    }

    return this.hotArray;
  }

  setHotGroup(hotArray) {
    this.hotArray = [];

    for (const value of hotArray) {
      this.config.callback('info-update', value);
      if (value.offset !== value.total) this.hotArray.push(value);
    }
  }

}

const sortItOut = async config => {
  const MAX_COMMENTS = 100;
  const MAX_REQUESTS_IN_EXECUTE = 25;
  const reader = new Reader(config);
  const hotGroup = new HotGroup(reader, MAX_REQUESTS_IN_EXECUTE);

  while (true) {
    const hotArray = hotGroup.getHotGroup();
    if (hotArray.length === 0) break;
    let code = `var r = [];`;

    for (const value of hotArray) {
      code += `r.push(API.wall.getComments({`;
      code += `  owner_id: ${config.oid}, post_id: ${value.id}, count: ${MAX_COMMENTS},`;
      code += `  offset: ${value.offset}, need_likes: 0, extended: 1, thread_items_count: 10`;
      code += `}).profiles@.id);`;
    }

    code += `return r;`;
    let result;

    try {
      result = await config.session.apiRequest('execute', {
        code: code,
        v: '5.101'
      });
    } catch (err) {
      if (!(err instanceof _vk_api.VkApiError)) throw err;
      await config.rethrowOrIgnore(err); // skip the first one

      hotArray[0].offset = hotArray[0].total;
      hotGroup.setHotGroup(hotArray);
      continue;
    }

    for (let i = 0; i < hotArray.length; ++i) {
      const value = hotArray[i];
      const posterIds = result[i];

      if (posterIds.indexOf(config.uid) !== -1) {
        // TODO fetch the post manually
        config.callback('found', {
          postId: value.id,
          commentNo: -1
        });
        value.offset = value.total;
      } else {
        value.offset = Math.min(value.offset + MAX_COMMENTS, value.total);
      }
    }

    hotGroup.setHotGroup(hotArray);
  }
};

},{"./vk_api.js":5}]},{},[3]);
