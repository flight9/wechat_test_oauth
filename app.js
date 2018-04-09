'use strict'

var express = require('express')
var fs = require('fs')
var bodyParser = require('body-parser')
var wx_config = require('./wx_config')

var app = express()
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.get('/', function(req, res) {
	res.send('Welcome to Home!')
})
app.get('/jstest', function(req, res) {
	res.sendFile(__dirname+ '/views/jstest.html')
})

var appId = wx_config.appId
var appSecret = wx_config.appSecret

//---OAuthApi-----------------------------------------
var OAuth = require('wechat-oauth') 
var oauthApi = new OAuth(appId, appSecret, function (openid, callback) {
	  // 传入一个根据 openid 获取对应的全局 token 的方法
	  fs.readFile('./token/'+ openid +'.token.txt', 'utf8', function (err, txt) {
		if (err) {return callback(err)}
		callback(null, JSON.parse(txt))
	  })
}, function (openid, token, callback) {
	  // 请将 token 存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis 等
	  fs.writeFile('./token/'+ openid + '.token.txt', JSON.stringify(token), callback)
})

var callbackURL = 'http://flight9.free.ngrok.cc/wechat/callback'
app.get('/wechat/home', function(req, res) { 
	var url = oauthApi.getAuthorizeURL(callbackURL,'state','snsapi_userinfo') 
	console.log('Auth Url:', url) 
	res.redirect(url) 
})

app.get('/wechat/callback', function (req, res) { 
	console.log('---- Wechat callback start -----') 
	var code = req.query.code 
	console.log('Auth Code:', code) 
	
	oauthApi.getAccessToken(code, function (err, result) {
		console.log('getAccessToken err:', err)
		var accessToken = result.data.access_token
		var openid = result.data.openid
		console.log('Openid:', openid)
		console.log('AccessToken:', accessToken)
		
		oauthApi.getUser(openid, function (err, result1) { 
			console.log('getUser err: ', err)
			console.log('getUser user: ', result1)
			var oauth_user = result1 
			res.redirect('/') 
		}) 
	}) 
})

//---WechatAPI-----------------------------------------
var WechatAPI = require('wechat-api')
var wechatApi = new WechatAPI(appId, appSecret, function (callback) {
  // 传入一个获取全局 token 的方法
  fs.readFile('access_token.txt', 'utf8', function (err, txt) {
    if (err) {return callback(null, null)} // 这里不能用 return callback(err) 会造成后面 function (token, callback) 不调用 
    callback(null, JSON.parse(txt))
  })
}, function (token, callback) {
  // 请将 token 存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis 等
  console.log('Save token:', token)
  fs.writeFile('access_token.txt', JSON.stringify(token), callback)
})

wechatApi.registerTicketHandle(getTicketToken, saveTicketToken)
function getTicketToken(type, callback) {
	console.log('getTicketToken type:', type)
	fs.readFile('jsapi_token.txt', 'utf8', function (err, txt) {
		if (err) {return callback(null, null)} // 这里不能用 return callback(err) 会造成后面 function (token, callback) 不调用 
		callback(null, JSON.parse(txt))
	})
}
function saveTicketToken(type, ticketToken, callback) {
	console.log('Save type+js_token:', type, ticketToken)
	fs.writeFile('jsapi_token.txt', JSON.stringify(ticketToken), callback)
}

app.post('/wechat/jsconfig', function (req, res, next) {
	//console.info('Req.body:', req.body)
	var param = {
		debug: req.body.debug,
		jsApiList: req.body.jsApiList,
		url: req.body.url
	}
	wechatApi.getJsConfig(param, function(err, result){
		console.log('getJsConfig err+result:', err, result)
		res.send(result)
	})
})

// test sendTemplate()
app.get('/testtemplate', function (req, res, next) {
	var templateId = 'feWGkO8pyTaHq7w6jRkcxlr4PKqAbXiT2bL0xINpAq4';
	var url = 'http://weixin.qq.com/';
	var data = {
	   "first": {
		 "value":"恭喜你购买成功！",
		 "color":"#173177"
	   },
	   "keyword1":{
		 "value":"巧克力",
		 "color":"#173177"
	   },
	   "keyword2": {
		 "value":"39.8元",
		 "color":"#173177"
	   },
	   "keyword3": {
		 "value":"2014年9月22日",
		 "color":"#173177"
	   },
	   "keyword4": {
		 "value":"keyword4",
		 "color":"#173177"
	   },
	   "remark":{
		 "value":"欢迎再次购买！",
		 "color":"#173177"
	   }
	};
	wechatApi.sendTemplate('oW6aH0ditEHnptRI058xBw0pOBzg', templateId, url, data, function(err, result) {
		console.log('sendTemplate err+result:', err, result)
		err? res.send('Error:'+ JSON.stringify(result)): res.send('Ok! msgid:'+ result.msgid)
	})
})

//----------------------------------------------------

app.listen(1234, function() {
	console.info('Listening on: 1234')
})
