'use strict';

var wechat = require('./wechat/g');
var Koa = require('koa');
var config = require('./config');
var reply = require('./wx/reply');

var app = new Koa();

app.use(wechat(config.wechat, reply.reply));

app.listen(1234);
console.log('Listening:1234');
