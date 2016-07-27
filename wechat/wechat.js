// token处理类

var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var api = {
    // &appid=APPID&secret=APPSECRET
    accessToken: prefix + 'token?grant_type=client_credential',
    temporary: {
        upload: prefix + 'media/upload?'
    },
    permanent: {
        upload: prefix + 'material/add_material?',
        uploadNews: prefix + 'material/add_news?',
        uploadNewsPic: prefix + 'media/uploadimg?'
    }
};

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var util = require('./util');
var fs = require('fs');
var _ = require('lodash');

function Wechat(opts) {
    var that = this;

    this.appId = opts.appId;
    this.appSecret = opts.appSecret;
    this.getAccessToken = opts.getAccessToken;
    this.saveAccessToken = opts.saveAccessToken;

    this.fetchAccessToken();
}

Wechat.prototype.fetchAccessToken = function() {
    var me = this;

    if (me.access_token && me.expires_in) {
        if (me.isValidAccessToken(me)) {
            return Promise.resolve(this);
        }
    }

    this.getAccessToken()
        .then(data => {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return me.updateAccessToken();
            }

            if (me.isValidAccessToken(data)) {
                return Promise.resolve(data); // 返回一个Promise
            } else {
                return me.updateAccessToken(data);
            }
        })
        .then(data => {
            me.access_token = data.access_token;
            me.expires_in = data.expires_in;

            me.saveAccessToken(data);

            return Promise.resolve(data);
        });
};

Wechat.prototype.isValidAccessToken = function(data) {
    if (!data || !data.access_token || !data.expires_in) {
        return false;
    }

    var access_token = data.access_token;
    var expires_in = data.expires_in;

    var now = (new Date().getTime());

    if (now < expires_in) {
        return true;
    } else {
        return false;
    }
};

Wechat.prototype.updateAccessToken = function() {
    var appId = this.appId;
    var appSecret = this.appSecret;

    var url = api.accessToken + '&appid=' + appId + '&secret=' + appSecret;

    return new Promise(function(resolve, reject) {
        request({
            url: url,
            json: true
        }).then(res => {
            console.log('response data:', res.body);

            var data = res.body;
            var now = new Date().getTime();
            var expires_in = now + (data.expires_in - 20) * 1000;

            data.expires_in = expires_in;

            resolve(data);
        }, err => {
            console.log('请求出错：', err);
        });
    });
};

Wechat.prototype.reply = function() {
    var content = this.body;
    var message = this.weixin;

    var xml = util.tpl(content, message);

    this.status = 200;
    this.type = 'application/xml'

    console.log('xml:', xml);

    this.body = xml;
};

Wechat.prototype.uploadMaterial = function(type, material, permanent) {
    var me = this;
    var form = {};
    var uploadUrl = api.temporary.upload;

    if (permanent) {
        uploadUrl = api.permanent.upload;

        _.extend(from, permanent);
    }

    if (type === 'pic') {
        uploadUrl = api.permanent.uploadNewsPic;
    }

    if (type === 'news') {
        uploadUrl = api.permanent.uploadNews;
        form = material;
    } else {
        form.media = fs.createReadStream(material);
    }

    var appId = this.appId;
    var appSecret = this.appSecret;


    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = uploadUrl + 'access_token=' + data.access_token;

                if (!permanent) {
                    url += '&type=' + type;
                } else {
                    form.access_token = data.access_token;
                }

                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                };

                if (type === 'news') {
                    options.body = from;
                } else {
                    options.formData = form;
                }

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    formData: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Upload material fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

module.exports = Wechat;
