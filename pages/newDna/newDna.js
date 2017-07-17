var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();
var playTimeInterval, interval;

Page({
  data: {
    courseNames: {
      array: [],
      dropdown: false,
    },
    dnaTypes: {
      array: [],
      dropdown: false,
    },
    newDnaBtnProperty: {
      disabled: false,
      loading: false
    },
    imagesStorage: [],//上传图片本地信息
    imagesStorageTotal: [],
    voicesStorageTotal: [],
    modalShow: false,
    modalTextareaShow: false,
    pageOverflow: false,
    audioproperty: {
      recording: false,
      playing: false,
      hasRecord: false,
      recordTime: 0,
      playTime: 0,
      isSpeaking: false,
      modalRecordShow: false,
      tempFilePath: '',
      httpTem: false
    },
    getCourseListParams: {//获取学生参加的课程列表接口信息
      token: '',
      filter: {'join_status':0},
      last_id: '',
      checksum: ''
    },
    uploadImgParams: {//上传图片接口
      token: '',
      'file_type': 0,
      checksum: ''
    },
    uploadRecordParams: {//上传录音接口
      token: '',
      'file_type': 1,
      checksum: ''
    },
    newDnaParams: {//新增DNA接口信息
      token: '',
      'course_id': '',
      'dna_type_id': '',
      'dna_name': '',
      images: [],
      voices: [],
      checksum: ''
    },
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 判断网络请求，获取接口信息
      util.checkNetWorkStatus(this.getCourseList);
      // 从缓存中获取dna类别信息 
      this.setData({
        'dnaTypes.array': wx.getStorageSync('dna_type_list')
      });
    }
  },
  // 获取课程列表
  getCourseList() {
    var token = wx.getStorageSync('token');
    var getCourseListParams = this.data.getCourseListParams
    var filter = JSON.stringify(getCourseListParams.filter)
    var checksum = token + filter + getCourseListParams.last_id + app.globalData.SALT;
    this.setData({
      'getCourseListParams.token': token,
      'getCourseListParams.filter': filter,
      'getCourseListParams.last_id': '',
      'getCourseListParams.checksum': md5(checksum)
    })

    var url = app.globalData.baseUrl + '/courses/get_course_list_by_student';
    util.http(url, getCourseListParams, this.getCourseListCb);
  },
  // 获取课程列表回调函数
  getCourseListCb(res) {
    if (res.status == 0) {//读取列表成功
      var courses = res.result.courses;
      var length = courses.length;
      var courseInfos = [];
      for (var i = 0; i < length; i++) {
        courseInfos.push(courses[i].course_info);
      }
      this.setData({
        'courseNames.array': courseInfos
      });
      if (length == 0) {
        wx.showModal({
          title: '提示',
          content: '你还未添加任何课程，先去加入课程，才能进行新增DNA！',
          showCancel: false,
          confirmText: '确定',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: '../manageCourse/manageCourse' });
            }
          }
        })
      }
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
      })
    }
  },
  //选择学级下拉菜单
  pickerDnaNamesChange: function (e) {
    var course_id = this.data.courseNames.array[e.detail.value].course_id;
    this.setData({
      'courseNames.index': e.detail.value,
      'courseNames.dropdown': true,
      'newDnaParams.course_id': course_id
    })
  },
  //选择Dna类型下拉菜单
  pickerdnaTypesChange: function (e) {
    var dna_type_id = this.data.dnaTypes.array[e.detail.value].id;
    this.setData({
      'dnaTypes.index': e.detail.value,
      'dnaTypes.dropdown': true,
      'newDnaParams.dna_type_id': dna_type_id
    })
  },
  //弹出多行文本模态框
  showTextarea: function () {
    this.setData({
      'modalShow': true,
      'modalTextareaShow': true,
      'pageOverflow': true
    })
  },
  //dna标题的内容
  getDnaTitle: function (e) {
    this.setData({
      'newDnaParams.dna_name': e.detail.value
    })
  },
  //添加图片，最多8张
  addImg: function (e) {
    var count = 6 - this.data.imagesStorage.length;
    count = count > 0 ? count : 0;
    if (count > 0) {
      wx.chooseImage({
        count: count,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({
            'imagesStorage': this.data.imagesStorage.concat(res.tempFilePaths)
          })
        }
      })
    } else {
      wx.showToast({
        title: 'DNA照片最多可选择6张',
        icon: 'loading'
      })
    }
  },
  //根据touch的时间判断是删除图片还是预览图片
  previewDeleteImg: function (e) {
    let that = this;
    var touchTime = this.data.touchend - this.data.touchstart;
    if (touchTime > 350) {
      this.deleteImg(e);
    } else {
      this.previewImg(e)
    }
  },
  //预览图片
  previewImg: function (e) {
    var src = e.currentTarget.dataset.src;
    var imgList = this.data.imagesStorage
    wx.previewImage({
      current: src,
      urls: imgList
    })
  },
  //删除图片
  deleteImg: function (e) {
    var index = e.currentTarget.dataset.index;
    var imagesStorage = this.data.imagesStorage;
    var deleteImg = imagesStorage.splice(index, 1);
    wx.showModal({
      title: '删除图片',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'imagesStorage': util.remove(imagesStorage, deleteImg)
          })
        }
      }
    })
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
  //弹出语音模态框
  showRecordModal: function () {
    this.setData({
      'modalShow': true,
      'audioproperty.modalRecordShow': true,
      'pageOverflow': true
    })
  },
  //取消模态框
  cancelModal: function () {
    this.setData({
      'modalShow': false,
      'audioproperty.modalRecordShow': false,
      'modalTextareaShow': false,
      'pageOverflow': false
    })
  },
  //开始录音
  startRecord: function () {
    this.setData({ 'audioproperty.recording': true });
    var that = this;
    var num = 0;
    interval = setInterval(function () {
      num++;
      that.setData({
        'audioproperty.recordTime': num + 'S'
      })
      if (num == 60) {
        clearInterval(interval);
      }
    }, 1000);
    wx.startRecord({
      success: (res) => {
        that.setData({
          'audioproperty.hasRecord': true,
          'audioproperty.tempFilePath': res.tempFilePath,
        })
      },
      complete: (res) => {
        that.setData({ 'audioproperty.recording': false });
        clearInterval(interval);
      }
    })
  },
  //结束录音
  stopRecord: function () {
    wx.stopRecord();
    this.setData({
      'audioproperty.recording': false,
      'audioproperty.recordTime': 0,
    });
    clearInterval(interval);
  },
  //播放录音
  playVoice: function () {
    this.setData({
      'audioproperty.playing': true,
    })
    wx.playVoice({
      filePath: this.data.audioproperty.tempFilePath,
      success: (res) => {
        this.setData({
          'audioproperty.playing': false
        })
      }
    })
  },
  //暂停录音
  pauseVoice: function () {
    wx.pauseVoice();
    this.setData({ 'audioproperty.playing': false })
  },
  //停止录音
  stopVoice: function () {
    this.setData({
      'audioproperty.playing': false,
    })
    wx.stopVoice();
  },
  //清除数据
  clearRecord: function () {
    this.data.audioproperty.recordTime = 0
    this.data.audioproperty.playTime = 0
    this.stopVoice();
    this.pauseVoice();
    this.setData({
      'audioproperty.hasRecord': false,
      'newDnaParams.record': '',
      'audioproperty.tempFilePath': '',
      'audioproperty.modalRecordShow': false,
      'modalShow': false,
      'pageOverflow': false
    })
  },
  //点击按钮发起接口请求
  launchRequest: function (e) {
    //客服端验证:课程，DNA类型,DNA标题，DNA图片
    var newDnaParams = this.data.newDnaParams;
    if (newDnaParams.course_id == '') {
      wx.showToast({
        title: '未选择课程',
        icon: 'loading'
      })
    } else if (newDnaParams.dna_type_id == '') {
      wx.showToast({
        title: '未选择DNA类型',
        icon: 'loading'
      })
    } else if (newDnaParams.dna_name == '') {
      wx.showToast({
        title: '未填写DNA标题',
        icon: 'loading'
      })
    } else if (this.data.imagesStorage.length == 0 && newDnaParams.images.length == 0) {
      wx.showToast({
        title: '未上传DNA图片',
        icon: 'loading'
      })
    } else {
      util.checkNetWorkStatus(this.imgRequest);
      // 发起图片接口上传请求--串行上传
    }
  },
  // 上传图片
  imgRequest() {
    wx.showToast({
      title: '正在提交',
    })
    // 修改newDnaBtnProperty的状态
    this.setData({
      'newDnaBtnProperty.loading': true,
      'newDnaBtnProperty.disabled': true
    })

    var token = wx.getStorageSync('token');
    var checksum = token + this.data.uploadImgParams.file_type + app.globalData.SALT;
    this.setData({
      'uploadImgParams.token': token,
      'uploadImgParams.checksum': md5(checksum),
      'imagesStorageTotal': this.data.imagesStorage
    })
    var url = app.globalData.baseUrl + '/dnas/upload_dna_file_wexin';
    util.uploadFile(url, this.data.imagesStorage, this.data.uploadImgParams, this.imgCallBack);
  },
  // 发起图片接口回调函数
  imgCallBack(res) {
    if (res.status == 0) {//上传成功
      this.setData({
        'newDnaParams.images': this.data.newDnaParams.images.concat(res.result.file_name)
      });
      //当缓存图片都上传成功之后
      if (this.data.newDnaParams.images.length == this.data.imagesStorageTotal.length) {
        // 1.有语音，发起语音接口
        if (this.data.audioproperty.tempFilePath != '') {
          util.checkNetWorkStatus(this.voiceRequest);
        } else {
          // 2.无语音，直接发起新增DNA接口
          util.checkNetWorkStatus(this.newDnaRequest);
        }
      }
    } else {
      wx.showToast({
        title: res.message
      })
      this.setData({
        'newDnaBtnProperty.loading': false,
        'newDnaBtnProperty.disabled': false,
        'imagesStorage': this.data.imagesStorageTotal,
        'newDnaParams.images': [],
        'newDnaParams.voices': [],
      });
    }
  },
  // 发起语音接口
  voiceRequest() {
    var token = wx.getStorageSync('token');
    var voiceChecksum = token + this.data.uploadRecordParams.file_type + app.globalData.SALT;
    this.setData({
      'uploadRecordParams.token': token,
      'uploadRecordParams.checksum': md5(voiceChecksum)
    });
    var arr = [].concat(this.data.audioproperty.tempFilePath);
    var url = app.globalData.baseUrl + '/dnas/upload_dna_file_wexin';
    util.uploadFile(url, arr, this.data.uploadRecordParams, this.voiceCallBack);
  },
  //发起语音接口回调函数
  voiceCallBack(res) {
    if (res.status == 0) {//上传成功
      this.setData({
        'newDnaParams.voices': this.data.newDnaParams.voices.concat(res.result.file_name)
      });
      //发起新增DNA接口回调
      util.checkNetWorkStatus(this.newDnaRequest);
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'newDnaBtnProperty.loading': false,
        'newDnaBtnProperty.disabled': false,
        'newDnaParams.images': [],
        'newDnaParams.voices': [],
        'imagesStorage': this.data.imagesStorageTotal
      });
    }
  },
  // 新增DNA函数
  newDnaRequest() {
    var newDnaParams = this.data.newDnaParams;
    var url = app.globalData.baseUrl + '/dnas/add_course_dna';
    var token = wx.getStorageSync('token');
    var images = JSON.stringify(newDnaParams.images);
    var voices = JSON.stringify(newDnaParams.voices);
    var checksum = token + newDnaParams.course_id + newDnaParams.dna_type_id + newDnaParams.dna_name + images + voices + app.globalData.SALT;
    this.setData({
      'newDnaParams.token': token,
      'newDnaParams.images': images,
      'newDnaParams.voices': voices,
      'newDnaParams.checksum': md5(checksum)
    })
    util.http(url, newDnaParams, this.newDnaCb);
  },
  // 新增DNA回调函数
  newDnaCb(res) {
    if (res.status == 0) {//新增成功
      wx.showToast({
        title: res.message,
      })
      //为了修改数据之后，将新增成功的DNA数据写入DNA列表页面而不刷新页面
      var pages = getCurrentPages();
      var currPage = pages[pages.length - 1];//当前页面
      var prevPage = pages[pages.length - 2];//上一个页面
      prevPage.setData({
        'dnaList': [],
        'isEmpty': true,
        'loadingMore': false,
        'noMore': false,
        'noSelectDna': false,
        'getDnaListByStudentParams.last_id': 0,
        'getDnaListByStudentParams.filter': {}
      })
      prevPage.getDnaListByStudent();
      setTimeout(function () {
        wx.navigateBack();
      }, 1000)
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
      this.setData({
        'newDnaBtnProperty.loading': false,
        'newDnaBtnProperty.disabled': false,
        'newDnaParams.images': [],
        'newDnaParams.voices': [],
        'imagesStorage': this.data.imagesStorageTotal
      });
    }
  }
})