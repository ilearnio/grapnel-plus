/*!
 * grapnel-plus
 * @author Nick Gavrilov
 */
var Grapnel = require('grapnel')
var GrapnelServer = require('grapnel-server').Server
var router = require('./router')

var Router = router(GrapnelServer)

Router.prototype.middleware = function () {
  var self = this
  return function (req, res, next) {
    // Start router only if req.url matches some of routes,
    // otherways fire Express's `next`
    if (self.routes.some(function (r) {
      return Grapnel.regexRoute(r.path, []).test(req.url)
    })) {
      self.start()(req, res)
    } else {
      next()
    }
  }
}

module.exports = Router
