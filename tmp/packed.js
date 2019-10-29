(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.searchPosts = void 0;

var _vk_api = require("./vk_api.js");

const checkMultiplePosts = async (runtimeConfig, config, callback) => {
  const code = `\
var posts = API.wall.get({owner_id: ${config.oid}, offset: ${runtimeConfig.offset}, count: ${runtimeConfig.postsPerRequest}}).items;
if (posts.length == 0) {
    return [0, -1, [], []];
}
var too_big = [], result = [];
var i = 0;
while (i < posts.length) {
    if (posts[i].from_id == ${config.uid}) {
        result.push(posts[i].id);
        result.push(0);
    }
    var posters = API.wall.getComments({owner_id: ${config.oid}, post_id: posts[i].id, need_likes: 0, count: ${config.commentsPerRequest}, extended: 1, thread_items_count: 10}).profiles@.id;
    var j = 0, found = false;
    while (!found && j < posters.length) {
        found = posters[j] == ${config.uid};
        j = j + 1;
    }
    if (found) {
        result.push(posts[i].id);
        result.push(j);
    } else {
        if (posts[i].comments.count > ${config.commentsPerRequest}) {
            too_big.push(posts[i].id);
        }
    }
    i = i + 1;
}
return [posts.length, posts[posts.length-1].date, too_big, result];`;
  return await config.session.apiRequest('execute', {
    code: code,
    v: '5.101'
  });
};

const checkSinglePost = async (postConfig, config, callback) => {
  callback('single-post-with-execute', postConfig.postId);
  const MAX_COMMENTS = 1000;
  const code = `\
var offset = 0, brk = false, found = false, result = 0;
while (!brk) {
    var posters = API.wall.getComments({owner_id: ${config.oid}, post_id: ${postConfig.postId}, need_likes: 0, count: ${MAX_COMMENTS}, offset: offset, extended: 1});
    offset = offset + ${MAX_COMMENTS};
    brk = offset >= posters.count;
    posters = posters.profiles@.id;
    var i = 0;
    while (!found && i < posters.length) {
        found = posters[i] == ${config.uid};
        i = i + 1;
    }
    if (found) {
        brk = true;
        result = i;
    }
}
return [result];`;
  const result = await config.session.apiRequest('execute', {
    code: code,
    v: '5.101'
  });
  return result[0] ? {
    postId: postConfig.postId,
    commentNo: result[0]
  } : null;
};

const checkSinglePostManually = async (postConfig, config, callback) => {
  callback('single-post-manually', postConfig.postId);
  const MAX_COMMENTS = 100;
  let offset = 0;

  while (true) {
    const result = await config.session.apiRequest('wall.getComments', {
      owner_id: config.oid,
      thread_items_count: 10,
      post_id: postConfig.postId,
      need_likes: 0,
      count: MAX_COMMENTS,
      offset: offset,
      extended: 1,
      v: '5.101'
    });

    for (let i = 0; i < result.profiles.length; ++i) if (result.profiles[i].id === config.uid) return {
      postId: postConfig.postId,
      commentNo: offset + i + 1
    };

    offset += MAX_COMMENTS;
    if (offset >= result.count) break;
  }

  return null;
};

const searchOneOff = async (runtimeConfig, config, callback) => {
  callback('check-one-off', runtimeConfig.offset);
  const result = await config.session.apiRequest('wall.get', {
    owner_id: config.oid,
    offset: runtimeConfig.offset,
    count: 1,
    v: '5.101'
  });

  if (result.items.length === 0) {
    callback('last', 'no-more-posts');
    return false;
  }

  if (result.items[0].from_id === config.uid) {
    callback('found', {
      postId: postId,
      commentNo: 0
    });
  } else {
    const postId = result.items[0].id;
    const datum = checkSinglePostManually({
      postId: postId
    }, config, callback);
    if (datum !== null) callback('found', datum);
  }

  runtimeConfig.offset += 1;
  return true;
};

const searchPostsIteration = async (runtimeConfig, config, callback) => {
  callback('offset', runtimeConfig.offset);
  let result;

  try {
    result = await checkMultiplePosts(runtimeConfig, config, callback);
  } catch (err) {
    if (!(err instanceof _vk_api.VkApiError)) throw err;

    if (err.code === 13 && /too many operations/i.test(err.msg)) {
      runtimeConfig.postsPerRequest = config.pprAdjustFunc(runtimeConfig.postsPerRequest);
      callback('ppr', runtimeConfig.postsPerRequest);
      return true;
    } else {
      await callback.retrowOrIgnore(err); // try to check the next post manually instead

      try {
        return await checkOneOff(runtimeConfig, config, callback);
      } catch (err) {
        if (!(err instanceof _vk_api.VkApiError)) throw err;
        await callback.retrowOrIgnore(err); // skip this one

        runtimeConfig.offset += 1;
        return true;
      }
    }
  }

  const [numTotalPosts, lastDate, tooBigIds, data] = result;
  callback('last-date', lastDate);

  for (let i = 0; i < data.length; i += 2) callback('found', {
    postId: data[i],
    commentNo: data[i + 1]
  });

  for (const postId of tooBigIds) {
    const postConfig = {
      postId: postId
    };
    let datum;

    try {
      datum = await checkSinglePost(postConfig, config, callback);
    } catch (err) {
      if (!(err instanceof _vk_api.VkApiError)) throw err;

      if (err.code === 13 && /too many (operations|api calls)/i.test(err.msg)) {
        try {
          datum = await checkSinglePostManually(postConfig, config, callback);
        } catch (err) {
          if (!(err instanceof _vk_api.VkApiError)) throw err; // skip this one

          await callback.retrowOrIgnore(err);
          continue;
        }
      } else {
        // skip this one
        await callback.retrowOrIgnore(err);
        continue;
      }
    }

    if (datum !== null) callback('found', datum);
  }

  if (numTotalPosts < runtimeConfig.postsPerRequest) {
    callback('last', 'no-more-posts');
    return false;
  }

  if (lastDate <= config.timeLimit) {
    callback('last', 'time-limit-reached');
    return false;
  }

  runtimeConfig.offset += runtimeConfig.postsPerRequest;
  return true;
};

const searchPosts = async (config, callback) => {
  const runtimeConfig = {
    offset: 0,
    postsPerRequest: config.pprInitial
  };

  while (await searchPostsIteration(runtimeConfig, config, callback)) {}
};

exports.searchPosts = searchPosts;

},{"./vk_api.js":6}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = void 0;
const config = {
  APP_ID: 7184377
};
exports.config = config;

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
"use strict";

var _vk_request = require("./vk_request.js");

var _vk_api = require("./vk_api.js");

var _html_escape = require("./html_escape.js");

var _config = require("./config.js");

var _algo = require("./algo.js");

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

  const work = async (uid, gid, tl_days) => {
    session.setAccessToken((await getAccessToken('')));
    session.setRateLimitCallback(what => {
      say(`We are being too fast (${what})!`);
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
      commentsPerRequest: 150,
      pprInitial: 24,
      pprAdjustFunc: n => Math.max(1, n - 2),
      timeLimit: serverTime - tl_days * 24 * 60 * 60,
      rethrowOrIgnore: async err => {
        // TODO
        throw err;
      }
    };
    say('Transferring control to searchPosts()...');
    await (0, _algo.searchPosts)(config, (what, data) => {
      if (what === 'found') {
        say(`FOUND: https://vk.com/wall${gid}_${data.postId} (comment ${data.commentNo})`);
      } else {
        say(`callback: ${what}: ${data}`);
      }
    });
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

},{"./algo.js":1,"./config.js":2,"./html_escape.js":3,"./vk_api.js":6,"./vk_request.js":7}],5:[function(require,module,exports){
(function (global){
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof define&&define.amd?define(n):(e=e||self).vkConnect=n()}(this,function(){"use strict";var i=function(){return(i=Object.assign||function(e){for(var n,t=1,o=arguments.length;t<o;t++)for(var r in n=arguments[t])Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r]);return e}).apply(this,arguments)};function p(e,n){var t={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&n.indexOf(o)<0&&(t[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)n.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(t[o[r]]=e[o[r]])}return t}var n=["VKWebAppInit","VKWebAppGetCommunityAuthToken","VKWebAppAddToCommunity","VKWebAppGetUserInfo","VKWebAppSetLocation","VKWebAppGetClientVersion","VKWebAppGetPhoneNumber","VKWebAppGetEmail","VKWebAppGetGeodata","VKWebAppSetTitle","VKWebAppGetAuthToken","VKWebAppCallAPIMethod","VKWebAppJoinGroup","VKWebAppAllowMessagesFromGroup","VKWebAppDenyNotifications","VKWebAppAllowNotifications","VKWebAppOpenPayForm","VKWebAppOpenApp","VKWebAppShare","VKWebAppShowWallPostBox","VKWebAppScroll","VKWebAppResizeWindow","VKWebAppShowOrderBox","VKWebAppShowLeaderBoardBox","VKWebAppShowInviteBox","VKWebAppShowRequestBox","VKWebAppAddToFavorites"],a=[],s=null,e="undefined"!=typeof window,t=e&&window.webkit&&void 0!==window.webkit.messageHandlers&&void 0!==window.webkit.messageHandlers.VKWebAppClose,o=e?window.AndroidBridge:void 0,r=t?window.webkit.messageHandlers:void 0,u=e&&!o&&!r,d=u?"message":"VKWebAppEvent";function f(e,n){var t=n||{bubbles:!1,cancelable:!1,detail:void 0},o=document.createEvent("CustomEvent");return o.initCustomEvent(e,!!t.bubbles,!!t.cancelable,t.detail),o}e&&(window.CustomEvent||(window.CustomEvent=(f.prototype=Event.prototype,f)),window.addEventListener(d,function(){for(var n=[],e=0;e<arguments.length;e++)n[e]=arguments[e];var t=function(){for(var e=0,n=0,t=arguments.length;n<t;n++)e+=arguments[n].length;var o=Array(e),r=0;for(n=0;n<t;n++)for(var i=arguments[n],p=0,a=i.length;p<a;p++,r++)o[r]=i[p];return o}(a);if(u&&n[0]&&"data"in n[0]){var o=n[0].data,r=(o.webFrameId,o.connectVersion,p(o,["webFrameId","connectVersion"]));r.type&&"VKWebAppSettings"===r.type?s=r.frameId:t.forEach(function(e){e({detail:r})})}else t.forEach(function(e){e.apply(null,n)})}));function l(e,n){void 0===n&&(n={}),o&&"function"==typeof o[e]&&o[e](JSON.stringify(n)),r&&r[e]&&"function"==typeof r[e].postMessage&&r[e].postMessage(n),u&&parent.postMessage({handler:e,params:n,type:"vk-connect",webFrameId:s,connectVersion:"1.6.8"},"*")}function c(e){a.push(e)}var b,v,w,A={send:l,subscribe:c,sendPromise:(b=l,v=c,w=function(){var t={current:0,next:function(){return this.current+=1,this.current}},r={};return{add:function(e){var n=t.next();return r[n]=e,n},resolve:function(e,n,t){var o=r[e];o&&(t(n)?o.resolve(n):o.reject(n),r[e]=null)}}}(),v(function(e){if(e.detail&&e.detail.data){var n=e.detail.data,t=n.request_id,o=p(n,["request_id"]);t&&w.resolve(t,o,function(e){return!("error_type"in e)})}}),function(o,r){return new Promise(function(e,n){var t=w.add({resolve:e,reject:n});b(o,i(i({},r),{request_id:t}))})}),unsubscribe:function(e){var n=a.indexOf(e);-1<n&&a.splice(n,1)},isWebView:function(){return!(!o&&!r)},supports:function(e){return!(!o||"function"!=typeof o[e])||(!(!r||!r[e]||"function"!=typeof r[e].postMessage)||!(r||o||!n.includes(e)))}};if("object"!=typeof exports||"undefined"==typeof module){var y=null;"undefined"!=typeof window?y=window:"undefined"!=typeof global?y=global:"undefined"!=typeof self&&(y=self),y&&(y.vkConnect=A,y.vkuiConnect=A)}return A});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
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

  async _limitRate(what, delayMillis) {
    if (this.rateLimitCallback) this.rateLimitCallback(what);
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

},{"./vk_request.js":7}],7:[function(require,module,exports){
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

},{"@vkontakte/vk-connect":5}]},{},[4]);
