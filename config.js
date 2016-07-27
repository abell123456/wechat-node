var path = require('path');
var util = require('./libs/util');
var wechat_file = path.join(__dirname, './config/wechat.txt');

var config = {
    wechat: {
        appId: 'wx165236d0cdb047fc',
        appSecret: '8b125286ad122d41301960a095eb27d8',
        token: 'wang123456',
        // 获取票据
        getAccessToken: function() {
            return util.readFileAsync(wechat_file);
        },
        // 更新票据
        saveAccessToken: function(data) {
            data = JSON.stringify(data);
            return util.writeFileAsync(wechat_file, data);
        }
    }
};

module.exports = config;
