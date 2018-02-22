;(function() {
  var hash = window.location.hash
  var paramStr = hash.substr(1)
  var params = {}

  paramStr.split('&').forEach(p => {
    var split = p.split('=')
    params[split[0]] = split[1]
  })

  var expiresDate = new Date()
  expiresDate.setSeconds(expiresDate.getSeconds() + parseInt(params.expires_in))

  window.localStorage.setItem('token', params.access_token)
  window.localStorage.setItem('expires', expiresDate.toJSON())

  if (window.top.location.href.indexOf('callback') < 0) {
    window.top.postMessage(
      { payload: 'oauth:token_setup_complete', source: 'ums2-ui-callback' },
      '*'
    )
  } else {
    window.location.assign(window.localStorage.getItem('TARGET_HREF'))
  }
})()
