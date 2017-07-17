var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    netWorkStatus: true,
    userInfo: {},
    sexItems: {
      array: ['女', '男'],
      index: 0
    },
    modalProperty: {
      modalShow: false,
      totalModal: false,
      nickNameModal: false,
      schoolModal: false,
      gradeModal: false
    },
    userInfoParams: {//用户信息接口参数
      token: '',
      checksum: ''
    },
    changeHeadImgParams: {//修改用户头像
      token: '',
      checksum: '',
    },
    editUserInfoParams: {//修改用户接口参数
      token: '',
      info: {},
      checksum: ''
    },
    loginOutParams: {//用户登出接口参数
      token: '',
      checksum: ''
    },
  },
  onLoad: function (options) {
    // 判断是否有token ,没有跳到登录页面
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      this.getNetworkType();
    }
  },
  onShareAppMessage: function () {
    return {
      title: '掌握学科思维，轻松快乐学习！',
      src: '/pages/share/share'
    }
  },
  getNetworkType: function (e) {
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType // 返回网络类型2g，3g，4g，wifi, none, unknown
        if (networkType == "none" || networkType == "unknown") {
          //没有网络连接
          this.setData({
            'netWorkStatus': false,
          })
        } else {
          if (wx.showLoading) {
            wx.showLoading({ title: '正在加载中...' })
          }
          this.setData({
            'netWorkStatus': true,
          });
          // 发起接口请求
          this.getUserInfo();
        }
      }
    })
  },
  getUserInfo(e) {
    var token = wx.getStorageSync('token');
    var checksum = token + app.globalData.SALT;
    this.setData({
      'userInfoParams.token': token,
      'userInfoParams.checksum': md5(checksum)
    });
    // 检查网状态，发起接口请求
    util.checkNetWorkStatus(this.launchGetUsetInfo);
  },
  launchGetUsetInfo() {
    var url = app.globalData.baseUrl + '/users/get_user_info';
    util.http(url, this.data.userInfoParams, this.getUserInfoCb);
  },
  getUserInfoCb(res) {
    var user = res.result.user;
    if (res.status == 0) {
      this.setData({
        'userInfo': user,
        'editUserInfoParams.info.nick_name': user.nick_name,
        'editUserInfoParams.info.sex': user.sex,
        'editUserInfoParams.info.school': user.school,
        'editUserInfoParams.info.grade': user.grade
      });
      //缓存用户头像，姓名，年级，学校
      wx.setStorageSync('head', user.head);
      wx.setStorageSync('real_name', user.real_name);
      wx.setStorageSync('nick_name', user.nick_name);
      wx.setStorageSync('sex', user.sex);
      wx.setStorageSync('school', user.school);
      wx.setStorageSync('grade', user.grade);
    } else if (res.status == -3) {//token失效
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
    // 数据处理完之后，隐藏空白页面并隐藏loading
    if (wx.hideLoading) { wx.hideLoading() }
  },
  changeHeadImg: function (e) {
    util.checkNetWorkStatus(this.launchChangeHeadImg);
  },
  launchChangeHeadImg() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        //设置接口参数token,checksum
        var token = wx.getStorageSync('token');
        var checksum = token + app.globalData.SALT;
        this.setData({
          'changeHeadImgParams.token': token,
          'changeHeadImgParams.checksum': md5(checksum),
        });
        //发起uploadFile请求
        var url = app.globalData.baseUrl + '/users/change_head_image_wexin';
        util.uploadFile(url, res.tempFilePaths, this.data.changeHeadImgParams, this.changeHeadImgCb)
      }
    })
  },
  changeHeadImgCb(res) {
    if (res.status == 0) {
      // 设置用户头像，及时更新页面
      this.setData({
        'userInfo.head': res.result.head
      })
      // 设置缓存，更新其他页面的头像
      wx.setStorageSync('head', res.result.head)
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  unableChangeRealName: function (e) {
    wx.showModal({
      title: '提示',
      content: '真实姓名一旦注册，无法修改！',
      showCancel: false,
    })
  },
  setNickname: function (e) {
    this.setData({
      'modalProperty.modalShow': true,
      'modalProperty.totalModal': true,
      'modalProperty.nickNameModal': true,
    })
  },
  changeNickName: function (e) {
    this.setData({
      'editUserInfoParams.info.nick_name': e.detail.value
    });
  },
  pickerSexChange: function (e) {
    this.setData({
      'sexItems.index': parseInt(e.detail.value),
      'editUserInfoParams.info.sex': parseInt(e.detail.value)
    });
    this.editUserInfo();
  },
  setSchool: function (e) {
    this.setData({
      'modalProperty.modalShow': true,
      'modalProperty.totalModal': true,
      'modalProperty.schoolModal': true,
    })
  },
  changeSchool: function (e) {
    this.setData({
      'editUserInfoParams.info.school': e.detail.value
    });
  },
  setGrade: function (e) {
    this.setData({
      'modalProperty.modalShow': true,
      'modalProperty.totalModal': true,
      'modalProperty.gradeModal': true,
    })
  },
  changeGrade: function (e) {
    this.setData({
      'editUserInfoParams.info.grade': e.detail.value
    });
  },
  cancelModal: function (e) {
    this.setData({
      'modalProperty.modalShow': false,
      'modalProperty.totalModal': false,
      'modalProperty.nickNameModal': false,
      'modalProperty.schoolModal': false,
      'modalProperty.gradeModal': false
    })
  },
  editUserInfo: function (e) {
    util.checkNetWorkStatus(this.launchEditUserInfo);
  },
  launchEditUserInfo() {
    var editUserInfoParams = this.data.editUserInfoParams;
    var info = editUserInfoParams.info;
    var userInfo = this.data.userInfo;
    // 判断用户数据是否更改，未更改不发起请求
    if (!(info.nick_name == userInfo.nick_name && info.sex == userInfo.sex && info.school == userInfo.school && info.grade == userInfo.grade)) {
      // 发起接口请求
      var token = wx.getStorageSync('token');
      var info = JSON.stringify(editUserInfoParams.info);
      var checksum = token + info + app.globalData.SALT;
      this.setData({
        'editUserInfoParams.token': token,
        'editUserInfoParams.info': info,
        'editUserInfoParams.checksum': md5(checksum)
      });
      var url = app.globalData.baseUrl + '/users/change_user_info';
      util.http(url, editUserInfoParams, this.editUserInfoCb);
      this.cancelModal();
    } else {
      // 不发起接口请求，客服端提示
      wx.showToast({
        title: '用户信息未修改',
        icon: 'loading',
        duration: 1000,
      })
      this.cancelModal();
    }

  },
  editUserInfoCb(res) {
    // 此处一定要将info的值转换为json格式，不能再次序列化
    this.setData({
      'editUserInfoParams.info': JSON.parse(this.data.editUserInfoParams.info)
    })
    if (res.status == 0) {//修改成功
      wx.showToast({
        title: '操作成功',
      });
      var user = res.result.user;
      //设置data数据里面的userInfo、editUserInfoParams.info里面的值
      this.setData({
        userInfo: res.result.user,
        'editUserInfoParams.info.nick_name': user.nick_name,
        'editUserInfoParams.info.sex': user.sex,
        'editUserInfoParams.info.school': user.school,
        'editUserInfoParams.info.grade': user.grade
      })

      //更新缓存里面的数据
      wx.setStorageSync('nick_name', user.nick_name);
      wx.setStorageSync('sex', user.sex);
      wx.setStorageSync('school', user.school);
      wx.setStorageSync('grade', user.grade);
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
    }
  },
  loginOut: function (e) {
    wx.showModal({
      title: '确认退出登录？',
      content: '',
      confirmText: '退出登录',
      success: (res) => {
        if (res.confirm) {
          util.checkNetWorkStatus(this.launchLoginOut);
        }
      }
    })
  },
  launchLoginOut() {
    var token = wx.getStorageSync('token');
    var checksum = token + app.globalData.SALT;
    this.setData({
      'loginOutParams.token': token,
      'loginOutParams.checksum': md5(checksum),
    });
    var url = app.globalData.baseUrl + '/users/logout';
    util.http(url, this.data.loginOutParams, this.loginOutCb);//服务器清除缓存
  },
  loginOutCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '退出成功',
      });
      wx.clearStorage();
      setTimeout(function () {
        wx.redirectTo({
          url: '../login/login'
        })
      }, 1500)
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  }
})