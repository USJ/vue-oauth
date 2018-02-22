(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('axios')) :
	typeof define === 'function' && define.amd ? define(['exports', 'axios'], factory) :
	(factory((global['@usj/vueOauth'] = {}),global.axios));
}(this, (function (exports,axios) { 'use strict';

axios = axios && axios.hasOwnProperty('default') ? axios['default'] : axios;

function buildOAuthUrl(params) {
  var oAuthScope = params.scope ? encodeURIComponent(params.scope) : '';
  var state = params.state ? encodeURIComponent(params.state) : '';
  var authPathHasQuery = params.authorizePath.indexOf('?') !== -1;
  var appendChar = authPathHasQuery ? '&' : '?'; // if authorizePath has ? already append OAuth2 params
  var nonceParam = params.nonce ? '&nonce=' + params.nonce : '';
  var responseType = params.responseType ? encodeURIComponent(params.responseType) : 'token';

  return params.site + params.authorizePath + appendChar + 'response_type=' + responseType + '&' + 'client_id=' + encodeURIComponent(params.clientId) + '&' + 'redirect_uri=' + encodeURIComponent(params.redirectUri) + '&' + 'scope=' + oAuthScope + '&' + 'state=' + state + nonceParam;
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var oauthInstance = void 0;

var OAuth = function () {
  function OAuth(oauthConfig) {
    classCallCheck(this, OAuth);

    this.config = oauthConfig;

    OAuth.staticConfig = oauthConfig;
  }

  createClass(OAuth, [{
    key: 'init',
    value: function init(app) {
      if (!app.$router) {
        console.error('[Oauth] $router is not defined');
      }

      var callbackRoute = {
        path: '/callback',
        name: 'OAuth callback',
        beforeEnter: function beforeEnter(to, from, next) {
          var expiresDate = new Date();
          expiresDate.setSeconds(expiresDate.getSeconds() + parseInt(to.query.expires_in));

          console.debug('[Oauth] callback ' + JSON.stringify(to.query));

          OAuth.setToken(to.query.access_token);
          OAuth.setExpires(expiresDate);

          if (localStorage.getItem('TARGET_PATH')) {
            var path = localStorage.getItem('TARGET_PATH');
            next(path);
          } else {
            next('/');
          }
        }
      };

      // add oauth callback route
      app.$router.addRoutes([callbackRoute]);

      if (!this.isAuthenticated()) {
        this.redirectLogin();
      }

      app._user = {};

      this.app = app;
      console.log('[OAuth] init');
      this.refreshUser(app);
    }
  }, {
    key: 'redirectLogin',
    value: function redirectLogin() {
      console.debug('[OAuth] redirect login');
      OAuth.silentOAuth();
      // this.silentOAuth()
      // window.location.assign(buildOauthUrl(this.config))
    }
  }, {
    key: 'logout',
    value: function logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('expires');

      window.location.assign(this.config.logoutUri);
    }
  }, {
    key: 'isAuthenticated',
    value: function isAuthenticated() {
      return !!this.getToken();
    }
  }, {
    key: 'getToken',
    value: function getToken() {
      return localStorage.getItem('token');
    }
  }, {
    key: 'hasTokenExpired',
    value: function hasTokenExpired() {
      var currentDate = new Date();
      var expireDate = OAuth.getExpires();

      if (!expireDate) {
        return true;
      }

      return currentDate.getTime() > expireDate.getTime();
    }
  }, {
    key: 'refreshUser',
    value: function refreshUser() {
      var _this = this;

      var http = axios.create({
        headers: OAuth.getRequestHeader()
      });

      console.debug('[Oauth] Access profile api with token: ' + this.getToken());

      return http.get(this.config.profileUri).catch(function (resp) {
        // this.redirectLogin()
        OAuth.staticRedirectLogin();

        console.error('[Oauth] Redirect login due to error in response ', resp);
      }).then(function (resp) {
        _this.app._user = resp.data;
      });
    }
  }], [{
    key: 'silentOAuth',
    value: function silentOAuth() {
      console.debug('Append silent OAuth iframe');

      if (document.getElementById('silent-oauth-login')) {
        return;
      }

      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', buildOAuthUrl(OAuth.staticConfig));
      iframe.setAttribute('id', 'silent-oauth-login');

      iframe.style.width = '10px';
      iframe.style.width = '10px';

      document.body.appendChild(iframe);

      iframe.onload = function (e) {
        console.log(iframe);
      };

      window.onmessage = function (e) {
        console.log(e);
        if (!e || !e.data || !e.data.source === 'ums2-ui-callback') {
          return;
        }

        if (e.data.indexOf('/login') > -1) {
          window.location.assign(buildOAuthUrl(OAuth.staticConfig));
        }

        if (e.data.payload === 'oauth:token_setup_complete') {
          iframe.remove();

          oauthInstance.refreshUser();
        }
      };

      console.debug('Appended silent OAuth iframe');
    }
  }, {
    key: 'staticRedirectLogin',
    value: function staticRedirectLogin() {
      console.debug('[OAuth] static redirect login');
      OAuth.silentOAuth();
      // window.location.assign(buildOauthUrl(OAuth.staticConfig))
    }
  }, {
    key: 'getToken',
    value: function getToken() {
      return localStorage.getItem('token');
    }
  }, {
    key: 'setToken',
    value: function setToken(token) {
      return localStorage.setItem('token', token);
    }
  }, {
    key: 'setExpires',
    value: function setExpires(expires) {
      return localStorage.setItem('expires', expires);
    }
  }, {
    key: 'getExpires',
    value: function getExpires() {
      var expires = localStorage.getItem('expires');
      if (!expires) return null;
      return new Date(expires);
    }
  }, {
    key: 'getRequestHeader',
    value: function getRequestHeader() {
      console.debug('[OAuth] getRequestHeader with token: ' + OAuth.getToken());
      return {
        'Authorization': 'Bearer ' + OAuth.getToken()
      };
    }
  }]);
  return OAuth;
}();

OAuth.install = function install(Vue) {
  if (install.installed) return;
  install.installed = true;

  Vue.mixin({
    beforeCreate: function beforeCreate() {
      if (this.$options.oauth) {
        this._oauthRoot = this;
        this._oauth = this.$options.oauth;
        this._oauth.init(this);

        if (this.$route.path.indexOf('logout') < 0 && this.$route.path.indexOf('callback') < 0) {
          localStorage.setItem('TARGET_PATH', this.$route.path);
          localStorage.setItem('TARGET_HREF', location.href);
        } else {
          localStorage.setItem('TARGET_PATH', '/');
          localStorage.setItem('TARGET_HREF', location.href);
        }

        Vue.util.defineReactive(this, '_user', this._oauth.user);

        oauthInstance = this._oauth;

        if (oauthInstance.hasTokenExpired()) {
          OAuth.silentOAuth();
        } else {
          this._oauth.refreshUser(this);
        }

        console.debug('Oauth mounted component');
      } else {
        this._oauthRoot = this.$parent && this.$parent._oauthRoot || this;
      }
    }
  });

  Object.defineProperty(Vue.prototype, '$oauth', {
    get: function get$$1() {
      return this._oauthRoot._oauth;
    }
  });

  Object.defineProperty(Vue.prototype, '$user', {
    get: function get$$1() {
      return this._oauthRoot._user;
    }
  });
};

exports.OAuth = OAuth;

Object.defineProperty(exports, '__esModule', { value: true });

})));
