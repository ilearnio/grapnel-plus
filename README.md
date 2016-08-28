grapnel-plus
---

A wrapper around [Grapnel](https://github.com/baseprime/grapnel) router that extends it's functionality by adding few more features to it. It depends on a fork of Grapnel with just a few minor fixes such as support for multiple instances of router and other useful stuff.

# Installation

```bash
npm i -S grapnel-plus
```

# Usage

```js
//
// CLIENT
//
var Router = require('grapnel-plus/router-client')
var router = new Router({ pushState: true })

router.page('/url', 'component-name')


//
// SERVER
//
var Router = require('grapnel-plus/router-server')
var router = new Router()

router.page('/url', 'component-name')

express.use(router.middleware())
```

## New method `page` for nicely registering pages (GET routes)


Registers a new page by a given path, component name to render and optional middlewares.

Arguments:

  * _path_ - path of a route
  * _page_ - name of the page which should point to a file (optional)
  * _routeName_ - a name of a route. If skipped will be generated automatically by the path parameter (optional)
  * _...middlewares_ - Express-compatible middlewares (one or more) that will be executed one after another (optional)

```js
router.page('/path', 'component-name', 'optional-route-name', ...optionalMiddlewares)
```

## New method `use`

Register middlewares that will be triggered before your routes. This allows you to update/log req and res objects before passing them further down to your routes or stop requests from going any further.

```js
router.use((req, res, next) => { ... })
router.use((req, res, next) => { ... }, (req, res, next) => { ... })
router.use(
  (req, res, next) => { ... },
  // passing array of middewares is also allowed
  [ (req, res, next) => { ... }, (req, res, next) => { ... } ]
)
```

## Groups

Wrap your routs into groups. This allows to attach middlewares to entire groups of routes rather than repeat them to a set of routes.

```js
// Global routes
router.page('/path', 'component-name')

// Group of routes
router.group('/admin', function () {
  // Middlewares
  this.use(isUserAdmin())
  this.use((req, res, next) => { ... }, (req, res, next) => { ... })
  this.use(arrayOfMiddlewares)

  // Routes within a group
  this.page('/payments', 'payments-component', isSuperAdmin()) // for super admins only
})
```

## Other properties/methods
  * _routes_ - an array of registered routes as well as groups
  * _getRoute(name)_ - get route by name
  * _getRouteBy(by, value)_ -  get route by "path", "page", or "name"
