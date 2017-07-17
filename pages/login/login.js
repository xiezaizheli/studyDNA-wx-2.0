var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    getCodeBtnProperty: {//输入验证码按钮状态
      sending: false,// 是否正在发送验证码
      disabled: true,
      title: '获取验证码',
    },
    loginBtnProperty: {//登录按钮状态
      loading: false,
      disabled: false,
    },
    getCodeParams: {//获取验证码接口参数
      token: 'T',
      mobile: '',
      checksum: '',
    },
    loginParams: {//登录接口参数
      mobile: '',
      checkcode: '',
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
      checksum: ''
    },
    wxLoginParams:{//微信登录的接口参数
      code:'',
      encryptedData:'',
      iv:''
    }
  },
  // 获得手机号码
  getMobile: function (e) {
    var mobileValue = e.detail.value;
    var getCodeBtnProperty = this.data.getCodeBtnProperty;
    if (mobileValue.length == 11) {
      //给接口的mobile参数赋值
      this.setData({
        'loginParams.mobile': mobileValue,
        'getCodeParams.mobile': mobileValue,
      })
      //判断是否正在发送，改变验证码的状态
      if (getCodeBtnProperty.sending) {
        this.setData({
          'getCodeBtnProperty.disabled': true
        })
      } else {
        this.setData({
          'getCodeBtnProperty.disabled': false
        })
      }
    } else {
      //给接口的mobile参数赋值
      this.setData({
        'loginParams.mobile': '',
        'getCodeParams.mobile': '',
        'getCodeBtnProperty.disabled': true
      })
    }
  },
  // 获取验证码
  getCodeRequest: function (e) {
    util.checkNetWorkStatus(this.launchGetCodeRequest);
  },
  // 有网络情况获取验证码
  launchGetCodeRequest() {
    // 给倒计时一个数据，防止倒计时异步有时间差
    this.setData({
      'getCodeBtnProperty.sending': true,
      'getCodeBtnProperty.disabled': true,
      'getCodeBtnProperty.title': '已发送60S'
    });
    // 启动定时器，改变输入验证码状态
    var that = this;
    var num = 60;
    var timer = setInterval(function () {
      num--;
      that.setData({
        'getCodeBtnProperty.title': '已发送' + num + 'S',
        'getCodeBtnProperty.sending': true,
        'getCodeBtnProperty.disabled': true,
      });
      if (num == 0) {
        that.setData({
          'getCodeBtnProperty.title': '重新获取',
          'getCodeBtnProperty.sending': false,
          'getCodeBtnProperty.disabled': false,
        })
        clearInterval(timer);
      }
    }, 1100);
    // 发起接口请求
    var getCodeParams = this.data.getCodeParams;
    var checksum = getCodeParams.token + getCodeParams.mobile + app.globalData.SALT;
    this.setData({
      'getCodeParams.checksum': md5(checksum),
    });
    var url = app.globalData.baseUrl + '/users/get_checkcode';
    util.http(url, getCodeParams, this.getCodeCb);
  },
  // 获取验证码回调函数
  getCodeCb(res) {
    if (res.status != 0) {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 输入验证码
  codeValidate: function (e) {
    var codeValue = e.detail.value;
    var length = codeValue.length;
    if (length == 4) {
      this.setData({
        'loginParams.checkcode': codeValue
      })
    } else {
      this.setData({
        'loginParams.checkcode': ''
      })
    }
  },
  // 发起登录请求
  loginRequest: function () {
    var loginParams = this.data.loginParams;
    // 客户端验证
    if (loginParams.mobile.length != 11) {
      wx.showToast({
        title: '手机号不合法',
        icon: 'loading'
      })
    } else if (loginParams.checkcode == '') {
      wx.showToast({
        title: '验证码格式错误',
        icon: 'loading'
      })
    } else {
      util.checkNetWorkStatus(this.launchLoginRequest);
    }
  },
  // 有网络的情况发起登录请求
  launchLoginRequest() {
    // 服务器端验证
    var loginParams = this.data.loginParams;
    var checksum = loginParams.mobile + loginParams.checkcode + app.globalData.SALT;
    this.setData({
      'loginParams.checksum': md5(checksum),
      'loginBtnProperty.loading': true,
      'loginBtnProperty.disabled': true,
    });
    var url = app.globalData.baseUrl + '/users/login';
    util.http(url, loginParams, this.loginRequestCb);
  },
  // 登录的回调函数
  loginRequestCb(res) {
    var result = res.result;
    if (res.status == -5) {//用户未注册，跳转到注册页面
      wx.setStorageSync('token', result.token);//注册的token信息
      wx.showModal({
        title: '提示',
        content: '还未注册，请完善注册信息',
        showCancel: false,
        success: (res) => {
          if(res.confirm){
            this.setData({
              'loginBtnProperty.loading': false,
              'loginBtnProperty.disabled': false,
            });
            wx.redirectTo({
              url: '../mobileRegister/mobileRegister'
            })
          }
        }
      })

    } else if (res.status == 0) {//用户已注册，跳转到DNA列表主页页面
      wx.showToast({
        title: '正在登录',
        icon: 'loading'
      })
      wx.setStorageSync('token', result.token); //保存token信息
      wx.setStorageSync('user_id', result.user.user_id);
      wx.setStorageSync('real_name', result.user.real_name);
      wx.setStorageSync('head', result.user.head);
      wx.setStorageSync('nick_name', result.user.nick_name);
      wx.setStorageSync('user_type', result.user.user_type);
      wx.setStorageSync('school', result.user.school);
      wx.setStorageSync('grade', result.user.grade);
      wx.setStorageSync('sex', result.user.sex);

      // 登录成功之后，从服务器获得DNA类型列表、课程科目列表、课程年级列表，保存在缓存中
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
    } else if (res.status == -4) {//验证码错误，弹模态框
      this.setData({
        'loginBtnProperty.loading': false,
        'loginBtnProperty.disabled': false,
      })
      wx.showModal({
        title: '提示',
        content: '验证码错误，请重新填写',
        showCancel: false
      });
    } else {//其他未登录成功的情况
      this.setData({
        'loginBtnProperty.loading': false,
        'loginBtnProperty.disabled': false,
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
      wx.switchTab({
        url: '../index/index',
      });
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'loginBtnProperty.loading': false,
        'loginBtnProperty.disabled': false,
      })
    }
  },
  // 检查微信登录
  wxLogin(){
    wx.login({
      success: (res) => {
        if (res.code) {
         this.setData({
           'wxLoginParams.code':res.code
         })
        }
        wx.getUserInfo({
          withCredentials: true,
          success: (res) => {
            this.setData({
              'wxLoginParams.encryptedData': encodeURIComponent(res.encryptedData),
              'wxLoginParams.iv':res.iv
            });
            // 使用code换取3rdSessionId
            var url ='';
            util.http(url,this.data.wxLoginParams.code,this.getSessionId)
          },
          fail: (res) => {
            console.log(res);
          }
        })
      }
    })
  },
  // 获取3rd_session,并写入缓存
  getSessionId(res){
    console.log(res);
    wx.setStorageSync('3rd_session',res.result);
    // 检查登录态，失效重新登录
    wx.checkSession({
      fail:(res)=>{
        this.wxLogin();
      }
    })
  },
  // 发起解密请求
  encryptedData(){
    var url ='';
    util.http(url, this.data.wxLoginParams, this.encryptedDataCb);
  },
  encryptedDataCb(res){
    console.log(res);
  }
})