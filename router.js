/*!
 * grapnel-plus
 * @author Nick Gavrilov
 */
var Grapnel = require('grapnel')

function getRouter (_Grapnel) {
  'use strict'

  function Router (opts) {
    var self = this

    _Grapnel.call(self, opts)

    /**
     * List of all routes registered via .page()
     */
    self.routes = []

    /**
     * Common middlewares for all pages, that attached via `router.use()`
     */
    self.middlewares = []

    /**
     * Version
     */
    self.version = '0.0.1 (Grapnel v' + self.version + ')'
  }

  var proto = Router.prototype = Object.create(_Grapnel.prototype)

  proto.constructor = Router

  proto.getRoute = function (name) {
    if (typeof name === 'object' && name.name) {
      return name
    }

    return this.getRouteBy('name', name)
  }

  proto.getRouteBy = function (by, value) {
    var self = this
    var routes = self.routes

    if (by === 'path') {
      var path = value.replace(self.options.root, '')

      for (var i = 0; i < routes.length; i++) {
        /* eslint-disable new-cap */
        if (new Grapnel.regexRoute(routes[i][by], []).test(path)) {
        /* eslint-enable new-cap */
          return routes[i]
        }
      }
    }

    return self.routes.find(function (r) {
      return r[by] === value
    }) || null
  }

  /**
   * Register a new group
   *
   * @param {String} root
   * @param {Function} fn
   * @returns {Router}
   */
  proto.group = function (root, fn) {
    var self = this

    var group = new Group(self, root)

    fn.call(group)

    return self
  }

  /**
   * Register a new page (GET requests only)
   *
   * @param   {string}           path - path after '<APPNAME>/'
   * @param   {string|function}  page - name of the page which should point to a file
   * @param   {number|function}  routeName
   * @param   {function}         ...middlewares
   */
  proto.page = function (path, page, routeName) {
    var group = this instanceof Group && this
    var self = group ? group.router : this

    page || (page = null)

    routeName = uniqueRouteName(self, path, page, routeName)

    // strip trailing slash from "path"
    if (path[path.length - 1] === '/') {
      path = path.slice(0, -1)
    }

    // if it's not a full path
    if (path[0] !== '/') {
      path = (self.options.root || '') + '/' + path
    }

    path = path.replace(/\/+/g, '/')

    // Hook middlewares in a proper order
    var middlewares = []

    for (var i = 0; i < self.middlewares.length; i++) {
      var mv = self.middlewares[i]
      // if the middleware was registered via .use() from within a group
      if (mv[0] instanceof Group) {
        // only attach middlewares from the current group, otherways skip it
        if (mv[0] === group) {
          middlewares = middlewares.concat(mv[1])
        }
      } else {
        middlewares.push(mv)
      }
    }

    for (var j = 1, args = arguments; j < args.length; j++) {
      if (typeof args[j] === 'function') middlewares.push(args[j])
    }

    self.hasPages = true

    self.routes.push({
      name: routeName,
      page: page,
      path: path
    })

    // Register Grapnel route
    self.get.apply(self, [path].concat(middlewares))
  }

  /**
   * Register middleware(s)
   *
   * @param {Function|Array} middleware, middleware2, [middleware3, ...], ...
   * @returns {Router} instance
   */
  proto.use = function () {
    var group = this instanceof Group && this
    var self = group ? group.router : this

    if (!group && self.hasPages || group && group.hasPages) {
      throw Error('`use` method can be only used before `page`')
    }

    for (var i = 0, args = arguments; i < args.length; i++) {
      var middleware = args[i]

      if (typeof middleware === 'function') {
        self.middlewares.push(middleware)

      // If it's an array of middlewares attached by `group.use()
      } else if (middleware && middleware[0] instanceof Group &&
        (middleware[1].every(function (m) {
          return typeof m === 'function' || m instanceof Array &&
          m.every(function (m) { return typeof m === 'function' })
        }))) {
        // Flatten the array (2 levels only, should be enough)
        middleware[1] = [].concat.apply([], middleware[1])

        // Find a set of group middlewares and append new middlewares to it,
        // or create if it's not already there
        var mv = self.middlewares.find(function (m) {
          return m[0] === middleware[0]
        })
        if (mv) {
          mv[1] = mv[1].concat(middleware[1])
        } else {
          self.middlewares.push(middleware)
        }

      // Arrays of middlewares
      } else if (middleware instanceof Array &&
        (middleware.every(function (m) { return typeof m === 'function' }))) {
        self.middlewares = self.middlewares.concat(middleware)
      }
    }

    return self
  }

  return Router
}

/**
 * Group of routes
 */
function Group (router, root) {
  var self = this

  /**
   * Router instance
   * @type {Router}
   */
  self.router = router

  self.root = root

  self.middlewares = []
}

Group.prototype = {
  page: function () {
    var self = this
    var args = arguments

    // prepend root to path
    args[0] = self.root + '/' + args[0]

    self.router.page.apply(self, args)

    self.hasPages = true

    return self
  },

  use: function () {
    var self = this
    var middlewares = Array.prototype.slice.call(arguments)

    if (self.hasPages) {
      throw Error('`use` method can be only used before `page`')
    }

    self.middlewares = self.middlewares.concat(middlewares)

    self.router.use.apply(self, [ [self, middlewares] ])

    return self
  }
}

/**
 * Generate a unique name for the route
 */
function uniqueRouteName (router, path, page, routeName) {
  if (typeof routeName !== 'string') {
    routeName = page
    if (typeof page !== 'string') {
      routeName = path.toLowerCase()
        .trim()
        // strip query string
        .replace(/\?.*$/, '')
        // replace all special chars with "_"
        .replace(/\W+/g, '_')
        // trim "_" chars
        .replace(/(?:^_+|_+$)/g, '')
    }
  }

  var _routeName = routeName
  for (var increment = ''; router.getRoute(routeName); increment++) {
    routeName = _routeName + increment
  }

  return routeName
}

module.exports = getRouter
module.exports.Group = Group
