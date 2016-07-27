// 回复功能

var sha1 = require('sha1');
var Wechat = require('./wechat');
var getRawBody = require('raw-body');
var util = require('./util');

module.exports = function(opts, handler) {
    var wechat = new Wechat(opts);

    // 就是一个中间件
    return function*(next) {
        console.log('微信向我们服务器请求传递的数据：', this.query);

        var token = opts.token;
        var signature = this.query.signature;
        var nonce = this.query.nonce;
        var timestamp = this.query.timestamp;
        var echostr = this.query.echostr;

        var str = [token, timestamp, nonce].sort().join('');
        var sha = sha1(str);

        if (this.method === 'GET') {
            if (sha === signature) {
                this.body = echostr + '';
            } else {
                this.body = 'wrong';
            }
        } else if (this.method === 'POST') {
            // 拿到用户操作相关的信息（不一定是微信发过来的）
            if (sha !== signature) {
                this.body = 'wrong';

                return false;
            } else {
                var data = yield getRawBody(this.req, {
                    length: this.length,
                    limit: '1mb',
                    encoding: this.charset
                });

                // console.log('来自微信的数据：',data.toString());

                var content = yield util.parseXMLAsync(data);

                console.log(content);

                var message = util.formatMessage(content.xml);

                console.log(message);

                this.weixin = message;

                // 控制权交出去
                yield handler.call(this, next);

                wechat.reply.call(this);
            }
        }
    }
};
