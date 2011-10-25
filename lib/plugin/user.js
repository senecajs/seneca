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


function LE_load(cmd,name,meta,log,cb,win) {
  return function(err,ent) {
    var out = {}
    out[cmd]=false
    
    if( err ) {
      log(cmd,'load','error',name,err,meta)
      return cb(err,out)
    }
    
    if( ent ) {
      win(ent)
    }
    else {
      log(cmd,'load','not_found',name,meta)
      return cb(err,out)
    }
  }
}



function MemState() {
  var self = this
  self.state = {}

  self.get = function( key, cb ) {
    cb( self.state[key] )
  }

  self.set = function( key, val ) {
    self.state[key] = val
  }

  self.del = function( key ) {
    delete self.state[key]
  }
}



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

  // TODO util func to require existance of props and issue cb errors if not found

  // TODO need to have own crud funcs to protect special props like salt, pass, active, etc.


  var log = function() {}


  self.init = function(seneca,opts,cb){
    self.seneca = seneca
    self.opts = opts

    console.log('SENECA USER opts='+JSON.stringify(self.opts))

    self.opts.prefix = self.opts.prefix || 'user'



    log = function(){
      var args = Array.prototype.slice.call(arguments)
      args.unshift('user')
      args.unshift('plugin')
      self.seneca.log.apply(self.seneca,args)
    }


    function hide(args,propnames){
      var outargs = _.extend({},args)
      for( var pn in propnames ) {
        outargs[pn] = '[HIDDEN]'
      }
      return outargs
    }

    // args={password}
    function cmd_encrypt_password(args,seneca,cb){
      var salt = uuid().substring(0,8)
      var shasum = crypto.createHash('sha1')
      shasum.update( args.password + salt )
      var pass = shasum.digest('hex')
      cb(null,{pass:pass,salt:salt})
    }
    cmd_encrypt_password.argslog = function(args){return hide(args,{password:1})}
    seneca.add({on:self.name, cmd:'encrypt_password'},cmd_encrypt_password)


    // args={proposed,pass,salt}
    function cmd_verify_password(args,seneca,cb){
      var shasum = crypto.createHash('sha1')
      shasum.update( args.proposed + args.salt )
      var check = shasum.digest('hex')
      
      var ok = (check===args.pass)
      cb(null,{ok:ok})
    }
    cmd_verify_password.argslog = function(args){return hide(args,{proposed:1})}
    seneca.add({on:self.name, cmd:'verify_password'},cmd_verify_password)


    function cmd_change_password(args,seneca,cb){
      var user = seneca.make(args.tenant,'sys','user')

      var q = {}
      if( args.nick ) {
        q.nick = args.nick
      }
      else {
        q.email = args.email
      }

      user.load$(q, function(err,user){
        if( err ) return cb(err,{ok:false});

        // TODO: how to pass tenant and other meta context onwards
        seneca.act({tenant:args.tenant,on:self.name,cmd:'encrypt_password',password:args.password},function(err,out){
          user.salt = out.salt
          user.pass = out.pass
          user.save$(function(err,user){
            cb(err,{ok:true,user:user})
          })
        })
      })
    }
    cmd_change_password.argslog = function(args){return hide(args,{proposed:1})}
    seneca.add({on:self.name, cmd:'change_password'},cmd_change_password)


    // TODO fields prop to contain custom fields - need to isolate from cmd params
    seneca.add({on:self.name, cmd:'register'},function(args,seneca,cb){
      var user = seneca.make(args.tenant,'sys','user')
      user.nick     = args.nick
      user.email    = args.email
      user.name     = args.name || ''
      user.active   = !!args.active
      user.ct       = new Date()

      var exists = false

      checknick(
        function(){ checkemail(
          function() { saveuser() })})

      function checknick(next) {
        if( user.nick ) {
          user.load$({nick:user.nick},function(err,userfound){
            if( err ) return cb(err,{ok:false,user:user})
            if( userfound ) return cb(null,{ok:false,exists:true})
            next()
          })
          return
        }
        next()
      }

      function checkemail(next) {
        if( user.email ) {
          user.load$({email:user.email},function(err,userfound){
            if( err ) return cb(err,{ok:false,user:user})
            if( userfound ) return cb(null,{ok:false,exists:true})
            next()
          })
          return
        }
        next()
      }

      function saveuser() {
        // TODO: how to pass tenant and other meta context onwards
        seneca.act({tenant:args.tenant,on:self.name,cmd:'encrypt_password',password:args.password},function(err,out){
          user.salt = out.salt
          user.pass = out.pass
          user.save$(function(err,saveduser){
            log('register',user.nick,user.email,err,saveduser)
            cb(err,{ok:!err,user:saveduser})
          })
        })
      }
    })


    seneca.add({on:self.name, cmd:'login'},function(args,seneca,cb){
      var user = seneca.make(args.tenant,'sys','user')
      var q = {active:true}
      if( args.nick && 0 < args.nick.length ) {
        q.nick = args.nick
      }
      else if( args.email && 0 < args.email.length ) {
        q.email = args.email
      }
      else {
        log('login','nick_or_email_missing')
        return cb(null,{pass:false})
      }

      user.load$(q, function(err,user){
        if( err ) {
          log('login',q.nick,q.email,err)
          return cb(err);
        }

        if( user ) {
          var ok = args.auto
          var why = 'auto'

          if( !ok ) {
            var shasum = crypto.createHash('sha1')
            shasum.update( args.password + user.salt )
            var pass = shasum.digest('hex')

            ok = (user.pass==pass)
            why = 'password'
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
              log('login',q.nick,q.email,why,err,login,user)
              cb(err,{user:user,login:login,pass:true})
            })
          }
          else {
            log('login',q.nick,q.email,'fail')
            cb(null,{user:user,pass:false})
          }
        }
        else {
          log('login',q.nick,q.email,'user_not_found')
          cb(err,{pass:false})
        }
      })
    })


    seneca.add({on:self.name, cmd:'auth'},function(args,seneca,cb){
      var login = seneca.make(args.tenant,'sys','login')
      var q = {active:true}

      if( args.token && 0 < args.token.length ) {
        q.token = args.token
      }
      else {
        log('auth','no_token')
        return cb(null,{auth:false})
      }

      login.load$(q, LE_load(
        'auto','login',{q:q},log,cb,
        function(login){
          var user = seneca.make(args.tenant,'sys','user')
          var q = {id:login.user}

          user.load$(q, LE_load(
            'auto','user',{q:q,login:login},log,cb,
            function(user){
              log('auth','user',q,login,user)
              cb(null,{user:user,login:login,auth:true})
            }))
        }))
    })


    seneca.add({on:self.name, cmd:'logout'},function(args,seneca,cb){
      var login = seneca.make(args.tenant,'sys','login')
      var q = {active:true}
      q.token = args.token

      if( args.token && 0 < args.token.length ) {
        q.token = args.token
      }
      else {
        log('logout','no_token')
        return cb(null,{auth:false})
      }

      login.load$(q, LE_load(
        'logout','login',{q:q},log,cb,
        function(login){
          login.active = false
          login.ended  = new Date()
          login.save$(function(err,login){
            if( err ) {
              log('logout','error','save','login',err,login)
              return cb(err,{logout:false})
            }
            else {
              var user = seneca.make(args.tenant,'sys','user')
              var q = {id:login.user}

              user.load$(q, LE_load(
                'logout','user',{q:q,login:login},log,cb,
                function(user){
                  log('logout','user',user,login)
                  cb(null,{user:user,login:login,logout:true})
                }))
            }
          })
        }))
    })


    seneca.add({on:self.name, cmd:'update'},function(args,seneca,cb){
      var user = seneca.make(args.tenant,'sys','user')

      args.orig_nick = args.orig_nick || args.orig_email
      args.nick = args.nick || args.email

      console.dir(args)

      user.load$({nick:args.orig_nick},function(err,user){

        console.dir([err,user])

        if( err ) return cb(err,{ok:false})
        if( !user ) return cb(null,{ok:false,exists:false})

        var pwd   = args.password || ''
        var pwd2  = args.repeat || ''
    
        if( pwd ) {
          if( pwd === pwd2 && 1 < pwd.length) {
            seneca.act({on:self.name,cmd:'change_password',tenant:args.tenant,nick:args.orig_nick,password:pwd},function(err,userpwd){
              if( err ) return cb(err);
              updateuser(userpwd.user)
            })
          }
          else {
            cb({err:'password_mismatch'})
          }
        }
        else {
          updateuser()
        }
  
        function updateuser(pwdupdate) {
          console.dir(['updateuser',pwdupdate])

          user.nick  = args.nick
          user.name  = args.name
          user.email = args.email

          if( pwdupdate ) {
            user.salt = pwdupdate.salt
            user.pass = pwdupdate.pass
          }

          if( '' == user.nick ) {
            cb({err:'empty_nick'})
          }
          else if( '' == user.email ) {
            cb({err:'empty_email'})
          }
          else {
            user.save$(function(err,out){
              console.dir(['save',err,out])
              cb(err,out)
            })
          }
        }
      })
    })


    cb()
  }



  var oauthdefs = {}

  oauthdefs.redirect = function(service,req,res) {
    var hosturl = service.hosturl
    var requrl   = 'http://'+req.headers.host
    if( hosturl != requrl ) {
      var fixurl = hosturl+req.url
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
  }

  oauthdefs.v1 = {}

  oauthdefs.v1.login = function(service,state,clients,cb) {
    return function(req,res){
      if( oauthdefs.redirect(service,req,res) ) return;

      self.seneca.log('plugin','user','oauth','login',service.name)
      var ctxt = {req:req,res:res,service:service.name}
      
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
          state.set(tid,{secret:oauth_token_secret,token:oauth_token,tag:req.params.tag})
          
          var cookies = new Cookies( req, res )
          cookies.set(self.opts.prefix+'-seneca-oauth',tid,{domain:self.opts.domain})
          
          res.writeHead( 301, {
            "Location":
            service.authorize_url + oauth_token
          })
          res.end()
        }
      )
    }
  } // v1.login

  oauthdefs.v1.callback = function(service,state,clients,cb) {
    return function(req,res){
      self.seneca.log('plugin','user','oauth','callback',service.name)
      var ctxt = {req:req,res:res,service:service.name}
      var parsedurl = url.parse(req.url, true)

      var cookies = new Cookies( req, res )
      var tid = cookies.get(self.opts.prefix+'-seneca-oauth',{domain:self.opts.domain})
      state.get(tid,function(td){
        
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
            cookies.set(self.opts.prefix+'-seneca-oauth',null,{domain:self.opts.domain})
            state.del(tid)

            oauthdefs.usermeta[service.name](service,state,clients,ctxt,cb)
          }
        )
      })
    }
  }


  oauthdefs.v2 = {}

  oauthdefs.v2.login = function(service,state,clients,cb) {
    return function(req,res){
      if( oauthdefs.redirect(service,req,res) ) return;

      self.seneca.log('plugin','user','oauth','login',service.name)

      var tid = uuid()
      state.set(tid,{tag:req.params.tag})
      
      var cookies = new Cookies( req, res )
      cookies.set(self.opts.prefix+'-seneca-oauth',tid,{domain:self.opts.domain})

      var redirecturl = 
        clients[service.name].getAuthorizeUrl(
          {redirect_uri:service.callback_url, scope:'' })

      res.writeHead( 301, {
        'Location':redirecturl
      })
      res.end()
    }
  }

  oauthdefs.v2.callback = function(service,state,clients,cb) {
    return function(req,res){
      var ctxt = {req:req,res:res,service:service.name}
      self.seneca.log('plugin','user','oauth','callback',service.name)

      var parsedurl = url.parse(req.url, true);

      var cookies = new Cookies( req, res )
      var tid = cookies.get(self.opts.prefix+'-seneca-oauth',{domain:self.opts.domain})
      state.get(tid,function(td){
        
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
            cookies.set(self.opts.prefix+'-seneca-oauth',null,{domain:self.opts.domain})
            state.del(tid)

            oauthdefs.usermeta[service.name](service,state,clients,ctxt,cb)
          }
        )
      })
    }
  }


  oauthdefs.usermeta = {}
  
  oauthdefs.usermeta.twitter = function(service,state,clients,ctxt,cb) {
    ctxt.username = ctxt.addparams.screen_name
    ctxt.userid   = ctxt.addparams.user_id
    oauthdefs.userhandler(service,state,clients,ctxt,cb)
  }

  oauthdefs.usermeta.facebook = function(service,state,clients,ctxt,cb) {
    var geturl = service.base_url+'/me'
    clients[service.name].getProtectedResource(
      geturl, ctxt.token, function (error, data, response) {
        ctxt.responsedata = data
        
        console.dir(data)
        if( error ) {
          return cb(error,ctxt)
        }

        var json = JSON.parse(data)
        ctxt.userid   = json.id
        ctxt.username = json.username

        oauthdefs.userhandler(service,state,clients,ctxt,cb)
      })
  }

  oauthdefs.usermeta.linkedin = function(service,state,clients,ctxt,cb){
    var geturl = service.base_url+'/people/~:(id,first-name,last-name,public-profile-url)'
    clients[service.name].get(
      geturl, ctxt.token, ctxt.secret, function(error,data,response){
        ctxt.responsedata = data

        console.dir(data)
        if( error ) {
          return cb(error,ctxt)
        }
        
        var oneline = data.replace(/\n/g,'')
        var m = /<id>([^<]+)<\/id>.*<public-profile-url>http:\/\/www.linkedin.com\/in\/([^<]+)<\/public-profile-url>/.exec(oneline)
        if( m && m[1] && m[2] ) {
          ctxt.userid   = m[1]
          ctxt.username = m[2]
          oauthdefs.userhandler(service,state,clients,ctxt,cb)
        }
        else {
          cb('user_oauth_linkedin_username_notfound',ctxt)
        }
      }
    )
  }


  oauthdefs.userhandler= function(service,state,clients,ctxt,cb) {
    
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

          log('SENECA USER SET LOGIN COOKIE')
          var cookies = new Cookies( ctxt.req, ctxt.res )
          cookies.set(self.opts.prefix+'-'+service.tenant,out.login.token,
                      {
                        domain:self.opts.domain,
                        expires:new Date( new Date().getTime()+(30*24*3600*1000))
                      })

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



  self.service = function(opts,cb) {
    var hosturl = opts.hosturl || 'http://localhost'
    var prefix  = opts.prefix || '/user'
    var tenant  = opts.tenant

    if( !tenant ) {
      return cb('plugin_user_notenant')
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
      var state = opts.state || new MemState()

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
          app.get(loginpath,oauthdefs.v1.login(service,state,clients,cb))

          var callbackpath = prefix+'/oauth/'+servicename+'/callback/'
          app.get(callbackpath,oauthdefs.v1.callback(service,state,clients,cb))
          
        } // version 1

        else if( 2 == service.version ) {
          
          clients[servicename] = new oauth.OAuth2(
            service.keys.key,
            service.keys.secret,
            service.base_url
          )

          var loginpath = prefix+'/oauth/'+servicename+'/login/:tag?'
          app.get(loginpath,oauthdefs.v2.login(service,state,clients,cb))

          var callbackpath = prefix+'/oauth/'+servicename+'/callback/'
          app.get(callbackpath,oauthdefs.v2.callback(service,state,clients,cb))

        } // version 2

      }) // forEach service
    }) // connect.router
  } 
}


exports.plugin = function() {
  return new UserPlugin()
}

