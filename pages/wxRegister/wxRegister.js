Page({
  data:{
    radioItems: [
      { name: '0', value: '学生端', checked: true },
      { name: '1', value: '老师端' }
    ],
    checkboxChecked: true,
    getCodeBtnProperty: {
      sending: false,
      disabled: true,
      title: '获取验证码',
    },
    registerBtnProperty: {//注册按钮状态
      loading: false,
      disabled: false
    },
    getCodeParams: {//获取验证码接口参数
      token: 'T',
      mobile: '',
      checksum: '',
    },
    registerParams: {//注册接口参数
      reg_token: '',
      user_type: '0',
      real_name: '',
      checksum: ''
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
  registerRequest:function(){
    wx.switchTab({
      url: '../index/index',
    })
  }
})