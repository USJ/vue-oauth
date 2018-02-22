/* @flow */

import axios from 'axios'
import buildOauthUrl from './build-oauth-url'

interface OAuthConfig {
  site: string,
  authorizePath: string,
  redirectUri: string,
  clientId: string,
  profileUri: string,
  logoutUri: string
}

let oauthInstance

export class OAuth {
  token: string
  store: Storage
  config: any
  user: any
  app: any

  static staticConfig: any

  constructor (oauthConfig: OAuthConfig) {
    this.config = oauthConfig

    OAuth.staticConfig = oauthConfig
  }

  init (app) {
    if (!app.$router) {
      console.error('[Oauth] $router is not defined')
    }

    const callbackRoute = {
      path: '/callback',
      name: 'OAuth callback',
      beforeEnter (to, from, next) {
        let expiresDate = new Date()
        expiresDate.setSeconds(expiresDate.getSeconds() + parseInt(to.query.expires_in))

        console.debug('[Oauth] callback ' + JSON.stringify(to.query))

        OAuth.setToken(to.query.access_token)
        OAuth.setExpires(expiresDate)

        if (localStorage.getItem('TARGET_PATH')) {
          let path = localStorage.getItem('TARGET_PATH')
          next(path)
        } else {
          next('/')
        }
      }
    }

    // add oauth callback route
    app.$router.addRoutes([
      callbackRoute
    ])

    if (!this.isAuthenticated()) {
      this.redirectLogin()
    }

    app._user = {}

    this.app = app
    console.log('[OAuth] init')
    this.refreshUser(app)
  }

  redirectLogin () {
    console.debug('[OAuth] redirect login')
    OAuth.silentOAuth()
    // this.silentOAuth()
    // window.location.assign(buildOauthUrl(this.config))
  }

  static silentOAuth () {
    console.debug('Append silent OAuth iframe')

    if (document.getElementById('silent-oauth-login')) {
      return
    }

    let iframe = document.createElement('iframe')
    iframe.setAttribute('src', buildOauthUrl(OAuth.staticConfig))
    iframe.setAttribute('id', 'silent-oauth-login')

    iframe.style.width = '10px'
    iframe.style.width = '10px'

    document.body.appendChild(iframe)

    iframe.onload = (e) => {
      console.log(iframe)
    }

    window.onmessage = function (e) {
      console.log(e)
      if (!e || !e.data || !e.data.source === 'ums2-ui-callback') {
        return
      }

      if (e.data.indexOf('/login') > -1) {
        window.location.assign(buildOauthUrl(OAuth.staticConfig))
      }

      if (e.data.payload === 'oauth:token_setup_complete') {
        iframe.remove()

        oauthInstance.refreshUser()
      }
    }

    console.debug('Appended silent OAuth iframe')
  }

  static staticRedirectLogin () {
    console.debug('[OAuth] static redirect login')
    OAuth.silentOAuth()
    // window.location.assign(buildOauthUrl(OAuth.staticConfig))
  }

  logout () {
    localStorage.removeItem('token')
    localStorage.removeItem('expires')

    window.location.assign(this.config.logoutUri)
  }

  isAuthenticated () {
    return !!this.getToken()
  }

  getToken () {
    return localStorage.getItem('token')
  }

  static getToken () {
    return localStorage.getItem('token')
  }

  static setToken (token) {
    return localStorage.setItem('token', token)
  }

  static setExpires (expires) {
    return localStorage.setItem('expires', expires)
  }

  static getExpires () {
    const expires = localStorage.getItem('expires')
    if (!expires) return null
    return new Date(expires)
  }

  static getRequestHeader () {
    console.debug('[OAuth] getRequestHeader with token: ' + OAuth.getToken())
    return {
      'Authorization': 'Bearer ' + OAuth.getToken()
    }
  }

  hasTokenExpired () {
    let currentDate = new Date()
    let expireDate = OAuth.getExpires()

    if (!expireDate) {
      return true
    }

    return currentDate.getTime() > expireDate.getTime()
  }

  refreshUser () {
    const http = axios.create({
      headers: OAuth.getRequestHeader()
    })

    console.debug('[Oauth] Access profile api with token: ' + this.getToken())

    return http.get(this.config.profileUri)
      .catch(resp => {
        // this.redirectLogin()
        OAuth.staticRedirectLogin()

        console.error('[Oauth] Redirect login due to error in response ', resp)
      })
      .then(resp => {
        this.app._user = resp.data
      })
  }
}

OAuth.install = function install (Vue) {
  if (install.installed) return
  install.installed = true

  Vue.mixin({
    beforeCreate () {
      if (this.$options.oauth) {
        this._oauthRoot = this
        this._oauth = this.$options.oauth
        this._oauth.init(this)

        if (this.$route.path.indexOf('logout') < 0 && this.$route.path.indexOf('callback') < 0) {
          localStorage.setItem('TARGET_PATH', this.$route.path)
          localStorage.setItem('TARGET_HREF', location.href)
        } else {
          localStorage.setItem('TARGET_PATH', '/')
          localStorage.setItem('TARGET_HREF', location.href)
        }

        Vue.util.defineReactive(this, '_user', this._oauth.user)

        oauthInstance = this._oauth

        if (oauthInstance.hasTokenExpired()) {
          OAuth.silentOAuth()
        } else {
          this._oauth.refreshUser(this)
        }

        console.debug('Oauth mounted component')
      } else {
        this._oauthRoot = (this.$parent && this.$parent._oauthRoot) || this
      }
    }
  })

  Object.defineProperty(Vue.prototype, '$oauth', {
    get () {
      return this._oauthRoot._oauth
    }
  })

  Object.defineProperty(Vue.prototype, '$user', {
    get () {
      return this._oauthRoot._user
    }
  })
}
