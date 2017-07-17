var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var qrcode = require("../../utils/qrcode.js");
var app = getApp();

Page({
  data: {
    loadingPage: true,
    courseDetail: {},
    moreCourseDesc: false,
    moreStudent: false,
    deleteImgShow: false,
    imagePath: '',
    placeholder: '',//默认二维码生成文本
    getCourseInfoWithStudentParams: { // 获取课程详情
      token: '',
      course_id: '',
      checksum: '',
    },
    deleteCourseParams: { // 删除课程接口
      token: '',
      course_id: '',
      checksum: ''
    },
    removeStudentFromCourseParams: { //从课程中移除学生
      token: '',
      course_id: '',
      student_id: '',
      checksum: ''
    },
    
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 根据网络情况，发起接口请求
      wx.getNetworkType({
        success: (res) => {
          var networkType = res.networkType;
          if (networkType == "none" || networkType == "unknown") {
            wx.showToast({
              title: '网络异常，请稍后重试',
              icon: 'loading'
            })
          } else {
            this.setData({ 'loadingPage': true });
            if (wx.showLoading) wx.showLoading({ 'title': '正在加载中...' });
            this.getCourseInfoWithStudent()
          }
        }
      })
    }
  },
  // 获取课程详细信息附加学生列表
  getCourseInfoWithStudent() {
    var getCourseInfoWithStudentParams = this.data.getCourseInfoWithStudentParams;
    var token = wx.getStorageSync('token');
    var courseId = wx.getStorageSync('course_id');
    var checksum = token + courseId + app.globalData.SALT;
    this.setData({
      'getCourseInfoWithStudentParams.token': token,
      'getCourseInfoWithStudentParams.course_id': courseId,
      'getCourseInfoWithStudentParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/courses/get_course_info_with_student';
    util.http(url, getCourseInfoWithStudentParams, this.getCourseInfoWithStudentCb)
  },
  // 获取课程详情回调函数
  getCourseInfoWithStudentCb(res) {
    if (res.status == 0) {
      this.setData({
        'courseDetail': res.result
      })
      // 对数据进行本地处理
      var courseDetail = this.data.courseDetail;
      // 课程简介展开和收缩显示
      var course_desc_thumb = '';
      if (courseDetail.course_desc.length >= 50) {
        course_desc_thumb = courseDetail.course_desc.substring(0, 50) + "..."
      } else {
        course_desc_thumb = courseDetail.course_desc;
      }
      this.setData({
        'courseDetail.grade_subject': courseDetail.grade_info.grade_name + courseDetail.subject_info.subject_name,
        'courseDetail.course_desc_thumb': course_desc_thumb,
        'courseDetail.add_time': util.formatTime(courseDetail.add_time * 1000)
      });
      // 对学生的真实姓名进行处理
      var studentList = this.data.courseDetail.student_list;
      var studentStorage = [];
      for (let i = 0; i < studentList.length; i++) {
        var student = studentList[i];
        var real_name = student.user_base_info.real_name;
        if (real_name.length > 4) {
          real_name = real_name.substring(0, 4);
        }
        var temp = {
          student_id: student.student_id,
          head: student.user_base_info.head,
          real_name: real_name
        }
        studentStorage.push(temp);
      }
      this.setData({
        'courseDetail.student_list': studentStorage
      })
      var studentIdList = [];
      // 提取studentList里面的student_id;
      for (var i = 0; i < studentStorage.length; i++) {
        studentIdList.push(studentStorage[i].student_id)
      }
      wx.setStorageSync('student_id_list', studentIdList)
      // 通过课程的id，生成课程二维码
      var qrCodeData = { 'type': 'http', 'action': 1, 'data': 0 };
      qrCodeData.data = wx.getStorageSync('course_id');
      var qrCodeJson = JSON.stringify(qrCodeData);
      this.setData({
        imgPath: qrcode.createQrCodeImg(qrCodeJson, { 'size': 300 })
      })
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
  },
  // 跳转到修改课程页面
  toEditCourse: function (e) {
    var dataset = e.currentTarget.dataset;
    wx.setStorageSync('course_id', dataset.courseId);
    wx.setStorageSync('grade_id', dataset.gradeId);
    wx.setStorageSync('subject_id', dataset.subjectId);
    wx.setStorageSync('course_name', dataset.courseName);
    wx.setStorageSync('course_desc', dataset.courseDesc);
    wx.navigateTo({
      url: '../editCourse/editCourse',
    })
  },
  // 判断网络，删除该课程
  deleteCourse: function () {
    wx.showModal({
      title: '提示',
      content: '删除课程信息，一旦删除，无法恢复，是否继续删除？',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) {
          util.checkNetWorkStatus(this.launchDeleteCourse);
        }
      }
    })
  },
  // 发起删除接口请求
  launchDeleteCourse() {
    var courseId = wx.getStorageSync('course_id');
    var token = wx.getStorageSync('token');
    var checksum = token + courseId + app.globalData.SALT;
    this.setData({
      'deleteCourseParams.token': token,
      'deleteCourseParams.course_id': courseId,
      'deleteCourseParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/courses/delete_course';
    util.http(url, this.data.deleteCourseParams, this.deleteCourseCb);
  },
  // 删除课程回调函数
  deleteCourseCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: res.message
      });
      // 对课程列表页面进行处理，本地处理
      var pages = getCurrentPages();
      var currPage = pages[pages.length - 1];//当前页面
      var prevPage = pages[pages.length - 2];//上一个页面
      var courseId = this.data.deleteCourseParams.course_id;
      var courseList = prevPage.data.courseList;
      if(courseList.length==1){
        prevPage.setData({
          'hasCourse':false,
          'isEmpty': true,
          'loadingMore': false,
          'noMore': false,
          'noRelativeCourse': false
        })
      }
      for (var i = 0; i < courseList.length; i++) {
        if (courseList[i].course_id == courseId) {
          courseList.splice(i, 1);
        }
      }
      prevPage.setData({
        'courseList': courseList
      });
      setTimeout(function () {
        wx.navigateBack()
      },1000)
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 跳转到添加学生页面
  toAddStuToCourse: function () {
    wx.navigateTo({
      url: '../addStuToCourse/addStuToCourse',
    })
  },
  // 课程简介的展开和缩放
  showMoreCourseDesc: function () {
    this.setData({
      moreCourseDesc: !this.data.moreCourseDesc
    });
  },
  // 课堂成员编辑
  editStudentNum: function () {
    this.setData({
      'deleteImgShow': !this.data.deleteImgShow
    })
  },
  // 从课程移除学生
  removeStudentFromCourse: function (e) {
    var studentId = e.currentTarget.dataset.studentId;
    // 判断网络发起删除接口请求
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType;
        if (networkType == "none" || networkType == "unknown") {
          wx.showToast({
            title: '网络异常，请稍后重试',
            icon: 'loading'
          })
        } else {
          // 发起删除接口请求
          wx.showModal({
            title: '提示',
            content: '删除后不可恢复，是否确定删除？',
            success: (res) => {
              if (res.confirm) {
                var token = wx.getStorageSync('token');
                var courseId = wx.getStorageSync('course_id');
                var checksum = token + courseId + studentId + app.globalData.SALT;
                this.setData({
                  'removeStudentFromCourseParams.token': token,
                  'removeStudentFromCourseParams.course_id': courseId,
                  'removeStudentFromCourseParams.student_id': studentId,
                  'removeStudentFromCourseParams.checksum': md5(checksum)
                });
                var url = app.globalData.baseUrl + '/courses/remove_student_from_course';
                util.http(url, this.data.removeStudentFromCourseParams, this.removeStudentFromCourseCb);
              }
            }
          })
        }
      }
    })
  },
  // 从课程移除学生回调函数
  removeStudentFromCourseCb(res) {
    if (res.status == 0) {
      // 更新本地的课堂成员的总数和课程成员的细节
      wx.showToast({
        title: res.message,
      })
      var studentId = this.data.removeStudentFromCourseParams.student_id;
      var studentList = this.data.courseDetail.student_list;
      var studentNum = this.data.courseDetail.stat_info.student_num;
      for (var i = 0; i < studentList.length; i++) {
        if (studentList[i].student_id == studentId) {
          studentList.splice(i, 1);
          studentNum--
        }
      }
      this.setData({
        'courseDetail.student_list': studentList,
        'courseDetail.stat_info.student_num': studentNum
      });
      // 更新课程管理页面的人数
      var pages = getCurrentPages();
      var currPage = pages[pages.length - 1];//当前页面
      var prevPage = pages[pages.length - 2];//上一个页面
      var courseList = prevPage.data.courseList;
      var courseId = this.data.removeStudentFromCourseParams.course_id;
      for (var i = 0; i < courseList.length; i++) {
        if (courseList[i].course_id == courseId) {
          courseList[i].student_num--;
        }
      }
      prevPage.setData({
        'courseList': courseList
      });
      // 更新student_id_list中的id;
      var studentIdList = wx.getStorageSync('student_id_list');
      for (var i = 0; i < studentIdList.length; i++) {
        if (studentIdList[i] == this.data.removeStudentFromCourseParams.student_id) {
          studentIdList.splice(i, 1);
        }
      }
      wx.setStorageSync('student_id_list', studentIdList)
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 课程成员的展开和收缩
  showMoreStudent: function () {
    this.setData({
      'moreStudent': !this.data.moreStudent
    })
  },
  //点击图片进行预览，长按保存分享图片
  previewImg: function (e) {
    var src = e.currentTarget.dataset.src;
    wx.previewImage({
      current:src,
      urls: [src],
    })
  },
})