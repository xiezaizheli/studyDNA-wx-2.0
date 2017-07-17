var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();
var playTimeInterval, interval;

Page({
  data: {
    loadingPage: true,
    courseNames: {
      array: [],
      index: 0
    },
    dnaTypes: {
      array: [],
      index: 0
    },
    modalShow: false,
    modalTextareaShow: false,
    pageOverflow: false,
    localImages: {//本地图片处理
      originalImages: [], //原有图片
      newImages: [],      //新增图片
      totalImages: [],    //所有图片
      uploadImages: []    //上传图片
    },
    localVoices: {//本地语音处理
      originalTempFilePath: '',
      originalFile: []
    },
    editDnaBtnProperty: {
      loading: false,
      disabled: false
    },
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
      filter: { 'join_status': 0 },
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
    editDnaParams: {//修改DNA接口信息
      token: '',
      'dna_id': '',
      'course_id': '',
      'dna_type_id': '',
      'dna_name': '',
      images: [],
      voices: [],
      checksum: ''
    },
  },
  onLoad: function (options) {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 从接口获取DNA课程信息
      util.checkNetWorkStatus(this.getCourseList);
      // 从缓存中获取DNA类型信息
      var dnaTypes = wx.getStorageSync('dna_type_list');
      var dna_type_id = wx.getStorageSync('dna_type_id');
      this.setData({
        'dnaTypes.array': dnaTypes
      });
      for (let i = 0; i < dnaTypes.length; i++) {
        if (dnaTypes[i].id === dna_type_id) {
          this.setData({
            'dnaTypes.index': i
          })
        }
      }

      // 设置图片为缓存的内容
      var dna_images = wx.getStorageSync('dna_images');
      var originalImages = [];
      for (let i = 0; i < dna_images.length; i++) {
        originalImages.push(dna_images[i].file_path);
      }
      this.setData({
        'localImages.totalImages': originalImages
      })

      // 判断是否存在语音问题
      var voices = wx.getStorageSync('dna_voices');
      if (voices.length == 0) {
        this.setData({
          'audioproperty.hasRecord': false,
          'audioproperty.tempFilePath': ''
        })
      } else {
        var voiceFile = voices[0].file_path.split('/');
        var originalFile = this.data.localVoices.originalFile;
        originalFile.push(voiceFile[voiceFile.length - 1]);
        this.setData({
          'audioproperty.hasRecord': true,
          'localVoices.originalFile': originalFile
        })
        wx.downloadFile({
          url: voices[0].file_path,
          success: (res) => {
            this.setData({
              'audioproperty.tempFilePath': res.tempFilePath,
              'localVoices.originalTempFilePath': res.tempFilePath
            });
          },
          fail: (res) => {
            console.log(res);
          }
        })
      }

      // 设置修改DNA接口参数
      this.setData({
        'editDnaParams.token': wx.getStorageSync('token'),
        'editDnaParams.dna_id': wx.getStorageSync('dna_id'),
        'editDnaParams.course_id': wx.getStorageSync('course_id'),
        'editDnaParams.dna_type_id': wx.getStorageSync('dna_type_id'),
        'editDnaParams.dna_name': wx.getStorageSync('dna_name'),
      })
    }
  },
  // 从接口获取课程信息
  getCourseList() {
    if (wx.showLoading) wx.showLoading({ title: '正在加载中...' })
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
  // 从接口获取课程信息回调函数
  getCourseListCb(res) {
    if (res.status == 0) {
      //读取列表成功，设置courses列表的当前显示项
      var courses = res.result.courses;
      var length = courses.length;
      var courseInfos = [];
      var course_id = wx.getStorageSync('course_id');
      for (var i = 0; i < length; i++) {
        courseInfos.push(courses[i].course_info);
        if (courses[i].course_id === course_id) {
          this.setData({
            'courseNames.index': i
          })
        }
      }
      this.setData({
        'courseNames.array': courseInfos
      });
      // 判断是否有课程，进行页面跳转
      if (length == 0) {
        wx.showModal({
          title: '提示',
          content: '你还未添加任何课程，先去加入课程！',
          showCancel: false,
          confirmText: '确定',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: '../manageCourse/manageCourse' });
            }
          }
        })
      }
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
    this.setData({
      'loadingPage': false
    })
    if (wx.hideLoading) {
      wx.hideLoading();
    }
  },
  // 选择课程下拉弹框
  pickerDnaNamesChange: function (e) {
    var course_id = this.data.courseNames.array[e.detail.value].course_id;
    this.setData({
      'courseNames.index': e.detail.value,
      'editDnaParams.course_id': course_id
    })
  },
  // 选择DNA类型下拉弹框
  pickerdnaTypesChange: function (e) {
    var dna_type_id = this.data.dnaTypes.array[e.detail.value].id;
    this.setData({
      'dnaTypes.index': e.detail.value,
      'editDnaParams.dna_type_id': dna_type_id
    })
  },
  // 弹出文本编辑模态框
  showTextarea: function () {
    this.setData({
      'modalShow': true,
      'modalTextareaShow': true,
      'pageOverflow': true
    })
  },
  // 获取DNA标题
  getDnaTitle: function (e) {
    this.setData({
      'editDnaParams.dna_name': e.detail.value
    })
  },
  // 取消模态框
  cancelModal: function () {
    this.setData({
      'modalShow': false,
      'audioproperty.modalRecordShow': false,
      'modalTextareaShow': false,
      'pageOverflow': false
    })
  },
  // 添加图片
  addImg: function (e) {
    var localImages = this.data.localImages;
    var count = 6 - localImages.totalImages.length
    count = count > 0 ? count : 0;
    if (count > 0) {
      wx.chooseImage({
        count: count,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({
            'localImages.totalImages': localImages.totalImages.concat(res.tempFilePaths)
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
  // 根据touch时间判断是删除图片还是预览图片
  previewDeleteImg: function (e) {
    let that = this;
    var touchTime = this.data.touchend - this.data.touchstart;
    if (touchTime > 350) {
      this.deleteImg(e);
    } else {
      this.previewImg(e)
    }
  },
  // 预览图片
  previewImg: function (e) {
    var src = e.currentTarget.dataset.src;
    var imgList = this.data.localImages.totalImages;
    wx.previewImage({
      current: src,
      urls: imgList
    })
  },
  // 删除图片
  deleteImg: function (e) {
    var index = e.currentTarget.dataset.index;
    var totalImages = this.data.localImages.totalImages;
    wx.showModal({
      title: '删除图片',
      success: (res) => {
        if (res.confirm) {
          var deleteImg = totalImages.splice(index, 1);
          this.setData({
            'localImages.totalImages': util.remove(totalImages, deleteImg)
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
  // 弹出语音模态框
  showRecordModal: function () {
    this.setData({
      'modalShow': true,
      'audioproperty.modalRecordShow': true,
      'pageOverflow': true
    })
  },
  // 开始录音
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
  // 结束录音
  stopRecord: function () {
    wx.stopRecord();
    this.setData({
      'audioproperty.recording': false,
      'audioproperty.recordTime': 0,
    });
    clearInterval(interval);
  },
  // 播放录音
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
  // 暂停录音
  pauseVoice: function () {
    wx.pauseVoice();
    this.setData({ 'audioproperty.playing': false })
  },
  // 停止录音
  stopVoice: function () {
    this.setData({
      'audioproperty.playing': false,
    })
    wx.stopVoice();
  },
  // 清除录音数据
  clearRecord: function () {
    this.data.audioproperty.recordTime = 0
    this.data.audioproperty.playTime = 0
    this.stopVoice();
    this.pauseVoice();
    this.setData({
      'audioproperty.hasRecord': false,
      'audioproperty.tempFilePath': '',
      'audioproperty.modalRecordShow': false,
      'modalShow': false,
      'pageOverflow': false
    })
  },
  // 发起接口请求
  launchRequest: function (e) {
    //客服端验证:课程，DNA类型,DNA标题，DNA图片
    var editDnaParams = this.data.editDnaParams;
    if (editDnaParams.course_id == '') {
      wx.showToast({
        title: '未选择课程',
        icon: 'loading'
      })
    } else if (editDnaParams.dna_type_id == '') {
      wx.showToast({
        title: '未选择DNA类型',
        icon: 'loading'
      })
    } else if (editDnaParams.dna_name == '') {
      wx.showToast({
        title: '未填写DNA标题',
        icon: 'loading'
      })
    } else if (this.data.localImages.totalImages.length == 0 && editDnaParams.images.length == 0) {
      wx.showToast({
        title: '未上传DNA图片',
        icon: 'loading'
      })
    } else {
      var localImages = this.data.localImages;
      //剔除uploadFile中的已上传文件，只保留本地文件微信本地路径的文件
      var uploadImages = [];
      var originalImages = [];
      for (var i = 0; i < localImages.totalImages.length; i++) {
        if (localImages.totalImages[i].indexOf('wxfile') != -1) {
          uploadImages.push(localImages.totalImages[i]);
        } else {
          var originFileNames = localImages.totalImages[i].split('/');
          originalImages.push(originFileNames[originFileNames.length - 1]);
        }
      }
      this.setData({
        'localImages.uploadImages': uploadImages,
        'localImages.originalImages': originalImages,
        'editDnaParams.images': originalImages
      })
      var sessionImages = wx.getStorageSync('dna_images');
      // 根据网络状态，改变btn的状态
      wx.getNetworkType({
        success: (res) => {
          var networkType = res.networkType // 返回网络类型2g，3g，4g，wifi, none, unknown
          if (networkType == "none" || networkType == "unknown") {
            //没有网络连接
            wx.showToast({
              title: '网络异常，请稍后重试',
              icon: 'loading'
            })
          } else {
            wx.showToast({
              title: '正在提交',
            })
            // 修改newDnaBtnProperty的状态
            this.setData({
              'editDnaBtnProperty.loading': true,
              'editDnaBtnProperty.disabled': true
            })
          }
        }
      })
      //无图片上传
      if (localImages.uploadImages.length == 0) {
        if (this.data.audioproperty.tempFilePath != '') {
          // 有语音，发起语音接口
          util.checkNetWorkStatus(this.voiceRequest);
        } else {
          // 无语音，直接发起新增DNA接口
          util.checkNetWorkStatus(this.editDnaRequest);
        }
      } else {
        util.checkNetWorkStatus(this.imgRequest);
      }
    }
  },
  imgRequest() {
    var token = wx.getStorageSync('token');
    var checksum = token + this.data.uploadImgParams.file_type + app.globalData.SALT;
    this.setData({
      'uploadImgParams.token': token,
      'uploadImgParams.checksum': md5(checksum),
    })
    var url = app.globalData.baseUrl + '/dnas/upload_dna_file_wexin';
    util.uploadFile(url, this.data.localImages.uploadImages, this.data.uploadImgParams, this.imgCallBack);
  },
  imgCallBack(res) {
    var editDnaParams = this.data.editDnaParams;
    var localImages = this.data.localImages;
    if (res.status == 0) {//上传成功
      this.setData({
        'editDnaParams.images': editDnaParams.images.concat(res.result.file_name)
      });
      //当缓存图片都上传成功之后
      if (editDnaParams.images.length == localImages.totalImages.length) {
        // 1.有语音，发起语音接口
        if (this.data.audioproperty.tempFilePath != '') {
          util.checkNetWorkStatus(this.voiceRequest);
        } else {
          // 2.无语音，直接发起新增DNA接口
          util.checkNetWorkStatus(this.editDnaRequest);
        }
      }
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'editDnaBtnProperty.loading': false,
        'editDnaBtnProperty.disabled': false,
        'editDnaParams.images': this.data.localImages.originalImages,
        'editDnaParams.voices': this.data.localVoices.originalVoices,
      });
    }
  },
  voiceRequest() {
    var voiceTemp = this.data.audioproperty.tempFilePath;
    var originalTemp = this.data.localVoices.originalTempFilePath;
    //语音已更改
    if (voiceTemp != originalTemp) {
      var token = wx.getStorageSync('token');
      var voiceChecksum = token + this.data.uploadRecordParams.file_type + app.globalData.SALT;
      this.setData({
        'uploadRecordParams.token': token,
        'uploadRecordParams.checksum': md5(voiceChecksum)
      });
      var arr = [this.data.audioproperty.tempFilePath];
      var url = app.globalData.baseUrl + '/dnas/upload_dna_file_wexin';
      util.uploadFile(url, arr, this.data.uploadRecordParams, this.voiceCallBack);
    } else {
      //语音未更改
      this.setData({
        'editDnaParams.voices': this.data.localVoices.originalFile
      })
      util.checkNetWorkStatus(this.editDnaRequest);
    }
  },
  voiceCallBack(res) {
    if (res.status == 0) {//上传成功
      this.setData({
        'editDnaParams.voices': this.data.editDnaParams.voices.concat(res.result.file_name)
      });
      //发起新增DNA接口回调
      util.checkNetWorkStatus(this.editDnaRequest);
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'editDnaBtnProperty.loading': false,
        'editDnaBtnProperty.disabled': false,
        'editDnaParams.images': this.data.localImages.originalImages,
        'editDnaParams.voices': this.data.localVoices.originalVoices,
      });
    }
  },
  editDnaRequest() {
    var editDnaParams = this.data.editDnaParams;
    var images = JSON.stringify(editDnaParams.images);
    var voices = JSON.stringify(editDnaParams.voices);
    var checksum = editDnaParams.token + editDnaParams.dna_id + editDnaParams.course_id + editDnaParams.dna_type_id + editDnaParams.dna_name + images + voices + app.globalData.SALT;
    this.setData({
      'editDnaParams.images': images,
      'editDnaParams.voices': voices,
      'editDnaParams.checksum': md5(checksum)
    })
    var url = app.globalData.baseUrl + '/dnas/change_course_dna';
    util.http(url, editDnaParams, this.editDnaCb);
  },
  editDnaCb(res) {
    if (res.status == 0) {//修改成功
      wx.showToast({
        title: res.message,
      })
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
        'editDnaBtnProperty.loading': false,
        'editDnaBtnProperty.disabled': false,
        'editDnaParams.images': this.data.localImages.originalImages,
        'editDnaParams.voices': this.data.localVoices.originalVoices,
      });
    }
  }
})