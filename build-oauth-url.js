export default function buildOAuthUrl(params) {
  let oAuthScope = params.scope ? encodeURIComponent(params.scope) : ''
  let state = params.state ? encodeURIComponent(params.state) : ''
  let authPathHasQuery = params.authorizePath.indexOf('?') !== -1
  let appendChar = authPathHasQuery ? '&' : '?' // if authorizePath has ? already append OAuth2 params
  let nonceParam = params.nonce ? '&nonce=' + params.nonce : ''
  let responseType = params.responseType
    ? encodeURIComponent(params.responseType)
    : 'token'

  return (
    params.site +
    params.authorizePath +
    appendChar +
    'response_type=' +
    responseType +
    '&' +
    'client_id=' +
    encodeURIComponent(params.clientId) +
    '&' +
    'redirect_uri=' +
    encodeURIComponent(params.redirectUri) +
    '&' +
    'scope=' +
    oAuthScope +
    '&' +
    'state=' +
    state +
    nonceParam
  )
}
