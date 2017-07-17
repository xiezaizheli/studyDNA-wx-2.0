var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();
var playTimeInterval, interval;

Page({
  data: {
    imagesStorage: [],
    imagesStorageTotal: [],
    modalProperty: {//模态框
      commentDetailModal: false,
      pageModal: false,
      pageOverflow: false
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
    newDnaBtnProperty: {
      loading: false,
      disabled: false
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
    addDnaCommentParams: {//新增DNA批改接口参数
      token: '',
      dna_id: '',
      comment_brief: '',
      comment_detail: '',
      images: [],
      voices: [],
      checksum: ''
    },
  },
  onLoad: function (options) {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      //设置新增DNA批改的token和dna_id
      var dnaId = options.dnaId;
      this.setData({
        'addDnaCommentParams.dna_id': dnaId,
        'addDnaCommentParams.token': wx.getStorageSync('token')
      });
    }
  },
  // 获得批改概要内容
  getCommentBrief: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'addDnaCommentParams.comment_brief': val
      })
    } else {
      this.setData({
        'addDnaCommentParams.comment_brief': ''
      })
    }
  },
  // 弹出批改详情模态框
  showCommentDetailModal: function (e) {
    this.setData({
      'modalProperty.pageModal': true,
      'modalProperty.commentDetailModal': true,
      'modalProperty.pageOverflow': true
    })
  },
  // 取消模态框
  cancelModal: function (e) {
    this.setData({
      'modalProperty.pageModal': false,
      'modalProperty.commentDetailModal': false,
      'audioproperty.modalRecordShow': false,
      'modalProperty.pageOverflow': false
    })
  },
  // 获得批改详情内容
  getCommentDetail: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'addDnaCommentParams.comment_detail': val
      })
    } else {
      this.setData({
        'addDnaCommentParams.comment_detail': ''
      })
    }
  },
  // 添加图片
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
  // 根据touch时间判断是预览图片还是删除图片
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
    var imgList = this.data.imagesStorage
    wx.previewImage({
      current: src,
      urls: imgList
    })
  },
  // 删除图片
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
  // 弹出语音模态框
  showRecordModal: function () {
    this.setData({
      'modalProperty.pageModal': true,
      'modalProperty.pageOverflow': true,
      'audioproperty.modalRecordShow': true
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
  // 停止录音
  stopRecord: function () {
    wx.stopRecord();
    this.setData({
      'audioproperty.recording': false,
      'audioproperty.recordTime': 0,
    });
    clearInterval(interval);
  },
  // 开始播放
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
  // 暂停播放
  pauseVoice: function () {
    wx.pauseVoice();
    this.setData({ 'audioproperty.playing': false })
  },
  // 停止播放
  stopVoice: function () {
    this.setData({
      'audioproperty.playing': false,
    })
    wx.stopVoice();
  },
  // 清除语音数据
  clearRecord: function () {
    this.data.audioproperty.recordTime = 0
    this.data.audioproperty.playTime = 0
    this.setData({
      'audioproperty.hasRecord': false,
      'editDnaParams.record': '',
      'audioproperty.tempFilePath': '',
      'audioproperty.modalRecordShow': false,
      'modalProperty.pageModal': false,
      'modalProperty.pageOverflow': false
    })
  },
  // 发起接口请求
  launchRequest: function (e) {
    //客服端验证:批改概要，批改详情，DNA图片
    var addDnaCommentParams = this.data.addDnaCommentParams;
    if (addDnaCommentParams.comment_brief == '') {
      wx.showToast({
        title: '未填写批改概要',
        icon: 'loading'
      })
    } else if (addDnaCommentParams.comment_detail == '') {
      wx.showToast({
        title: '未填写批改详情',
        icon: 'loading'
      })
    } else if (this.data.imagesStorage.length == 0 && addDnaCommentParams.images.length == 0) {
      wx.showToast({
        title: '未上传DNA图片',
        icon: 'loading'
      })
    } else {
      // 发起图片接口上传请求--串行上传
      util.checkNetWorkStatus(this.imgRequest);
    }
  },
  // 发起图片请求
  imgRequest() {
    // 修改newDnaBtnProperty的状态
    this.setData({
      'newDnaBtnProperty.loading': true,
      'newDnaBtnProperty.disabled': true
    });
    wx.showToast({
      title: '正在提交',
      icon: 'loading'
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
  // 发起图片请求回调函数
  imgCallBack(res) {
    if (res.status == 0) {//上传成功
      this.setData({
        'addDnaCommentParams.images': this.data.addDnaCommentParams.images.concat(res.result.file_name)
      });
      //当缓存图片都上传成功之后
      if (this.data.addDnaCommentParams.images.length == this.data.imagesStorageTotal.length) {
        // 1.有语音，发起语音接口
        if (this.data.audioproperty.tempFilePath != '') {
          util.checkNetWorkStatus(this.voiceRequest)
        } else {
          // 2.无语音，直接发起新增DNA接口
          util.checkNetWorkStatus(this.addDnaCommentRequest);
        }
      }
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'newDnaBtnProperty.loading': false,
        'newDnaBtnProperty.disabled': false,
        'addDnaCommentParams.images': [],
        'addDnaCommentParams.voices': [],
        'imagesStorage': this.data.imagesStorageTotal
      });
    }
  },
  // 发起语音请求
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
  // 发起语音请求回调函数
  voiceCallBack(res) {
    if (res.status == 0) {//上传成功
      this.setData({
        'addDnaCommentParams.voices': this.data.addDnaCommentParams.voices.concat(res.result.file_name)
      });
      //发起新增DNA接口回调
      util.checkNetWorkStatus(this.addDnaCommentRequest);
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'newDnaBtnProperty.loading': false,
        'newDnaBtnProperty.disabled': false,
        'addDnaCommentParams.images': [],
        'addDnaCommentParams.voices': [],
        'imagesStorage': this.data.imagesStorageTotal
      });
    }
  },
  // 发起新增dna批阅接口请求
  addDnaCommentRequest() {
    var addDnaCommentParams = this.data.addDnaCommentParams;
    var images = JSON.stringify(addDnaCommentParams.images);
    var voices = JSON.stringify(addDnaCommentParams.voices);
    var checksum = addDnaCommentParams.token + addDnaCommentParams.dna_id + addDnaCommentParams.comment_brief + addDnaCommentParams.comment_detail + images + voices + app.globalData.SALT;
    this.setData({
      'addDnaCommentParams.images': images,
      'addDnaCommentParams.voices': voices,
      'addDnaCommentParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/dnas/add_dna_comment';
    util.http(url, addDnaCommentParams, this.addDnaCommnetCb);
  },
  // 新增dna批阅回调函数
  addDnaCommnetCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '批改成功',
      })
      var pages = getCurrentPages();
      var currPage = pages[pages.length - 1];//当前页面
      var prevPage = pages[pages.length - 2];//上一 个页面
      var secondPage = pages[pages.length - 3];// 上上一个页面
      // 判断是哪个页面，如果是dna列表页面，跳转到dna列表页，否则跳转到dna批阅页面
      if (prevPage.data.time != null) {//dna列表页
        prevPage.setData({
          'dnaList': [],
          'isEmpty': true,
          'loadingMore': false,
          'noMore': false,
          'noSelectDna': false,
          'getDnaListByTeacherParams.last_id': 0,
          'getDnaListByTeacherParams.filter': {}
        })
        prevPage.getDnaListByTeacher();
      } else if (prevPage.data.dnaInfo != null) {//dna批阅页面
        prevPage.getDnaCommentList();
        secondPage.setData({
          'dnaList': [],
          'isEmpty': true,
          'loadingMore': false,
          'noMore': false,
          'noSelectDna': false,
          'getDnaListByTeacherParams.last_id': 0,
          'getDnaListByTeacherParams.filter': {}
        });
        secondPage.getDnaListByTeacher();
      }
      setTimeout(function () {
        wx.navigateBack()
      }, 1000)
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
      this.setData({
        'newDnaBtnProperty.loading': false,
        'newDnaBtnProperty.disabled': false,
        'addDnaCommentParams.images': [],
        'addDnaCommentParams.voices': [],
        'imagesStorage': this.data.imagesStorageTotal
      });
    }
  }
})