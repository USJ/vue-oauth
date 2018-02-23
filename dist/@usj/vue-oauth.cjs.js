'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var axios = _interopDefault(require('axios'));
var queryString = _interopDefault(require('query-string'));

function buildOAuthUrl(params) {
  var oAuthScope = params.scope ? encodeURIComponent(params.scope) : '';
  var state = params.state ? encodeURIComponent(params.state) : '';
  var authPathHasQuery = params.authorizePath.indexOf('?') !== -1;
  var appendChar = authPathHasQuery ? '&' : '?'; // if authorizePath has ? already append OAuth2 params
  var nonceParam = params.nonce ? '&nonce=' + params.nonce : '';
  var responseType = params.responseType ? encodeURIComponent(params.responseType) : 'token';

  var query = {
    response_type: responseType,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: oAuthScope,
    state: state
  };

  return params.site + params.authorizePath + appendChar + queryString.stringify(query) + nonceParam;
}

var oauthInstance;

var OAuth = function OAuth(oauthConfig) {
  this.config = oauthConfig;

  OAuth.staticConfig = oauthConfig;
};

OAuth.prototype.init = function init (app) {
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
};

OAuth.prototype.redirectLogin = function redirectLogin () {
  console.debug('[OAuth] redirect login');
  OAuth.silentOAuth();
  // this.silentOAuth()
  // window.location.assign(buildOauthUrl(this.config))
};

OAuth.silentOAuth = function silentOAuth () {
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
};

OAuth.staticRedirectLogin = function staticRedirectLogin () {
  console.debug('[OAuth] static redirect login');
  OAuth.silentOAuth();
  // window.location.assign(buildOauthUrl(OAuth.staticConfig))
};

OAuth.prototype.logout = function logout () {
  localStorage.removeItem('token');
  localStorage.removeItem('expires');

  window.location.assign(this.config.logoutUri);
};

OAuth.prototype.isAuthenticated = function isAuthenticated () {
  return !!this.getToken();
};

OAuth.prototype.getToken = function getToken () {
  return localStorage.getItem('token');
};

OAuth.getToken = function getToken () {
  return localStorage.getItem('token');
};

OAuth.setToken = function setToken (token) {
  return localStorage.setItem('token', token);
};

OAuth.setExpires = function setExpires (expires) {
  return localStorage.setItem('expires', expires);
};

OAuth.getExpires = function getExpires () {
  var expires = localStorage.getItem('expires');
  if (!expires) { return null; }
  return new Date(expires);
};

OAuth.getRequestHeader = function getRequestHeader () {
  console.debug('[OAuth] getRequestHeader with token: ' + OAuth.getToken());
  return {
    'Authorization': 'Bearer ' + OAuth.getToken()
  };
};

OAuth.prototype.hasTokenExpired = function hasTokenExpired () {
  var currentDate = new Date();
  var expireDate = OAuth.getExpires();

  if (!expireDate) {
    return true;
  }

  return currentDate.getTime() > expireDate.getTime();
};

OAuth.prototype.refreshUser = function refreshUser () {
    var this$1 = this;

  var http = axios.create({
    headers: OAuth.getRequestHeader()
  });

  console.debug('[Oauth] Access profile api with token: ' + this.getToken());

  return http.get(this.config.profileUri).catch(function (resp) {
    // this.redirectLogin()
    OAuth.staticRedirectLogin();

    console.error('[Oauth] Redirect login due to error in response ', resp);
  }).then(function (resp) {
    this$1.app._user = resp.data;
  });
};

OAuth.install = function install(Vue) {
  if (install.installed) { return; }
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
    get: function get() {
      return this._oauthRoot._oauth;
    }
  });

  Object.defineProperty(Vue.prototype, '$user', {
    get: function get() {
      return this._oauthRoot._user;
    }
  });
};

exports.OAuth = OAuth;
