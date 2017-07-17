var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    netWorkStatus: true,//检查网络状态
    loadingPage: true, // 空白加载页
    hasNotify: '',
    userType: '', // 用户类型
    notifyList: [], // 消息通知列表
    delBtnShow: false,
    getNotifyListParams: {//获取用户通知接口参数
      token: '',
      filter: {},
      last_id: '',
      checksum: ''
    },
    updateReadStateParams: {//设置消息为已读状态
      token: '',
      notify_ids: [],
      is_read: 1,
      checksum: ''
    },
    deleteNotifyParams: { //删除消息
      token: '',
      notify_ids: [],
      checksum: ''
    }
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 判断用户类型
      this.setData({ 'userType': wx.getStorageSync('user_type') });
      if (this.data.userType == 1) {
        this.setData({ 'loadingPage': false })
      } else if (this.data.userType == 0) {
        if (wx.showLoading) wx.showLoading({ title: '正在加载中...' });
        if (wx.getStorageSync('notify_list')) {
          this.setData({
            'notifyList': wx.getStorageSync('notify_list')
          });
        } else {
          this.setData({
            'notifyList': []
          });
        }
        wx.getNetworkType({
          success: (res) => {
            var networkType = res.networkType;
            if (networkType == "none" || networkType == "unknown") {
              this.setData({
                'netWorkStatus': false,
                'loadingPage': false,
              })
            } else {
              this.setData({
                'netWorkStatus': true,
                'loadingPage': true,
              })
            }
          },
        })
      }
    }
  },
  onShow: function () {
    // 获取用户通知数据,如果缓存中已经有消息，将消息保存到notifyList中
    if (this.data.userType == 0) {
      if (wx.getStorageSync('notify_list')) {
        this.setData({
          'notifyList': wx.getStorageSync('notify_list')
        });
      } else {
        this.setData({
          'notifyList': []
        });
      }
      this.getNotifyList();
    }
  },
  onShareAppMessage: function () {
    return {
      title: '掌握学科思维，轻松快乐学习！',
      src: '/pages/share/share'
    }
  },
  // 网络失败，重新发起接口请求
  getNetworkType: function (e) {
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType // 返回网络类型2g，3g，4g，wifi, none, unknown
        if (networkType == "none" || networkType == "unknown") {
          //没有网络连接
          this.setData({
            'netWorkStatus': false,
            'loadingPage': false,
          })
        } else {
          this.setData({
            'netWorkStatus': true,
            'loadingPage': true
          });
          // 显示空白加载页和loading
          if (wx.getStorageSync('notify_list')) {
            this.setData({ 'notifyList': wx.getStorageSync('notify_list') })
          } else {
            this.setData({
              'notifyList': []
            });
          }
          this.getNotifyList();
        }
      }
    })
  },
  // 获取用户通知列表
  getNotifyList() {
    // 根据是否有缓存，设置last_id
    if (wx.getStorageSync('notify_last_id')) {
      this.setData({
        'getNotifyListParams.last_id': wx.getStorageSync('notify_last_id')
      })
    } else {
      this.setData({
        'getNotifyListParams.last_id': ''
      })
    }
    var getNotifyListParams = this.data.getNotifyListParams;
    var token = wx.getStorageSync('token');
    var filter = JSON.stringify(getNotifyListParams.filter);
    var checksum = token + filter + getNotifyListParams.last_id + app.globalData.SALT;
    this.setData({
      'getNotifyListParams.token': token,
      'getNotifyListParams.filter': filter,
      'getNotifyListParams.checksum': md5(checksum)
    });
    // 检查网状态，发起接口请求
    util.checkNetWorkStatus(this.launchgetNotifyList);
  },
  launchgetNotifyList() {
    var url = app.globalData.baseUrl + '/notifies/get_notify_list';
    util.http(url, this.data.getNotifyListParams, this.getNotifyListCb);
  },
  // 获取用户通知列表回调函数
  getNotifyListCb(res) {
    // 先将json字符串转换成json对象
    var filter = this.data.getNotifyListParams.filter;
    if (typeof filter == 'string') {
      this.setData({
        'getNotifyListParams.filter': JSON.parse(this.data.getNotifyListParams.filter)
      });
    }
    var filter = this.data.getNotifyListParams.filter;
    if (res.status == 0) {
      var notifyStorage = res.result.notify;
      if (notifyStorage.length != 0) {//如果返回的数据不为空
        // 如果加载所有信息，本次加载有未读消息，则震动提示
        var canVibrate = false;
        if (util.isEmpty(filter)) {
          notifyStorage.forEach((item, i, array) => {
            if (item.is_read == 0) {
              canVibrate = true;
            }
          })
        }
        if (canVibrate) {
          if (wx.vibrateLong) {
            wx.vibrateLong();
          }
        }
        // 对数据进行本地处理
        for (var i = 0; i < notifyStorage.length; i++) {
          var notifyOne = notifyStorage[i];
          notifyOne.add_time = util.formatTime(notifyOne.add_time * 1000);
          notifyOne.notify_linkdata = JSON.parse(notifyOne.notify_linkdata);
        }
        var notifyList = this.data.notifyList;
        var totalList = notifyStorage.concat(notifyList);//将返回的数据与当前的数据进行合并
        // 只保存最新的100信息，超过这个信息，就删除缓存100条后的其他的数
        if (totalList.length > 100) {
          totalList.splice(100, totalList.length - 1)
        }
        this.setData({
          'notifyList': totalList
        });
        // 将所有消息缓存下来，把最后一条信息的id记录到缓存中
        wx.setStorageSync('notify_list', totalList);
        wx.setStorageSync('notify_last_id', totalList[0].notify_id);
      }
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
    // 判断是否有消息
    if (this.data.notifyList.length == 0) {
      this.setData({
        'hasNotify': false
      })
    } else {
      this.setData({
        'hasNotify': true
      })
    }
    // 隐藏loading和空白页
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
  },
  // 发起更新is_read的状态
  updateReadStatus(e) {
    var token = wx.getStorageSync('token');
    var is_read = 1;
    var notifyId = e.currentTarget.dataset.notifyId;
    var notifyIds = JSON.stringify([].concat(notifyId));
    var checksum = token + notifyIds + is_read + app.globalData.SALT;
    this.setData({
      'updateReadStateParams.token': token,
      'updateReadStateParams.notify_ids': notifyIds,
      'updateReadStateParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/notifies/update_read_state';
    util.http(url, this.data.updateReadStateParams, this.updateReadStateCb);
    var touchTime = this.data.touchend - this.data.touchstart;
    // 根据touch时间，决定是删除还是跳转到DNA批阅页面
    if (touchTime > 350) {
      this.deleteNotify(e);
    } else {
      this.toGetDnaCommentList(e);
    }
  },
  // 发起更新is_read的状态的回调函数
  updateReadStateCb(res) {
    // 先反序列化notify_ids
    this.setData({
      'updateReadStateParams.notify_ids': JSON.parse(this.data.updateReadStateParams.notify_ids)
    });
    if (res.status == 0) {
      // 将notifyList的值的is_read更改为1,并更新缓存
      var notifyList = this.data.notifyList;
      var notifyIds = this.data.updateReadStateParams.notify_ids;
      // 判断两个数组中相同的元素
      for (var i = 0; i < notifyList.length; i++) {
        for (var j = 0; j < notifyIds.length; j++) {
          if (notifyList[i].notify_id == notifyIds[j]) {
            notifyList[i].is_read = 1;
          }
        }
      }
      this.setData({
        'notifyList': notifyList
      });
      wx.setStorageSync('notify_list', notifyList)
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 跳转到查看DNA批阅页面
  toGetDnaCommentList: function (e) {
    var dnaId = e.currentTarget.dataset.dnaId;
    wx.setStorageSync('dna_id', dnaId);
    wx.navigateTo({
      url: '../getDnaCommentList/getDnaCommentList?dnaId=' + dnaId,
    });
  },
  // 删除消息
  deleteNotify: function (e) {
    wx.showModal({
      title: '提示',
      content: '删除此条消息记录',
      success: (res) => {
        if (res.confirm) {
          var notifyId = e.currentTarget.dataset.notifyId;
          var token = wx.getStorageSync('token');
          var notify_ids = JSON.stringify([].concat(notifyId));
          var checksum = token + notify_ids + app.globalData.SALT;
          this.setData({
            'deleteNotifyParams.token': token,
            'deleteNotifyParams.notify_ids': notify_ids,
            'deleteNotifyParams.checksum': md5(checksum)
          });
          //发起接口请求
          var url = app.globalData.baseUrl + '/notifies/delete_notify';
          util.http(url, this.data.deleteNotifyParams, this.deleteNotifyCb)
        }
      }
    })
  },
  deleteNotifyCb(res) {
    var notifyId = JSON.parse(this.data.deleteNotifyParams.notify_ids)[0];
    if (res.status == 0) {
      var notifyList = this.data.notifyList;
      for (var i = 0; i < notifyList.length; i++) {
        if (notifyList[i].notify_id == notifyId) {
          notifyList.splice(i, 1);
        }
      }
      this.setData({
        'notifyList': notifyList
      })
      wx.setStorageSync('notify_list', notifyList)
    }
  },
  touchstart: function (e) {
    this.setData({
      'touchstart': e.timeStamp
    })
  },
  touchend: function (e) {
    this.setData({
      'touchend': e.timeStamp
    })
  },
})