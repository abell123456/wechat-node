// token处理类

var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var mpPrefix = 'https://mp.weixin.qq.com/cgi-bin/';

var api = {
    // &appid=APPID&secret=APPSECRET
    accessToken: prefix + 'token?grant_type=client_credential',
    temporary: {
        upload: prefix + 'media/upload?',
        // access_token=ACCESS_TOKEN&media_id=MEDIA_ID
        fetch: prefix + 'media/get?'
    },
    permanent: {
        upload: prefix + 'material/add_material?',
        fetch: prefix + 'material/get_material?',
        uploadNews: prefix + 'material/add_news?',
        uploadNewsPic: prefix + 'media/uploadimg?',
        del: prefix + 'material/del_material?',
        update: prefix + 'material/update_news?',
        count: prefix + 'material/get_materialcount?',
        batch: prefix + 'material/batchget_material?'
    },
    group: {
        create: prefix + 'groups/create?',
        fetch: prefix + 'groups/get?',
        check: prefix + 'groups/getid?',
        update: prefix + 'groups/update?',
        move: prefix + 'groups/members/update?',
        batchupdate: prefix + 'groups/members/batchupdate?',
        del: prefix + 'groups/delete?'
    },
    user: {
        remark: prefix + 'user/info/updateremark?',
        fetch: prefix + 'user/info?',
        batchFetch: prefix + 'user/info/batchget?',
        list: prefix + 'user/get?'
    },
    mass: {
        group: prefix + 'message/mass/sendall?',
        openId: prefix + 'message/mass/send?',
        del: prefix + 'message/mass/delete?',
        preview: prefix + 'message/mass/preview?',
        check: prefix + 'message/mass/get?'
    },
    menu: {
        create: prefix + 'menu/create?',
        get: prefix + 'menu/get?',
        del: prefix + 'menu/delete?',
        current: prefix + 'get_current_selfmenu_info?'
    },
    qrcode: {
        // access_token=TOKEN
        create: prefix + 'qrcode/create?',
        // ticket=TICKET
        show: mpPrefix + 'showqrcode?'
    },
    shortUrl: {
        create: prefix + 'shorturl?'
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

    return this.getAccessToken()
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

        _.extend(form, permanent);
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
                    options.body = form;
                } else {
                    options.formData = form;
                }

                request(options).then(res => {
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

// 获取素材
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent) {
    var me = this;
    var form = {};
    var fetchUrl = api.temporary.fetch;

    if (permanent) {
        fetchUrl = api.permanent.fetch;
    }

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = fetchUrl + 'access_token=' + data.access_token;
                var form = {};
                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                };

                if (permanent) {
                    form.media_id = mediaId;
                    form.access_token = data.access_token;
                    options.body = form;
                } else {
                    if (type === 'video') {
                        url = url.replace('https://', 'http://');
                    }
                    url += '&media_id=' + mediaId;
                }

                if (type === 'news' || type === 'video') {
                    request(options).then(res => {
                        // TODO:res[1]
                        console.log('res[1]:', res[1]);
                        console.log('res.body:', res.body);
                        var _data = res.body;

                        if (_data) {
                            resolve(_data);
                        } else {
                            throw 'Update material fails';
                        }
                    }).catch(err => {
                        reject(err);
                    });
                } else {
                    resolve(url);
                }
            });
    });
};

// 删除素材
Wechat.prototype.deleteMaterial = function(mediaId) {
    var me = this;
    var form = {
        media_id: mediaId
    };

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.permanent.del + 'access_token=' + data.access_token +
                    '&media_id=' + mediaId;

                request({
                    url: url,
                    body: form,
                    json: true,
                    method: 'POST'
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Delete material fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.updateMaterial = function(mediaId, news) {
    var me = this;
    var form = {
        media_id: mediaId
    };

    _.extend(form, news);

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.permanent.update + 'access_token=' + data.access_token +
                    '&media_id=' + mediaId;

                request({
                    url: url,
                    body: form,
                    json: true,
                    method: 'POST'
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Update material fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.countMaterial = function() {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.permanent.count + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true,
                    method: 'GET'
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Count material fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.batchMaterial = function(options) {
    var me = this;

    options.type = options.type || 'image';
    options.offset = options.offset || 0;
    options.count = options.count || 1;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.permanent.batch + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: options
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Batch material fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

// 分组
Wechat.prototype.createGroup = function(name) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.group.create + 'access_token=' + data.access_token;

                var form = {
                    group: {
                        name: name
                    }
                };

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Create group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.fetchGroups = function(name) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.group.fetch + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'fetch group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.checkGroup = function(openId) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.group.check + 'access_token=' + data.access_token;

                var form = {
                    openid: openId
                };

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Check group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.updateGroup = function(id, name) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.group.update + 'access_token=' + data.access_token;

                var form = {
                    group: {
                        id: id,
                        name: name
                    }
                };

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Update group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};


Wechat.prototype.moveGroup = function(openIds, to) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url;
                var form = {
                    to_groupid: to
                };

                if (Array.isArray(openIds)) {
                    url = api.group.batchupdate + 'access_token=' + data.access_token;
                    form.openid_list = openIds;
                } else {
                    url = api.group.move + 'access_token=' + data.access_token;
                    form.openid = openIds;
                }

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Move group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.deleteGroup = function(id) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.group.del + 'access_token=' + data.access_token;

                var form = {
                    group: {
                        id: id
                    }
                };

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Delete group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.remarkUser = function(openId, remark) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.user.remark + 'access_token=' + data.access_token;

                var form = {
                    openid: openId,
                    remark: remark
                };

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Remark user fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.fetchUsers = function(openIds, lang) {
    var me = this;

    lang = lang || 'zh_CN';

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var options = {
                    json: true
                };

                if (Array.isArray(openIds)) {
                    options.url = api.user.batchFetch + 'access_token=' + data.access_token;
                    options.body = {
                        user_list: openIds
                    };
                    options.method = 'POST';
                } else {
                    options.url = api.user.fetch + 'access_token=' + data.access_token +
                        '&openid=' + openIds + '&lang=' + lang;
                }



                request(options).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Remark user fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.listUsers = function(openId) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.user.list + 'access_token=' + data.access_token;

                if(openId) {
                    url += '&next_openid=' + openId;
                }

                request({
                    url: url,
                    json: true
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'List users fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.sendByGroup = function(type, message, groupId) {
    var me = this;
    var msg = {
        filter: {},
        msgtype: type
    };

    msg[type] = message;

    if(groupId === undefined) {
        msg.filter.is_to_all = true;
    } else {
        msg.filter = {
            is_to_all: false,
            group_id: groupId
        };
    }

    console.log('msg:', msg);

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.mass.group + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: msg
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Send to group fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.sendByOpenId = function(type, message, openIds) {
    var me = this;
    var msg = {
        msgtype: type,
        touser: openIds
    };

    msg[type] = message;


    console.log('msg:', msg);

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.mass.openId + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: msg
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Send by openId fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.deleteMass = function(msgId) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.mass.del + 'access_token=' + data.access_token;
                var form = {
                    msg_id: msgId
                };

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Delete mass fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.previewMass = function(type, message, openId) {
    var me = this;
    var msg = {
        msgtype: type,
        touser: openId
    };

    msg[type] = message;

    console.log('preview msg:', msg);

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.mass.preview + 'access_token=' + data.access_token;
                console.log('url:', url);

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: msg
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Preview mass fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.checkMass = function(msgId) {
    var me = this;
    var form = {
        msg_id: msgId
    };

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.mass.check + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: form
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Check mass fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

// menu
Wechat.prototype.createMenu = function(menu) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.menu.create + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true,
                    method: 'POST',
                    body: menu
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Create menu fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.getMenu = function() {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.menu.get + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Get menu fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.deleteMenu = function() {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.menu.del + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Delete menu fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.getCurrentMenu = function(menu) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.menu.current + 'access_token=' + data.access_token;

                request({
                    url: url,
                    json: true
                }).then(res => {
                    // TODO:res[1]
                    console.log('res[1]:', res[1]);
                    console.log('res.body:', res.body);
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Get menu fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.createQrcode = function(qr) {
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.qrcode.current + 'access_token=' + data.access_token;

                request({
                    method: 'POST',
                    body: qr,
                    url: url,
                    json: true
                }).then(res => {
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Create qr fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

Wechat.prototype.showQrcode = function(ticket) {
    return api.qrcode.show + 'ticket=' + encodeURI(ticket);
};

Wechat.prototype.createShortUrl = function(action, url) {
    action = action || 'long2short';
    var me = this;

    return new Promise(function(resolve, reject) {
        me
            .fetchAccessToken()
            .then(data => {
                var url = api.shortUrl.create + 'access_token=' + data.access_token;

                var form = {
                    action: action,
                    long_url: url
                };

                request({
                    method: 'POST',
                    body: form,
                    url: url,
                    json: true
                }).then(res => {
                    var _data = res.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw 'Create short url fails';
                    }
                }).catch(err => {
                    reject(err);
                });
            });
    });
};

module.exports = Wechat;
