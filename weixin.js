var config = require('./config');
var Wechat = require('./wechat/wechat');

var wechatApi = new Wechat(config.wechat);

exports.reply = function*(next) {
    var message = this.weixin;

    if (message.MsgType === 'event') {
        // 事件推送
        if (message.Event === 'subscribe') {
            if (message.EventKey) {
                console.log('扫描二维码进来的: ' + message.EventKey + ' ' + message.Ticket);
            }

            this.body = '终于等到你，还好我没放弃！';
        } else if (message.Event === 'unsubscribe') {
            console.log('取消关注');
            this.body = '';
        } else if (message.Event === 'LOCATION') {
            this.body = '您上报的位置是：' + message.Latitude + '/' + message.Longitude + '-' + message.Precision;
        } else if (message.Event === 'CLICK') {
            this.body = '您点击了菜单：' + message.EventKey;
        } else if (message.Event === 'SCAN') {
            console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket);

            this.body = '看到你扫一下';
        } else if (message.Event === 'VIEW') {
            this.body = '您点击了菜单中的链接： ' + message.EventKey;
        }
    } else if (message.MsgType === 'text') {
        var content = message.Content;
        var reply = '呃，你说的： ' + content + ' 太复杂了，不能理解！';

        if (content === '1') {
            reply = '回复你的1';
        } else if (content === '2') {
            reply = '天下第二吃虾米';
        } else if (content === '4') {
            reply = [{
                title: '技术改变世界',
                description: '只是个描述',
                picUrl: 'http://pic2.qiyipic.com/image/20150218/ba/00/v_108959850_m_601_m2_116_65.jpg',
                url: 'https://www.baidu.com/'
            }, {
                title: 'Node.js开发微信',
                description: '很爽',
                picUrl: 'http://www.qiyipic.com/common/fix/public_images/logo108x35_share.png',
                url: 'https://www.baidu.com/'
            }];
        } else if (content === '5') {
            var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg');

            reply = {
                type: 'image',
                mediaId: data.media_id
            };
        } else if (content === '6') {
            var data = yield wechatApi.uploadMaterial('video', __dirname + '/6.mp4');

            reply = {
                type: 'video',
                title: '回复视频',
                description: '以上是回复视频',
                mediaId: data.media_id
            };
        } else if (content === '7') {
            var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg');

            reply = {
                type: 'music',
                title: '回复音乐',
                description: '放松一下',
                musicUrl: 'http://mpge.5nd.com/2015/2015-9-12/66325/1.mp3',
                thumbMediaId: data.media_id
            };
        } else if (content === '8') {
            var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg', {
                type: 'image'
            });

            reply = {
                type: 'image',
                mediaId: data.media_id
            };
        } else if (content === '9') {
            var data = yield wechatApi.uploadMaterial('video', __dirname + '/6.mp4', {
                type: 'video',
                description: '{"title": "Realy a nice place","introduction": "Nerver think it so easy"}'
            });

            console.log(data);

            reply = {
                type: 'video',
                title: '回复视频',
                description: '以上是回复视频',
                mediaId: data.media_id
            };
        }

        console.log('回复的内容：', reply);

        this.body = reply;
    }

    yield next;
};
