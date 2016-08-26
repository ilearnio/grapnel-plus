/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Grapnel = require('grapnel')

const MockBrowser = require('mock-browser').mocks.MockBrowser

const Group = require('../router').Group
const RouterClient = require('../router-client')
const RouterServer = require('../router-server')

describe('Router', function () {
  describe('when on the server side', function () {
    let router
    beforeEach(function () {
      router = new RouterServer()
    })

    it('should return a Grapnel instance', function () {
      expect(router).to.be.instanceof(Grapnel)
      expect(router.start).to.be.function
    })

    it('should register a route', function () {
      router.page('/path', 'page', 'route-name')

      expect(router.routes[0].name).to.equal('route-name')
      expect(router.routes[0].page).to.equal('page')
      expect(router.routes[0].path).to.equal('/path')
    })

    it('should getRoute', function () {
      router.page('/path', 'page', 'route-name')
      router.page('/path2', 'page2', 'route-name2')
      router.page('/path3', 'page3', 'route-name3')

      expect(router.getRouteBy('path', '/path2').name).to.equal('route-name2')
      expect(router.getRouteBy('page', 'page2').name).to.equal('route-name2')
      expect(router.getRouteBy('name', 'route-name').name).to.equal('route-name')
      expect(router.getRoute('route-name2').name).to.equal('route-name2')
      expect(router.getRoute({ name: 'test' }).name).to.equal('test')
      expect(router.getRoute('non-existing')).to.be.null
    })

    it('should getRouteBy path when options.root is specified', function () {
      router.options.root = '/root'

      router.page('/path', 'page', 'route-name')
      expect(router.getRouteBy('path', '/root/path').name).to.equal('route-name')
    })

    it('should getRouteBy path for a route with dynamic properties', function () {
      router.page('/path/:id', 'page', 'route-name')
      expect(router.getRouteBy('path', '/path/1').name).to.equal('route-name')
    })

    it('should set route name same as `page` if no `route` given', function () {
      router.page('/path', 'page')
      expect(router.routes[0].name).to.equal('page')
    })

    it('should generate unique route name from `page` if no `route` given but don\'t change `page`', function () {
      router.page('/path', 'page')
      router.page('/path2', 'page')
      expect(router.routes[0].name).to.equal('page')
      expect(router.routes[1].name).to.equal('page1')
      expect(router.routes[1].page).to.equal('page')
    })

    it('should generate a unique route name from `path` if nothing else given', function () {
      router.page('foo/bar-baz')
      router.page('/long/path_with-QUERY?string')
      router.page('/long/path_with-QUERY?string=one')
      router.page('/long/path_with-QUERY?string=two')

      expect(router.routes[0].name).to.equal('foo_bar_baz')
      expect(router.routes[1].name).to.equal('long_path_with_query')
      expect(router.routes[2].name).to.equal('long_path_with_query1')
      expect(router.routes[3].name).to.equal('long_path_with_query2')
    })

    it('should trim trailing slash from `path`', function () {
      router.page('/path/', 'page')
      expect(router.routes[0].path).to.equal('/path')
    })

    it('should trim multiple slashes from `path`', function () {
      router.page('/path//test', 'page')
      expect(router.routes[0].path).to.equal('/path/test')
    })

    it('should prepend `.root` to `path`', function () {
      router.options.root = '/foo/'
      router.page('path//test', 'page')

      router.options.root = '/foo2'
      router.page('path2/test/', 'page')

      expect(router.routes[0].path).to.equal('/foo/path/test')
      expect(router.routes[1].path).to.equal('/foo2/path2/test')
    })

    it('should `use` middlewares', function () {
      router.use(function one () {}, function two () {})

      expect(router.middlewares).to.have.length(2)
      expect(router.middlewares[0].name).to.equal('one')
      expect(router.middlewares[1].name).to.equal('two')
    })

    it('should flatten array of middlewares', function () {
      router.use(
        function one () {},
        [ function two () {}, function three () {} ]
      )
      expect(router.middlewares).to.have.length(3)
      expect(router.middlewares[0].name).to.equal('one')
      expect(router.middlewares[1].name).to.equal('two')
      expect(router.middlewares[2].name).to.equal('three')
    })

    it('should allow to call `use` multiple times', function () {
      router.use(function one () {})
      router.use(function two () {}, function three () {})
      router.use(function four () {})
      // one middleware (because we're in a group)
      expect(router.middlewares).to.have.length(4)
      // array with 2 items: [Group, [one, two, three, four]]
      expect(router.middlewares[0].name).to.equal('one')
      expect(router.middlewares[1].name).to.equal('two')
      expect(router.middlewares[2].name).to.equal('three')
      expect(router.middlewares[3].name).to.equal('four')
    })

    it('should throw when running `use` after `page`', function () {
      router.page('path', () => {})
      expect(() => router.use()).to.throw(/`use`.*`page`/)
    })

    it('should `use` root middlewares', function (done) {
      let resp = ''
      router.use(
        function one (req, res, next) {
          resp += 'one'
          next()
        },
        function two (req, res, next) {
          res.end()
        }
      )

      expect(router.middlewares).to.have.length(2)
      expect(router.middlewares[0].name).to.equal('one')
      expect(router.middlewares[1].name).to.equal('two')

      router.page('/path', 'page', 'route-name')

      // Simulating request
      const req = { url: '/path', method: 'GET' }
      const res = {
        end () {
          resp += ' two'
          expect(resp).to.equal('one two')
          done()
        }
      }
      router.start()(req, res)
    })

    it('should register middlewares using `page`', function (done) {
      let resp = ''
      router.use(
        function one (req, res, next) {
          resp += resp ? ' one' : 'one'
          req.resp = req.resp ? ' one' : 'one'
          next()
        },
        function two (req, res, next) {
          resp += ' two'
          req.resp += ' two'
          next()
        }
      )

      router.page('/path', 'page', 'route-name', function three (req, res, next) {
        resp += ' three'
        req.resp += ' three'
        next()
      }, function four (req, res, next) {
        resp += ' four'
        req.resp += ' four'
        res.end()
      })

      let resp2 = ''
      router.page('/path2', function one2 (req, res, next) {
        resp2 = 'one2'
        next()
      }, function two2 (req, res, next) {
        resp2 += ' two2'
        res.end()
      })

      // Simulating requests
      const req = { url: '/path', method: 'GET' }
      const res = {
        end () {
          resp += ' end'
          req.resp += ' end'
          expect(resp).to.equal('one two three four end')
          expect(req.resp).to.equal('one two three four end')
        }
      }
      router.start()(req, res)

      const req2 = { url: '/path2', method: 'GET' }
      const res2 = {
        end () {
          expect(resp).to.equal('one two three four end one two')
          expect(req.resp).to.equal('one two three four end')
          expect(resp2).to.equal('one2 two2')
          done()
        }
      }
      router.start()(req2, res2)
    })

    describe('when inside of a group', function () {
      it('should throw when running `use` after `page`', function () {
        router.group('/prefix', function () {
          this.page('path', () => {})
          expect(() => this.use()).to.throw(/`use`.*`page`/)
        })
      })

      it('should `use` array of middlewares', function () {
        router.group('/prefix', function () {
          this.use(
            function one () {},
            [ function two () {}, function three () {} ]
          )
          // one middleware (because we're in a group)
          expect(router.middlewares).to.have.length(1)
          // array with 2 items: [Group, [one, two, three]]
          expect(router.middlewares[0]).to.have.length(2)
          expect(router.middlewares[0][0]).to.be.instanceof(Group)
          expect(router.middlewares[0][1]).to.have.length(3)
          expect(router.middlewares[0][1][0].name).to.equal('one')
          expect(router.middlewares[0][1][1].name).to.equal('two')
          expect(router.middlewares[0][1][2].name).to.equal('three')
        })
      })

      it('should allow to call `use` multiple times', function () {
        router.group('/prefix', function () {
          this.use(function one () {})
          this.use(function two () {}, function three () {})
          this.use(function four () {})
          // one middleware (because we're in a group)
          expect(router.middlewares).to.have.length(1)
          // array with 2 items: [Group, [one, two, three, four]]
          expect(router.middlewares[0]).to.have.length(2)
          expect(router.middlewares[0][0]).to.be.instanceof(Group)
          expect(router.middlewares[0][1]).to.have.length(4)
          expect(router.middlewares[0][1][0].name).to.equal('one')
          expect(router.middlewares[0][1][1].name).to.equal('two')
          expect(router.middlewares[0][1][2].name).to.equal('three')
          expect(router.middlewares[0][1][3].name).to.equal('four')
        })
      })

      it('should attach middlewares before and after group declaration', function () {
        router.use(function one () {})

        router.page('/path', function two () {})

        router.group('/prefix', function () {
          this.use(function three () {})
          this.use(function four () {}, function five () {})

          this.page('path', function six () {})
        })

        router.page('/path2', function seven () {})

        expect(router.middlewares).to.have.length(2)
        expect(router.middlewares).to.have.length(2)

        // array with 2 items: [one, [Group, [three, four, five]]]
        expect(router.middlewares).to.have.length(2)
        expect(router.middlewares[0].name).to.equal('one')
        expect(router.middlewares[1][0]).to.be.instanceof(Group)
        expect(router.middlewares[1][1]).to.have.length(3)
        expect(router.middlewares[1][1][0].name).to.equal('three')
        expect(router.middlewares[1][1][1].name).to.equal('four')
        expect(router.middlewares[1][1][2].name).to.equal('five')
      })

      it('should allow to group routes', function (done) {
        let resp = []

        router.page('/path', 'page')

        router.group('/prefix', function () {
          this.use(
            function one (req, res, next) {
              resp.push('one')
              next()
            },
            function two (req, res, next) {
              resp.push('two')
              next()
            }
          )

          this.page('path', function three (req, res, next) {
            resp.push('three')
            next()
          }, function four (req, res, next) {
            resp.push('four')
            res.end()
          })
        })

        let resp2 = []

        router.group('/prefix2', function () {
          this.use(
            function one2 (req, res, next) {
              resp2.push('one2')
              next()
            },
            function two2 (req, res, next) {
              resp2.push('two2')
              next()
            }
          )

          this.page('path2', function three2 (req, res, next) {
            resp2.push('three2')
            next()
          }, function four2 (req, res, next) {
            resp2.push('four2')
            res.end()
          })
        })

        const middleware = router.start()

        const req3 = { url: '/path', method: 'GET' }
        const res3 = {
          end () {
            console.log(arguments)
          }
        }
        middleware(req3, res3)

        // Simulating request
        const req = { url: '/prefix/path', method: 'GET' }
        const res = {
          end () {
            expect(resp.join(' ')).to.equal('one two three four')
          }
        }
        middleware(req, res)

        const req2 = { url: '/prefix2/path2', method: 'GET' }
        const res2 = {
          end () {
            expect(resp2.join(' ')).to.equal('one2 two2 three2 four2')
            done()
          }
        }
        middleware(req2, res2)
      })
    })
  })

  // it('should allow to `use()` middlewares', function (done) {
  //   const app = connect()
  // })

  describe('when on the client side', function () {
    let router
    beforeEach(function () {
      router = new RouterClient({ env: 'client' })

      // Simulate browser
      const mock = new MockBrowser()
      global.window = mock.getWindow()
      global.document = mock.getDocument()
      global.location = mock.getLocation()
      global.navigator = mock.getNavigator()
      global.history = mock.getHistory()
    })

    it('should navigate properly', function () {
      router.page('/path', 'page', 'route-name')
      router.page('/path2', 'page', 'route-name')

      router.navigate('/path')
      expect(router.path()).to.equal('/path')

      router.navigate('/path2')
      expect(router.path()).to.equal('/path2')
    })
  })
})
