/* Copyright (c) 2010-2011 Ricebridge */

"use strict"

var common  = require('../common')

var util    = common.util
var eyes    = common.eyes
var assert  = common.assert
var uuid    = common.uuid
var crypto  = common.crypto
var connect  = common.connect
var oauth    = common.oauth
var uuid     = common.uuid
var Cookies  = common.cookies
var url      = common.url
var _        = common._


function UserPlugin() {
  var self = this
  self.name = 'user'

  /*
  seneca.add({on:'user',cmd:'prepare'},function(args,cb){
    util.debug('user/prepare')

    var prep = args.entity$.make$({tenant$:args.tenant$,base$:'sys',name$:'prepare'})
    prep.pr = uuid().toLowerCase()
    prep.ip = args.req.remoteAddress
    prep.ua = args.req.headers['User-Agent']
    prep.at = new Date()

    // state
    prep.st = 'new'

    // verifier - captcha result?
    // early invite coupon?
    // FIX: call a cmd to do this - on$:user,cmd$:verifier
    prep.vf = args.verify  // from
    prep.vt = args.verify   // to

    prep.save$(function(err,prep){ 
      cb(err,{prep:prep.pr,verify:prep.vf})
    })
  })


  seneca.add({on:'user',cmd:'signup'},function(args,cb){
    util.debug('seneca:signup:'+JSON.stringify(args));
    var signup = args.entity$.make$({tenant$:args.tenant,base$:'sys',name$:'signup'});
    signup.email = args.email;
    signup.token = (''+Math.random()).substring(2);
    signup.save$(function(err,signup){
      cb(err,signup);
    });
  });


  seneca.add({on:'user',cmd:'activate'},function(args,cb){
    util.debug('seneca:activate:'+JSON.stringify(args));
    args.entity$.find$({tenant$:args.tenant,base$:'sys',name$:'signup',token:args.signup},function(err,signup){
      E(err);
      util.debug('signup:'+signup)
      if( signup ) {
        var user = args.entity$.make$({tenant$:args.tenant,base$:'sys',name$:'user',email:signup.email});
        user.activation = (''+Math.random()).substring(2);

        user.save$(function(err,user){
          cb(err,{email:user.email,activation:user.activation});
        });
      }
      else {
        cb(err,null);
      }
    });
  });

  seneca.add({on:'user',cmd:'load-activated'},function(args,cb){
    util.debug('seneca:load-activated:'+JSON.stringify(args));
    args.entity$.find$({tenant$:args.tenant,base$:'sys',name$:'user',activation:args.activation},function(err,user){
      E(err);
      if( user ) {
        cb(err,{email:user.email});
      }
      else {
        cb(err,null);
      }
    });
  });

  seneca.add({on:'user',cmd:'setup-activated'},function(args,cb){
    util.debug('seneca:setup-activated:'+JSON.stringify(args));
    args.entity$.find$({tenant$:args.tenant,base$:'sys',name$:'user',activation:args.activation,email:args.email},function(err,user){
      E(err);
      if( user ) {
        if( args.password == args.confirm ) {
          if( '' == args.password ) {
            cb({user:true,code:'password-empty'},null);
          }
          else if( '' == args.name ) {
            cb({user:true,code:'name-empty'},null);
          }
          else {
            user.name = args.name;
            user.password = args.password;
            user.login = (''+Math.random()).substring(2);
            delete user.activation;
            user.save$(function(err,user){
              cb(err,user);
            });
          }
        }
        else {
          cb({user:true,code:'password-nonmatch'},null);
        }
      }
      else {
        cb({user:true,code:'unknown-user'},null);
      }
    });
  });

  seneca.add({on:'user',cmd:'load-login'},function(args,cb){
    util.debug('seneca:load-login:'+JSON.stringify(args));
    args.entity$.find$({tenant$:args.tenant,base$:'sys',name$:'user',login:args.login},function(err,user){
      E(err);
      if( user ) {
        cb(err,user);
      }
      else {
        cb(err,null);
      }
    });
  });

  seneca.add({on:'user',cmd:'login'},function(args,cb){
    util.debug('seneca:login:'+JSON.stringify(args));
    args.entity$.find$({tenant$:args.tenant,base$:'sys',name$:'user',email:args.email,password:args.password},function(err,user){
      E(err);
      if( user ) {
        cb(err,user);
      }
      else {
        cb(err,null);
      }
    });
  });
  */

  self.init = function(seneca,cb){
    self.seneca = seneca

    // TODO fields prop to contain custom fields - need to isolate from cmd params
    seneca.add({on:self.name, cmd:'register'},function(args,seneca,cb){
      var user = seneca.make(args.tenant,'sys','user')
      user.nick     = args.nick
      user.email    = args.email
      user.active   = !!args.active

      user.salt = uuid().substring(0,8)
      var shasum = crypto.createHash('sha1')
      shasum.update( args.password + user.salt )
      user.pass = shasum.digest('hex')

      user.save$(function(err,user){
        cb(err,{ok:true,user:user})
      })
    })


    seneca.add({on:self.name, cmd:'login'},function(args,seneca,cb){
      var user = seneca.make(args.tenant,'sys','user')
      var q = {active:true}
      if( args.nick ) {
        q.nick = args.nick
      }
      else {
        q.email = args.email
      }

      user.load$(q, function(err,user){
        if( err ) {
          cb(err)
        }
        else if( user ) {
          var ok = args.auto

          if( !ok ) {
            var shasum = crypto.createHash('sha1')
            shasum.update( args.password + user.salt )
            var pass = shasum.digest('hex')

            ok = (user.pass==pass)
          }

          if( ok ) {
            var login = seneca.make(args.tenant,'sys','login')
            login.token   = uuid()
            login.nick    = user.nick
            login.email   = user.email
            login.user    = user.id
            login.when    = new Date()
            login.active  = true

            login.save$(function(err,login){
              cb(err,{user:user,login:login,pass:true})
            })
          }
          else {
            cb(null,{user:user,pass:false})
          }
        }
        else {
          cb(err,{pass:false})
        }
      })
    })


    seneca.add({on:self.name, cmd:'auth'},function(args,seneca,cb){
      var login = seneca.make(args.tenant,'sys','login')
      var q = {active:true}
      q.token = args.token

      login.load$(q, function(err,login){
        if( err ) {
          cb(err)
        }
        else if( login ) {
          var user = seneca.make(args.tenant,'sys','user')
          var q = {id:login.user}
          user.load$(q, function(err,user){
            cb(err,{user:user,login:login,auth:true})
          })
        }
        else {
          cb(err,{auth:false})
        }
      })
    })


    seneca.add({on:self.name, cmd:'logout'},function(args,seneca,cb){
      var login = seneca.make(args.tenant,'sys','login')
      var q = {active:true}
      q.token = args.token

      login.load$(q, function(err,login){
        if( err ) {
          cb(err)
        }
        else if( login ) {
          login.active = false
          login.ended  = new Date()
          login.save$(function(err,login){
            if( err ) {
              cb(err)
            }
            else {
              var user = seneca.make(args.tenant,'sys','user')
              user.load$({email:login.email}, function(err,user){
                cb(err,{user:user,login:login,logout:true})
              })
            }
          })
        }
        else {
          cb(err,{logout:false})
        }
      })
    })

    cb()
  }



  var oauthdefs = {
    redirect: function(service,req,res) {
      var hosturl = service.hosturl
      var requrl   = 'http://'+req.headers.host
      if( hosturl != requrl ) {
        var fixurl = hosturl+req.url
        console.log(fixurl)
        res.writeHead( 301, {
          "Location":
          fixurl
        })
        res.end()
        return true
      }
      else {
        return false
      }
    },

    v1: {
      login: function(service,cache,clients,cb) {
        return function(req,res){
          if( oauthdefs.redirect(service,req,res) ) return;

          self.seneca.log('plugin','user','oauth','login',service.name)
          var ctxt = {req:req,res:res,service:service.name}
            
          eyes.inspect(cache,'request token')

          clients[service.name].getOAuthRequestToken(
            function(
              error, 
              oauth_token, 
              oauth_token_secret, 
              oauth_authorize_url, 
              additionalParameters) 
            {
              if (error) {
                return cb(error,ctxt)
              }
              
              var tid = uuid()
              cache[tid] = {secret:oauth_token_secret,token:oauth_token,tag:req.params.tag}
              eyes.inspect(cache[tid],'td request token')
              
              var cookies = new Cookies( req, res )
              cookies.set('seneca-oauth',tid)
              
              res.writeHead( 301, {
                "Location":
                service.authorize_url + oauth_token
              })
              res.end()
            }
          )
        }
      }, // v1.login

      callback: function(service,cache,clients,cb) {
        return function(req,res){
          self.seneca.log('plugin','user','oauth','callback',service.name)
          var ctxt = {req:req,res:res,service:service.name}
          var parsedurl = url.parse(req.url, true)

          eyes.inspect(cache,'access token')

          var cookies = new Cookies( req, res )
          var tid = cookies.get('seneca-oauth')
          var td = cache[tid]
          eyes.inspect(td,'td access token')
          
          if( !td ) {
            return cb('token_unknown',ctxt)
          }
          ctxt.tag = td.tag

          if( td.token != parsedurl.query.oauth_token ) {
            return cb('token_unknown',ctxt)
          }
          ctxt.token  = td.token
          ctxt.secret = td.secret

          clients[service.name].getOAuthAccessToken(
            parsedurl.query.oauth_token,
            td.secret,
            parsedurl.query.oauth_verifier,

            function(
              error, 
              oauth_token, 
              oauth_token_secret, 
              additionalParameters) 
            {
              ctxt.token = oauth_token
              ctxt.secret = oauth_token_secret
              ctxt.addparams = additionalParameters
              cookies.set('seneca-oauth',null)
              delete cache[tid]

              oauthdefs.usermeta[service.name](service,cache,clients,ctxt,cb)
            }
          )
        }
      }, // v1 callback      

    }, // v1

    v2: {
      login: function(service,cache,clients,cb) {
        return function(req,res){
          if( oauthdefs.redirect(service,req,res) ) return;

          self.seneca.log('plugin','user','oauth','login',service.name)

          var tid = uuid()
          cache[tid] = {tag:req.params.tag}
          eyes.inspect(cache[tid],'td request token')
              
          var cookies = new Cookies( req, res )
          cookies.set('seneca-oauth',tid)

          var redirecturl = 
            clients[service.name].getAuthorizeUrl(
              {redirect_uri:service.callback_url, scope:'' })

          res.writeHead( 301, {
            'Location':redirecturl
          })
          res.end()
        }
      }, // v2 login

      callback: function(service,cache,clients,cb) {
        return function(req,res){
          var ctxt = {req:req,res:res,service:service.name}
          self.seneca.log('plugin','user','oauth','callback',service.name)

          var parsedurl = url.parse(req.url, true);

          var cookies = new Cookies( req, res )
          var tid = cookies.get('seneca-oauth')
          var td = cache[tid]
          eyes.inspect(td,'td access token')
          
          if( !td ) {
            return cb('token_unknown',ctxt)
          }
          ctxt.tag = td.tag

          clients[service.name].getOAuthAccessToken(
            parsedurl.query.code , 
            {redirect_uri:service.callback_url}, 
            function( error, access_token, refresh_token, additionalParameters ){
              ctxt.token  = access_token
              ctxt.refresh = refresh_token

              ctxt.addparams = additionalParameters
              cookies.set('seneca-oauth',null)
              delete cache[tid]
              eyes.inspect(cache,'cache')

              oauthdefs.usermeta[service.name](service,cache,clients,ctxt,cb)
            }
          )
        }
      }, // v2 login      
    }, // v2

    usermeta: {
      twitter: function(service,cache,clients,ctxt,cb) {
        ctxt.username = ctxt.addparams.screen_name
        ctxt.userid   = ctxt.addparams.user_id
        oauthdefs.userhandler(service,cache,clients,ctxt,cb)
      },
      facebook: function(service,cache,clients,ctxt,cb) {
        var geturl = service.base_url+'/me'
        clients[service.name].getProtectedResource(
          geturl, ctxt.token, function (error, data, response) {
            ctxt.responsedata = data

            eyes.inspect(data)
            if( error ) {
              return cb(error,ctxt)
            }

            var json = JSON.parse(data)
            ctxt.userid   = json.id
            ctxt.username = json.username

            oauthdefs.userhandler(service,cache,clients,ctxt,cb)
          })
      },
      linkedin: function(service,cache,clients,ctxt,cb){
        var geturl = service.base_url+'/people/~:(id,first-name,last-name,public-profile-url)'
        clients[service.name].get(
          geturl, ctxt.token, ctxt.secret, function(error,data,response){
            ctxt.responsedata = data

            eyes.inspect(data)
            if( error ) {
              return cb(error,ctxt)
            }
            
            var oneline = data.replace(/\n/g,'')
            var m = /<id>([^<]+)<\/id>.*<public-profile-url>http:\/\/www.linkedin.com\/in\/([^<]+)<\/public-profile-url>/.exec(oneline)
            if( m && m[1] && m[2] ) {
              ctxt.userid   = m[1]
              ctxt.username = m[2]
              oauthdefs.userhandler(service,cache,clients,ctxt,cb)
            }
            else {
              cb('user_oauth_linkedin_username_notfound',ctxt)
            }
          }
        )
      }
    },

    userhandler: function(service,cache,clients,ctxt,cb) {
      
      function cberr(cbe,next){
        return function(err){
          if( err ) {
            cbe && cbe(err,ctxt)
          }
          else {
            next && next.apply(this,Array.prototype.slice.call(arguments,1))
          }
        }
      }

      function login(user,cbl) {
        self.seneca.act(
          {
            tenant:service.tenant,
            on:'user',
            cmd:'login',
            nick:user.nick,
            email:user.email,
            auto:true
          },
          cberr(cbl,function(out){
            cookies = new Cookies( ctxt.req, ctxt.res )
            cookies.set(service.tenant,out.login.token,{expires:new Date( new Date().getTime()+(30*24*3600*1000) )})
            ctxt.user = out.user
            ctxt.login = out.login
            ctxt.pass = out.pass
            cbl(null,ctxt)
          })
        )
      }
            
      var userent = self.seneca.make(service.tenant,'sys','user')
      var q = {}
      q[service.name+'_id'] = ctxt.userid

      userent.load$(q,cberr(cb,function(user){
        // user exists, auto login
        if( user ) {
          user.social = {
            service:service.name,
            key:ctxt.token,
            secret:ctxt.secret
          }

          user.save$(cberr(cb,function(user){
            login(user,cb)
          }))
        }

        // new user, register and login
        else { 
          var username = ctxt.username
          userent.load$({nick:username},cberr(cb,function(existing){
            if(!existing) {
              self.seneca.act(
                {
                  tenant:service.tenant,
                  on:'user',
                  cmd:'register',
                  nick:username,
                  password:uuid(),
                  active:true
                }, 
                cberr(cb,function(out){
                  out.user[service.name+'_id'] = ctxt.userid
                  out.user.social = {
                    service:service.name,
                    key:ctxt.token,
                    secret:ctxt.secret
                  }
                  out.user.save$(cberr(cb,function(out){
                    login(out,cb)
                  }))
                })
              )
            }
            else {
              existing.social = {
                service:service.name,
                key:ctxt.token,
                secret:ctxt.secret
              }

              existing.save$(cberr(cb,function(existing){
                login(existing,cb)
             }))
            }
          }))
        }
      }))
    }

  } // oauth


  self.service = function(opts,cb) {
    var hosturl = opts.hosturl || 'http://localhost'
    var prefix  = opts.prefix || '/user'
    var tenant  = opts.tenant

    if( !tenant ) {
      cb('plugin_user_notenant')
    }

    return connect.router(function(app){

      var servicedefs = {
        twitter: {
          version:1,
          authorize_url:'https://api.twitter.com/oauth/authorize?oauth_token=',
          request_token_url:'https://twitter.com/oauth/request_token',
          access_token_url:'https://twitter.com/oauth/access_token'
        },
        facebook: {
          version:2,
          base_url: 'https://graph.facebook.com'
        },
        linkedin: {
          version:1,
          authorize_url:'https://www.linkedin.com/uas/oauth/authenticate?oauth_token=',
          request_token_url:'https://api.linkedin.com/uas/oauth/requestToken',
          access_token_url:'https://api.linkedin.com/uas/oauth/accessToken',
          base_url:'http://api.linkedin.com/v1'
        }
      }

      var services = {}
      _.keys( opts.oauth.services).forEach( function(servicename){
        services[servicename] = _.extend( opts.oauth.services[servicename], {name:servicename}, servicedefs[servicename] )
      })

      var clients = []
      var cache = {}

      _.keys(services).forEach(function(servicename){
        self.seneca.log('plugin','user','setup',servicename)

        var service = services[servicename]      
        service.callback_url = hosturl+prefix+'/oauth/'+servicename+'/callback/'
        service.hosturl = hosturl
        service.tenant = tenant

        if( 1 == service.version ) {

          clients[servicename] = new oauth.OAuth(
            service.request_token_url,
            service.access_token_url,
            service.keys.key,
            service.keys.secret,
            '1.0',
            service.callback_url,
            'HMAC-SHA1',
            null,
            {'Accept': '*/*', 'Connection': 'close', 'User-Agent': 'seneca'}
          )

          var loginpath = prefix+'/oauth/'+servicename+'/login/:tag?'
          app.get(loginpath,oauthdefs.v1.login(service,cache,clients,cb))

          var callbackpath = prefix+'/oauth/'+servicename+'/callback/'
          app.get(callbackpath,oauthdefs.v1.callback(service,cache,clients,cb))
          
        } // version 1

        else if( 2 == service.version ) {
          
          clients[servicename] = new oauth.OAuth2(
            service.keys.key,
            service.keys.secret,
            service.base_url
          )

          var loginpath = prefix+'/oauth/'+servicename+'/login/:tag?'
          app.get(loginpath,oauthdefs.v2.login(service,cache,clients,cb))

          var callbackpath = prefix+'/oauth/'+servicename+'/callback/'
          app.get(callbackpath,oauthdefs.v2.callback(service,cache,clients,cb))

        } // version 2

      }) // forEach service
    }) // connect.router
  } 
}


exports.plugin = function() {
  return new UserPlugin()
}

