var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();
var playTimeInterval, interval;

Page({
  data: {
    loadingPage: true,
    commentDetail: '',
    modalProperty: {//模态框
      commentDetailModal: false,
      pageModal: false,
      pageOverflow: false
    },
    editDnaBtnProperty: {
      loading: false,
      disabled: false
    },
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
    changeDnaCommentParams: {//修改DNA批改接口参数
      token: '',
      dna_comment_id: '',
      comment_brief: '',
      comment_detail: '',
      images: [],
      voices: [],
      checksum: ''
    },
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation()
    } else {
      this.setData({ 'loadingPage': true })
      if (wx.showLoading) wx.showLoading({ title: '正在加载中...' });
      // 从缓存和参数中获取原有的DNA数据并处理详情长度
      this.setData({
        'changeDnaCommentParams.token': wx.getStorageSync('token'),
        'changeDnaCommentParams.dna_comment_id': wx.getStorageSync('dna_comment_id'),
        'changeDnaCommentParams.comment_brief': wx.getStorageSync('comment_brief'),
        'changeDnaCommentParams.comment_detail': wx.getStorageSync('comment_detail')
      });


      // 设置图片为缓存的内容
      var comment_images = wx.getStorageSync('comment_images');
      var originalImages = [];
      for (let i = 0; i < comment_images.length; i++) {
        originalImages.push(comment_images[i].file_path);
      }
      this.setData({
        'localImages.totalImages': originalImages
      })

      //判断是否存在语音问题
      var voices = wx.getStorageSync('comment_voices');
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
    }
  },
  onReady: function () {
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
  },
  // 获取批改概要
  getCommentBrief: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'changeDnaCommentParams.comment_brief': val
      })
    } else {
      this.setData({
        'changeDnaCommentParams.comment_brief': ''
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
  // 获取批改详情
  getCommentDetail: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'changeDnaCommentParams.comment_detail': val
      })
    } else {
      this.setData({
        'changeDnaCommentParams.comment_detail': ''
      })
    }
  },
  // 添加图片
  addImg: function (e) {
    var localImages = this.data.localImages;
    var count = 6 - this.data.localImages.totalImages.length;
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
        title: 'DNA照片最多可选6张',
        icon: 'loading'
      })
    }
  },
  // 根据touch时间计算时删除图片还是预览图片
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
  // 结束录音
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
  // 清除语音文件
  clearRecord: function () {
    this.data.audioproperty.recordTime = 0
    this.data.audioproperty.playTime = 0
    this.stopVoice();
    this.pauseVoice();
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
    var changeDnaCommentParams = this.data.changeDnaCommentParams;
    if (changeDnaCommentParams.comment_brief == '') {
      wx.showToast({
        title: '未填写批改概要',
        icon: 'loading'
      })
    } else if (changeDnaCommentParams.comment_detail == '') {
      wx.showToast({
        title: '未填写批改详情',
        icon: 'loading'
      })
    } else if (this.data.localImages.totalImages.length == 0 && changeDnaCommentParams.images.length == 0) {
      wx.showToast({
        title: '未上传DNA图片',
        icon: 'loading'
      })
    } else {
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
            // 修改editDnaBtnProperty的状态
            this.setData({
              'editDnaBtnProperty.loading': true,
              'editDnaBtnProperty.disabled': true
            })
          }
        }
      })
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
        'changeDnaCommentParams.images': originalImages
      })
      var sessionImages = wx.getStorageSync('comment_images');
      //无图片上传
      if (localImages.uploadImages.length == 0) {
        if (this.data.audioproperty.tempFilePath != '') {
          // 有语音，发起语音接口
          util.checkNetWorkStatus(this.voiceRequest);
        } else {
          // 无语音，直接发起新增DNA接口
          util.checkNetWorkStatus(this.changeDnaCommentRequest);
        }
      } else {
        util.checkNetWorkStatus(this.imgRequest);
      }
    }
  },
  imgRequest() {
    //发起图片接口上传请求--串行上传
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
    var changeDnaCommentParams = this.data.changeDnaCommentParams;
    var localImages = this.data.localImages;
    if (res.status == 0) {//上传成功
      this.setData({
        'changeDnaCommentParams.images': changeDnaCommentParams.images.concat(res.result.file_name)
      });
      //当缓存图片都上传成功之后
      if (changeDnaCommentParams.images.length == localImages.totalImages.length) {
        // 1.有语音，发起语音接口
        if (this.data.audioproperty.tempFilePath != '') {
          util.checkNetWorkStatus(this.voiceRequest);
        } else {
          // 2.无语音，直接发起新增DNA接口
          util.checkNetWorkStatus(this.changeDnaCommentRequest);
        }
      }
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'changeDnaCommentParams.images': this.data.localImages.originalImages,
        'changeDnaCommentParams.voices': this.data.localVoices.originalVoices,
        'editDnaBtnProperty.loading': false,
        'editDnaBtnProperty.disabled': false
      });
    }
  },
  voiceRequest() {
    var voiceTemp = this.data.audioproperty.tempFilePath;
    var originalTemp = this.data.localVoices.originalTempFilePath;
    // 语音已更改
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
      // 语音未更改
      this.setData({
        'changeDnaCommentParams.voices': this.data.localVoices.originalFile
      })
      util.checkNetWorkStatus(this.changeDnaCommentRequest);
    }

  },
  voiceCallBack(res) {
    if (res.status == 0) {//上传成功
      this.setData({
        'changeDnaCommentParams.voices': this.data.changeDnaCommentParams.voices.concat(res.result.file_name)
      });
      //发起新增DNA接口回调
      util.checkNetWorkStatus(this.changeDnaCommentRequest);
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'changeDnaCommentParams.images': this.data.localImages.originalImages,
        'changeDnaCommentParams.voices': this.data.localVoices.originalVoices,
        'editDnaBtnProperty.loading': false,
        'editDnaBtnProperty.disabled': false
      });
    }
  },
  changeDnaCommentRequest() {
    var changeDnaCommentParams = this.data.changeDnaCommentParams;
    var url = app.globalData.baseUrl + '/dnas/change_dna_comment';
    var images = JSON.stringify(changeDnaCommentParams.images);
    var voices = JSON.stringify(changeDnaCommentParams.voices);
    var checksum = changeDnaCommentParams.token + changeDnaCommentParams.dna_comment_id + changeDnaCommentParams.comment_brief + changeDnaCommentParams.comment_detail + images + voices + app.globalData.SALT;
    this.setData({
      'changeDnaCommentParams.images': images,
      'changeDnaCommentParams.voices': voices,
      'changeDnaCommentParams.checksum': md5(checksum)
    })
    util.http(url, changeDnaCommentParams, this.changeDnaCommnetCb);
  },
  changeDnaCommnetCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: res.message,
      })
      //为了修改数据之后，将修改成功的批阅数据写入DNA列表页面而不刷新页面
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];//上一个页面
      prevPage.getDnaCommentList();
      setTimeout(function () {
        wx.navigateBack();
      }, 1000);
    } else {
      this.setData({
        'changeDnaCommentParams.images': this.data.localImages.originalImages,
        'changeDnaCommentParams.voices': this.data.localVoices.originalVoices,
        'editDnaBtnProperty.loading': false,
        'editDnaBtnProperty.disabled': false
      });
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  }
})