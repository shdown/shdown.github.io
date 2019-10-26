(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";

var _vk_request = require("./vk_request.js");

var _html_escape = require("./html_escape.js");

const APP_ID = 7184377;
document.addEventListener('DOMContentLoaded', () => {
  new _vk_request.VkRequest('VKWebAppInit', {}).schedule();
  const body = document.getElementsByTagName('body')[0];

  const showError = (what, error) => {
    body.innerHTML = `<b>Error</b>: ${(0, _html_escape.htmlEscape)(what)}: ${(0, _html_escape.htmlEscape)(error)}`;
  };

  const work2 = (id, access_token) => {
    const params = {
      v: '5.101',
      access_token: access_token,
      code: 'return [API.utils.getServerTime()];'
    };
    new _vk_request.VkRequest('VKWebAppCallAPIMethod', {
      method: 'execute',
      params: params,
      request_id: '1a'
    }).on('VKWebAppCallAPIMethodResult', data => {
      console.log(data);
    }).on('VKWebAppCallAPIMethodFailed', data => {
      showError('execute', data);
    }).schedule();
  };

  const work = id => {
    new _vk_request.VkRequest('VKWebAppGetAuthToken', {
      app_id: APP_ID,
      scope: 'friends'
    }).on('VKWebAppAccessTokenReceived', data => {
      work2(id, data.access_token);
    }).on('VKWebAppAccessTokenFailed', data => {
      showError('GetAuthToken', data);
    }).schedule();
  };

  const customDiv = document.createElement('div');
  customDiv.innerHTML = 'User ID: ';
  const idInput = document.createElement('input');
  idInput.setAttribute('type', 'number');
  const customBtn = document.createElement('input');
  customBtn.setAttribute('type', 'button');
  customBtn.setAttribute('value', 'Submit');

  customBtn.onclick = () => {
    const id = parseInt(idInput.value);
    if (isNaN(id)) idInput.value = '';else work(id);
  };

  customDiv.appendChild(idInput);
  customDiv.appendChild(customBtn);
  body.appendChild(customDiv);
});

},{"./html_escape.js":1,"./vk_request.js":4}],3:[function(require,module,exports){
(function (global){
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof define&&define.amd?define(n):(e=e||self).vkConnect=n()}(this,function(){"use strict";var i=function(){return(i=Object.assign||function(e){for(var n,t=1,o=arguments.length;t<o;t++)for(var r in n=arguments[t])Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r]);return e}).apply(this,arguments)};function p(e,n){var t={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&n.indexOf(o)<0&&(t[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)n.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(t[o[r]]=e[o[r]])}return t}var n=["VKWebAppInit","VKWebAppGetCommunityAuthToken","VKWebAppAddToCommunity","VKWebAppGetUserInfo","VKWebAppSetLocation","VKWebAppGetClientVersion","VKWebAppGetPhoneNumber","VKWebAppGetEmail","VKWebAppGetGeodata","VKWebAppSetTitle","VKWebAppGetAuthToken","VKWebAppCallAPIMethod","VKWebAppJoinGroup","VKWebAppAllowMessagesFromGroup","VKWebAppDenyNotifications","VKWebAppAllowNotifications","VKWebAppOpenPayForm","VKWebAppOpenApp","VKWebAppShare","VKWebAppShowWallPostBox","VKWebAppScroll","VKWebAppResizeWindow","VKWebAppShowOrderBox","VKWebAppShowLeaderBoardBox","VKWebAppShowInviteBox","VKWebAppShowRequestBox","VKWebAppAddToFavorites"],a=[],s=null,e="undefined"!=typeof window,t=e&&window.webkit&&void 0!==window.webkit.messageHandlers&&void 0!==window.webkit.messageHandlers.VKWebAppClose,o=e?window.AndroidBridge:void 0,r=t?window.webkit.messageHandlers:void 0,u=e&&!o&&!r,d=u?"message":"VKWebAppEvent";function f(e,n){var t=n||{bubbles:!1,cancelable:!1,detail:void 0},o=document.createEvent("CustomEvent");return o.initCustomEvent(e,!!t.bubbles,!!t.cancelable,t.detail),o}e&&(window.CustomEvent||(window.CustomEvent=(f.prototype=Event.prototype,f)),window.addEventListener(d,function(){for(var n=[],e=0;e<arguments.length;e++)n[e]=arguments[e];var t=function(){for(var e=0,n=0,t=arguments.length;n<t;n++)e+=arguments[n].length;var o=Array(e),r=0;for(n=0;n<t;n++)for(var i=arguments[n],p=0,a=i.length;p<a;p++,r++)o[r]=i[p];return o}(a);if(u&&n[0]&&"data"in n[0]){var o=n[0].data,r=(o.webFrameId,o.connectVersion,p(o,["webFrameId","connectVersion"]));r.type&&"VKWebAppSettings"===r.type?s=r.frameId:t.forEach(function(e){e({detail:r})})}else t.forEach(function(e){e.apply(null,n)})}));function l(e,n){void 0===n&&(n={}),o&&"function"==typeof o[e]&&o[e](JSON.stringify(n)),r&&r[e]&&"function"==typeof r[e].postMessage&&r[e].postMessage(n),u&&parent.postMessage({handler:e,params:n,type:"vk-connect",webFrameId:s,connectVersion:"1.6.8"},"*")}function c(e){a.push(e)}var b,v,w,A={send:l,subscribe:c,sendPromise:(b=l,v=c,w=function(){var t={current:0,next:function(){return this.current+=1,this.current}},r={};return{add:function(e){var n=t.next();return r[n]=e,n},resolve:function(e,n,t){var o=r[e];o&&(t(n)?o.resolve(n):o.reject(n),r[e]=null)}}}(),v(function(e){if(e.detail&&e.detail.data){var n=e.detail.data,t=n.request_id,o=p(n,["request_id"]);t&&w.resolve(t,o,function(e){return!("error_type"in e)})}}),function(o,r){return new Promise(function(e,n){var t=w.add({resolve:e,reject:n});b(o,i(i({},r),{request_id:t}))})}),unsubscribe:function(e){var n=a.indexOf(e);-1<n&&a.splice(n,1)},isWebView:function(){return!(!o&&!r)},supports:function(e){return!(!o||"function"!=typeof o[e])||(!(!r||!r[e]||"function"!=typeof r[e].postMessage)||!(r||o||!n.includes(e)))}};if("object"!=typeof exports||"undefined"==typeof module){var y=null;"undefined"!=typeof window?y=window:"undefined"!=typeof global?y=global:"undefined"!=typeof self&&(y=self),y&&(y.vkConnect=A,y.vkuiConnect=A)}return A});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VkRequest = void 0;

var _vkConnect = _interopRequireDefault(require("@vkontakte/vk-connect"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const methodsByKey = {};
const requestsByMethod = {};

const doSend = request => {
  for (let key in request.callbacks) methodsByKey[key] = request.method;

  requestsByMethod[request.method] = request;

  _vkConnect.default.send(request.method, request.params);
};

_vkConnect.default.subscribe(event => {
  const {
    type,
    data
  } = event.detail;
  const method = methodsByKey[type];
  if (!method) throw `Unknown VK event type: ${type}`;
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

},{"@vkontakte/vk-connect":3}]},{},[2]);
