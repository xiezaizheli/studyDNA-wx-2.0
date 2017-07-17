var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    radioItems: [
      { name: '0', value: '学生端', checked: true },
      { name: '1', value: '老师端' }
    ],
    checkboxChecked: true,
    registerBtnProperty: {//注册按钮状态
      loading: false,
      disabled: false
    },
    registerParams: {//注册接口参数
      reg_token: '',
      user_type: '0',
      real_name: '',
      checksum: ''
    },
    getDnaTypeListParams: {//获取DNA类型列表
      token: '',
      checksum: ''
    },
    getSubjectListParams: {//获取课程科目分类列表
      token: '',
      checksum: '',
    },
    getGradeListParams: {//获取课程年级分类列表
      token: '',
      checksum: '',
    },
  },
  // 用户类型切换
  radioTypeChange: function (e) {
    var radioValue = e.detail.value;
    if (radioValue) {
      //给接口的userType参数赋值
      this.setData({
        'registerParams.user_type': radioValue
      })
    }
  },
  // 获得用户真实姓名
  getRealName: function (e) {
    var realNameInput = e.detail.value;
    if (realNameInput) {
      this.setData({
        'registerParams.real_name': realNameInput
      })
    } else {
      this.setData({
        'registerParams.real_name': ''
      })
    }
  },
  // 复选框切换
  checkboxChange: function () {
    this.setData({
      'checkboxChecked': !this.data.checkboxChecked
    });
  },
  // 进入用户协议页面
  toUserAgreement: function () {
    wx.navigateTo({
      url: '../userAgreement/userAgreement',
    })
  },
  // 发起注册接口请求
  registerRequest: function () {
    var registerParams = this.data.registerParams;
    // 客户端检测
    if (!registerParams.real_name) {
      wx.showToast({
        title: '未填写真实姓名',
        icon: 'loading'
      });
    } else if (!this.data.checkboxChecked) {
      wx.showToast({
        title: '未勾选我同意',
        icon: 'loading'
      })
    } else {
      wx.showModal({
        title: '提示',
        content: '真实姓名一旦注册，无法修改，请填写自己的真实姓名',
        cancelText: '重新填写',
        confirmText: '提交',
        success: (res) => {
          // 服务器端检测
          if (res.confirm) {
            util.checkNetWorkStatus(this.launchRegisterRequest);
          }
        }
      })
    }
  },
  // 有网络发起注册接口请求
  launchRegisterRequest() {
    var registerParams = this.data.registerParams;
    var token = wx.getStorageSync('token');
    var checksum = token + registerParams.user_type + registerParams.real_name + app.globalData.SALT;
    this.setData({
      'registerParams.reg_token': token,
      'registerParams.checksum': md5(checksum),
      'registerBtnProperty.loading': true,
      'registerBtnProperty.disabled': true
    });
    var url = app.globalData.baseUrl + '/users/register';
    util.http(url, registerParams, this.registerRequestCb);
  },
  // 注册的回调函数
  registerRequestCb(res) {
    var result = res.result
    if (res.status == 0) {//用户注册成功
      wx.setStorageSync('token', result.token);
      wx.setStorageSync('user_id', result.user.user_id);
      wx.setStorageSync('head', result.user.head);
      wx.setStorageSync('real_name', result.user.real_name);
      wx.setStorageSync('nick_name', result.user.nick_name);
      wx.setStorageSync('user_type', result.user.user_type);
      wx.setStorageSync('school', result.user.school);
      wx.setStorageSync('grade', result.user.grade);
      wx.setStorageSync('sex', result.user.sex);

      // 注册成功之后，从服务器获得DNA类型列表、课程科目列表、课程年级列表，保存在缓存中
      var token = wx.getStorageSync('token');
      var checksum = token + app.globalData.SALT;
      this.setData({
        'getDnaTypeListParams.token': token,
        'getDnaTypeListParams.checksum': md5(checksum),
        'getSubjectListParams.token': token,
        'getSubjectListParams.checksum': md5(checksum),
        'getGradeListParams.token': token,
        'getGradeListParams.checksum': md5(checksum)
      });
      // 发起DNA类型列表接口
      var url = app.globalData.baseUrl + '/dnas/get_dna_type_list';
      util.http(url, this.data.getDnaTypeListParams, this.getDnaTypeListCb);
    } else {
      this.setData({
        'registerBtnProperty.loading': false,
        'registerBtnProperty.disabled': false
      })
      wx.showToast({
        title: res.message,
        icon: 'loading',
        duration: 1000,
      });
    }
  },
  // 获取DNA类型回调函数
  getDnaTypeListCb(res) {
    if (res.status == 0) {
      wx.setStorageSync('dna_type_list', res.result);
      // 发起课程科目列表接口
      var url = app.globalData.baseUrl + '/courses/get_subject_list';
      util.http(url, this.data.getSubjectListParams, this.getSubjectListCb);
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 获取课程科目分类列表回调函数
  getSubjectListCb(res) {
    if (res.status == 0) {
      wx.setStorageSync('course_subject_list', res.result);
      // 发起课程年级列表接口
      var url = app.globalData.baseUrl + '/courses/get_grade_list';
      util.http(url, this.data.getGradeListParams, this.getGradeListCb);
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 获取课程年级分类列表回调函数
  getGradeListCb(res) {
    if (res.status == 0) {
      wx.setStorageSync('course_grade_list', res.result);
      // 跳转login的状态,然后跳转
      this.setData({
        'loginBtnProperty.loading': false,
        'loginBtnProperty.disabled': false,
      })
      wx.switchTab({
        url: '../index/index',
      });
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
})