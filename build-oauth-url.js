import queryString from 'query-string'

export default function buildOAuthUrl(params) {
  let oAuthScope = params.scope ? encodeURIComponent(params.scope) : ''
  let state = params.state ? encodeURIComponent(params.state) : ''
  let authPathHasQuery = params.authorizePath.indexOf('?') !== -1
  let appendChar = authPathHasQuery ? '&' : '?' // if authorizePath has ? already append OAuth2 params
  let nonceParam = params.nonce ? '&nonce=' + params.nonce : ''
  let responseType = params.responseType
    ? encodeURIComponent(params.responseType)
    : 'token'

  const query = {
    response_type: responseType,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: oAuthScope,
    state
  }

  return (
    params.site +
    params.authorizePath +
    appendChar +
    queryString.stringify(query) +
    nonceParam
  )
}
