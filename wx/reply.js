var config = require('../config');
var Wechat = require('../wechat/wechat');
var wechatApi = new Wechat(config.wechat);
var menu = require('./menu');
var path = require('path');

// 创建一个新的菜单
wechatApi
    .deleteMenu()
    .then(() => {
        return wechatApi.createMenu(menu);
    })
    .then((msg) => {
        console.log(msg);
    });

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
        } else if (message.Event === 'scancode_push') {
            console.log(message.ScanCodeInfo.ScanType);
            console.log(message.ScanCodeInfo.ScanResult);
            this.body = '您点击了菜单中： ' + message.EventKey;
        } else if (message.Event === 'scancode_waitmsg') {
            console.log(message.ScanCodeInfo.ScanType);
            console.log(message.ScanCodeInfo.ScanResult);
            this.body = '您点击了菜单中： ' + message.EventKey;
        } else if (message.Event === 'pic_sysphoto') {
            console.log(message.SendPicsInfo.PicList);
            console.log(message.SendPicsInfo.Count);
            this.body = '您点击了菜单中： ' + message.EventKey;
        } else if (message.Event === 'pic_photo_or_album') {
            this.body = '您点击了菜单中： ' + message.EventKey;
        } else if (message.Event === 'pic_weixin') {
            console.log(message.SendPicsInfo.PicList);
            console.log(message.SendPicsInfo.Count);
            this.body = '您点击了菜单中： ' + message.EventKey;
        } else if (message.Event === 'location_select') {
            console.log(message.SendLocationInfo.Location_X);
            console.log(message.SendLocationInfo.Location_Y);
            console.log(message.SendLocationInfo.Scale);
            console.log(message.SendLocationInfo.Label);
            console.log(message.SendLocationInfo.Poiname);
            this.body = '您点击了菜单中： ' + message.EventKey;
        } else {
            this.body = 'Empty news';
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
            var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'));

            reply = {
                type: 'image',
                mediaId: data.media_id
            };
        } else if (content === '6') {
            var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, '../6.mp4'));

            reply = {
                type: 'video',
                title: '回复视频',
                description: '以上是回复视频',
                mediaId: data.media_id
            };
        } else if (content === '7') {
            var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'));

            reply = {
                type: 'music',
                title: '回复音乐',
                description: '放松一下',
                musicUrl: 'http://mpge.5nd.com/2015/2015-9-12/66325/1.mp3',
                thumbMediaId: data.media_id
            };
        } else if (content === '8') {
            var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'), {
                type: 'image'
            });

            reply = {
                type: 'image',
                mediaId: data.media_id
            };
        } else if (content === '9') {
            var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, '../6.mp4'), {
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
        } else if (content === '10') {
            var picData = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'), {

            });

            console.log('picData:', picData);

            var media = {
                articles: [{
                    title: '图片图片',
                    thumb_media_id: picData.media_id,
                    author: 'wxz',
                    digest: '摘要部分',
                    show_cover_pic: 1,
                    content: '内容部分',
                    content_source_url: 'https://github.com'
                }]
            };

            var data = yield wechatApi.uploadMaterial('news', media, {});
            data = yield wechatApi.fetchMaterial(data.media_id, 'news', {});

            console.log(data);

            var items = data.news_item;
            var news = [];

            items.forEach(item => {
                news.push({
                    title: item.title,
                    description: item.digest,
                    picUrl: picData.url,
                    url: item.url
                });
            });

            reply = news;
        } else if (content === '11') {
            var counts = yield wechatApi.countMaterial();

            console.log(JSON.stringify(counts));
            var results = yield [
                wechatApi.batchMaterial({
                    offset: 0,
                    count: 10,
                    type: 'image'
                }),
                wechatApi.batchMaterial({
                    offset: 0,
                    count: 10,
                    type: 'video'
                }),
                wechatApi.batchMaterial({
                    offset: 0,
                    count: 10,
                    type: 'voice'
                }),
                wechatApi.batchMaterial({
                    offset: 0,
                    count: 10,
                    type: 'news'
                })
            ];

            console.log(JSON.stringify(results));

            reply = 'results';
        } else if (content === '12') {
            var group = yield wechatApi.createGroup('wechat3');

            console.log('新分组：');
            console.log(group);

            var groups = yield wechatApi.fetchGroups();

            console.log('接了wechat后的分组列表：');
            console.log(groups);

            var group2 = yield wechatApi.checkGroup(message.FromUserName);

            console.log('查看自己的分组:');
            console.log(group2);

            var result = yield wechatApi.moveGroup(message.FromUserName, 100);
            console.log('移动到100：');
            console.log(result);

            groups2 = yield wechatApi.fetchGroups();

            console.log('移动后的分组列表：');
            console.log(groups2);

            var result2 = yield wechatApi.moveGroup([message.FromUserName], 101);
            console.log('移动到100：');
            console.log(result2);

            var group3 = yield wechatApi.fetchGroups();

            console.log('移动后的分组:');
            console.log(group3);

            var result3 = yield wechatApi.updateGroup(100, 'wechat100');
            console.log('100wechat 改名为wechat100');
            console.log(result3);

            var group4 = yield wechatApi.fetchGroups();
            console.log('改名后的分组:');
            console.log(group4);

            var result4 = yield wechatApi.deleteGroup(101);
            console.log('删除101分组');

            var group5 = yield wechatApi.fetchGroups();
            console.log('删除后的分组:');
            console.log(group5);

            reply = 'Group done!';
        } else if (content === '13') {
            var user = yield wechatApi.fetchUsers(message.FromUserName, 'en');

            console.log(user);

            var openIds = [{
                openid: message.FromUserName,
                lang: 'en'
            }];

            var users = yield wechatApi.fetchUsers(openIds);

            console.log(users);

            reply = JSON.stringify(user);
        } else if (content === '14') {
            var userlist = yield wechatApi.listUsers();

            console.log(userlist);

            reply = userlist.total;
        } else if (content === '15') {
            var mpnews = {
                media_id: 'y-fGnSq3DSLxpj_y5iM_3-NWBap9XddUk_b4-Ave2yQ'
            };

            var text = {
                content: 'Hello! 我是一条公众号推送消息，正在测试，如有打扰请取消关注 ：）💗'
            };


            msgData = yield wechatApi.sendByGroup('text', text);

            console.log('msgData:', msgData);
            reply = '回复推送消息功能测试。';
        } else if (content === '16') {
            var mpnews = {
                media_id: 'y-fGnSq3DSLxpj_y5iM_3zTOg8dMfK58HbMeev9A6SU'
            };

            var text = {
                content: 'hello, wxz!'
            };

            var msgData = yield wechatApi.previewMass('mpnews', mpnews, 'oLywsvzNSype9bqPAaA-vcZdlilk');

            console.log('msgData:', msgData);
            reply = '回复推送消息功能测试。';
        } else if (content === '17') {
            var msgData = yield wechatApi.checkMass('y-fGnSq3DSLxpj_y5iM_3zTOg8dMfK58HbMeev9A6SU');

            console.log(msgData);

            reply = '消息推送是否成功检查。';
        } else if (content === '18') {
            var tempQr = {
                expire_seconds: 604800,
                action_name: "QR_SCENE",
                action_info: {
                    scene: {
                        "scene_id": 123
                    }
                }
            };

            var permQr = {
                action_name: 'QR_LIMIT_SCENE',
                action_info: {
                    scene: {
                        scene_id: 123
                    }
                }
            };

            var permStrQr = {
                action_name: 'QR_LIMIT_STR_SCENE',
                action_info: {
                    scene: {
                        scene_str: 'abc'
                    }
                }
            };

            var qr1 = yield wechatApi.createQrcode(tempQr);
            var qr2 = yield wechatApi.createQrcode(permQr);
            var qr3 = yield wechatApi.createQrcode(permStrQr);


            reply = 'Yeah!';
        } else if(content === '19') {
            var longUrl = 'http://www.imooc.com/';

            var shortData = yield wechatApi.createShorturl(null, longUrl);

            reply = shortData.short_url;
        }

        console.log('回复的内容：', reply);

        this.body = reply;
    }

    yield next;
};
