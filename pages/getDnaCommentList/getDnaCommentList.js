var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    loadingPage: true,
    userType: '',
    backgroundActive: false, //当前老师批阅的背景高亮显示
    moreCommentDetail: false,
    moreCommentInfo: '展开',
    voiceControl: false,
    dnaInfo: {},//dna信息
    commentList: [],//批阅列表
    voicePlayingControl: [],//语音总开关
    newBtnShow: false,
    getDnaCommentListParams: {//获取批阅列表接口参数
      token: '',
      dna_id: '',
      checksum: ''
    },
    delDnaCommentParams: {//删除批阅接口请求
      token: '',
      dna_comment_id: '',
      checksum: ''
    }
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 设置空白页和loading基础库从1.1.0开始，做兼容
      this.setData({ 'loadingPage': true })
      if (wx.showLoading) { wx.showLoading({ title: '数据加载中...' }) };
      // 判断用户类型，设置按钮状态
      var userType = wx.getStorageSync('user_type');
      this.setData({ userType: userType });
      if (userType == 0) this.setData({ 'newBtnShow': false });

      // 设置语音总开关
      var voicePlayingControl = this.data.voicePlayingControl;
      voicePlayingControl.push({ isPlaying: false });
      this.setData({
        'voicePlayingControl': voicePlayingControl
      })

      // 发送获取批阅列表接口
      util.checkNetWorkStatus(this.getDnaCommentList);
    }
  },
  onHide: function () {
    this.stopVoice();
  },
  getDnaCommentList() {
    var token = wx.getStorageSync('token');
    var dnaId = wx.getStorageSync('dna_id');
    var checksum = token + dnaId + app.globalData.SALT;
    this.setData({
      'getDnaCommentListParams.token': token,
      'getDnaCommentListParams.dna_id': dnaId,
      'getDnaCommentListParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/dnas/get_dna_comment_list';
    util.http(url, this.data.getDnaCommentListParams, this.getDnaCommentListCb)
  },
  getDnaCommentListCb(res) {
    if (res.status == 0) {
      // 获得dna信息，对dna信息进行数据处理
      this.setData({ 'dnaInfo': res.result.dna });
      var dnaInfo = this.data.dnaInfo;
      this.setData({
        'dnaInfo.add_time': util.dateFormat(dnaInfo.add_time * 1000, '.'),
        'dnaInfo.update.time': util.dateFormat(dnaInfo.update_time * 1000, '.')
      });
      var school = dnaInfo.student_info.school
      if (school.length > 6) {
        school = school.substring(0, 6) + "..."
      }
      var grade = dnaInfo.student_info.grade;
      if (grade.length > 5) {
        grade = grade.substring(0, 5) + "..."
      }
      this.setData({
        'dnaInfo.student_info.school': school,
        'dnaInfo.student_info.grade': grade
      });


      // 获得批阅信息
      var commentList = res.result.comment;
      var commentLength = commentList.length
      for (var i = 0; i < commentLength; i++) {
        commentList[i].add_time = util.formatTime(commentList[i].add_time * 1000);
        commentList[i].update_time = util.formatTime(commentList[i].update_time * 1000);
        var comment_detail = commentList[i].comment_detail;
        var comment_detail_thumb = '';
        if (comment_detail.length >= 30) {
          comment_detail_thumb = comment_detail.substring(0, 30) + '...';
        } else {
          comment_detail_thumb = comment_detail
        }
        commentList[i].comment_detail_thumb = comment_detail_thumb;
      }
      this.setData({ 'commentList': commentList });

      // 设置语音总开关
      var commentList = this.data.commentList;
      var voicePlayingControl = this.data.voicePlayingControl;
      voicePlayingControl[0] = {
        isPlaying: false,
        voices: dnaInfo.voices
      }
      for (var i = 0; i < commentList.length; i++) {
        voicePlayingControl.push({
          isPlaying: false,
          voices: commentList[i].voices
        })
      }
      this.setData({ 'voicePlayingControl': voicePlayingControl })
      // 判断新增按钮和修改、删除按钮的状态
      var teacherId = wx.getStorageSync('user_id');
      var currentI;
      for (var i = 0; i < commentLength; i++) {
        if (commentList[i].teacher_id == teacherId) {
          commentList[i].isActive = true;
          currentI = i;
        } else {
          commentList[i].isActive = false;
        }
      }
      if (currentI == undefined && this.data.userType == 1) {
        this.setData({
          'newBtnShow': true,
        })
      } else {
        this.setData({
          'newBtnShow': false,
        })
      }
      this.setData({ 'commentList': commentList });
      // 如果新增按钮为真时，弹框告知
      if (this.data.newBtnShow) {
        wx.showModal({
          title: '提示',
          content: '你还未批阅此DNA信息，可新增批阅，或者查看其它老师的批阅哦~~',
          showCancel: false
        })
      }
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
    // 隐藏空白页面和loading
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
  },
  previewImg: function (e) {
    var src = e.currentTarget.dataset.src;
    var studentId = e.currentTarget.dataset.studentId;
    var dnaCommentId = e.currentTarget.dataset.dnaCommentId;
    var commentList = this.data.commentList;
    var imgListInfo = [];
    var imgList = [];
    if (studentId == 0 || studentId) {
      imgListInfo = this.data.dnaInfo.images
    } else {
      for (var i = 0; i < commentList.length; i++) {
        if (commentList[i].dna_comment_id == dnaCommentId) {
          imgListInfo = commentList[i].images
        }
      }
    }
    for (var i = 0; i < imgListInfo.length; i++) {
      imgList.push(imgListInfo[i].file_path)
    }
    wx.previewImage({
      current: src,
      urls: imgList
    })
  },
  //语音切换
  toggleVoice: function (e) {
    var index = e.currentTarget.dataset.index;
    var voicePlayingControl = this.data.voicePlayingControl;
    for (var i = 0; i < voicePlayingControl.length; i++) {
      if (index == i) {
        voicePlayingControl[i].isPlaying = !voicePlayingControl[i].isPlaying;
        if (voicePlayingControl[i].isPlaying) {
          this.stopVoice();
          voicePlayingControl[index].isPlaying = true;
          this.downloadFile(index);
          this.setData({
            'voiceControl': true
          })
        } else {
          wx.stopVoice();
          this.setData({
            'voiceControl': false
          })
        }
      } else {
        voicePlayingControl[i].isPlaying = false
      }
    }
    this.setData({ 'voicePlayingControl': voicePlayingControl });
  },
  // 下载语音
  downloadFile(index) {
    var voicePlayingControl = this.data.voicePlayingControl
    wx.downloadFile({
      url: voicePlayingControl[index].voices[0].file_path,
      success: (res) => {
        this.playVoice(res.tempFilePath, index);
      },
      fail: (res) => {
        console.log(res);
      }
    })
  },
  // 播放语音
  playVoice(voice, index) {
    var voicePlayingControl = this.data.voicePlayingControl;
    wx.playVoice({
      filePath: voice,
      complete: (res) => {
        voicePlayingControl[index].isPlaying = false;
        this.setData({
          'voiceControl': false,
          'voicePlayingControl': voicePlayingControl
        });
      },
      fail: (res) => {
        console.log(res);
      }
    })
  },
  // 停止语音播放
  stopVoice() {
    // audio关闭，停止语音播放,当前dnaList的isPlaying变为false
    var voicePlayingControl = this.data.voicePlayingControl;
    voicePlayingControl.forEach((item, i, array) => {
      item.isPlaying = false;
    })
    this.setData({
      'voiceControl': false,
      'voicePlayingControl': voicePlayingControl
    });
    wx.stopVoice();
  },
  toNewDnaComment: function (e) {
    var dnaId = wx.getStorageSync('dna_id');
    wx.navigateTo({
      url: '../newDnaComment/newDnaComment?dnaId=' + dnaId,
    })
  },
  toEditDnaComment: function (e) {
    var dataset = e.currentTarget.dataset;
    wx.setStorageSync('dna_comment_id', dataset.dnaCommentId)
    wx.setStorageSync('comment_brief', dataset.commentBrief);
    wx.setStorageSync('comment_detail', dataset.commentDetail);
    wx.setStorageSync('comment_images', dataset.images);
    wx.setStorageSync('comment_voices', dataset.voices);
    wx.navigateTo({
      url: '../editDnaComment/editDnaComment'
    })
  },
  delDnaComment: function (e) {
    var title = e.currentTarget.dataset.title;
    var index = e.currentTarget.dataset.index;
    var commentList = this.data.commentList;
    wx.showModal({
      title: '提示',
      content: '删除此条DNA批改信息吗？一旦删除，无法恢复！',
      success: (res) => {
        if (res.confirm) {
          var token = wx.getStorageSync('token');
          var dna_comment_id = e.currentTarget.dataset.dnaCommentId;
          var checksum = token + dna_comment_id + app.globalData.SALT;
          this.setData({
            'delDnaCommentParams.token': token,
            'delDnaCommentParams.dna_comment_id': dna_comment_id,
            'delDnaCommentParams.checksum': md5(checksum)
          });
          //发起接口请求
          var url = app.globalData.baseUrl + '/dnas/del_dna_comment';
          wx.request({
            url: url,
            data: this.data.delDnaCommentParams,
            method: 'POST',
            header: { 'content-type': 'application/x-www-form-urlencoded' },
            success: (res) => {
              var res = res.data;
              var voicePlayingControl = this.data.voicePlayingControl
              if (res.status == 0) {
                // 删除之后，无任何批阅信息，更新commentList，voicePlayingControl，newBtnShow的状态
                if (commentList.length == 1) {
                  voicePlayingControl.splice(1, 1);
                  this.setData({
                    'commentList': [],
                    'voicePlayingControl': voicePlayingControl,
                    'newBtnShow': true
                  });
                  var pages = getCurrentPages();
                  var prevPage = pages[pages.length - 2];//上一个页面
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
                } else {
                  // 删除之后还有其他信息,
                  commentList.splice(index, 1);
                  voicePlayingControl.splice(index + 1, 1);
                  this.setData({
                    'commentList': commentList,
                    'voicePlayingControl': voicePlayingControl,
                    'newBtnShow': true
                  })
                }
              } else {
                wx.showToast({
                  title: res.message,
                  icon: 'loading'
                })
              }
            }
          })
        }
      }
    })
  },
  showMoreCommentDetail: function () {
    this.setData({
      moreCommentDetail: !this.data.moreCommentDetail
    });
    if (this.data.moreCommentDetail) {
      this.setData({
        'moreCommentInfo': '收起'
      })
    } else {
      this.setData({
        'moreCommentInfo': '展开'
      })
    }
  }
})