var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    applyList: [],
    getCourseAddRequestListByTeacherParams: {//获取所有学生申请加入课程的信息
      token: '',
      checksum: '',
    },
    refuseAddCourseParams: { // 老师拒绝学生加入课程
      token: '',
      course_id: '',
      student_id: '',
      checksum: '',
    },
    addStudentToCourseParams: {//增加学生到课程
      token: '',
      course_id: '',
      student_id: '',
      checksum: ''
    }
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation()
    } else {
      // 检查网络，发起接口请求
      util.checkNetWorkStatus(this.getCourseAddRequestListByTeacher);
    }
  },
  // 获取所有学生申请加入课程的信息
  getCourseAddRequestListByTeacher() {
    this.setData({ 'loadingPage': true });
    if (wx.showLoading) wx.showLoading({ title: '正在加载中...' });
    // 发起接口请求
    var token = wx.getStorageSync('token');
    var checksum = token + app.globalData.SALT;
    this.setData({
      'getCourseAddRequestListByTeacherParams.token': token,
      'getCourseAddRequestListByTeacherParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/courses/get_course_add_request_list_by_teacher';
    util.http(url, this.data.getCourseAddRequestListByTeacherParams, this.getCourseAddRequestListByTeacherCb)
  },
  //获取所有学生申请加入课程的回调函数
  getCourseAddRequestListByTeacherCb(res) {
    if (res.status == 0) {
      if (res.result != null) {
        this.setData({ 'applyList': res.result });
        var applyList = this.data.applyList;
        for (var i = 0; i < applyList.length; i++) {
          applyList[i].add_time = util.dateFormat(applyList[i].add_time * 1000, '.')
        }
        this.setData({ 'applyList': applyList });
      } else {
        this.setData({
          applyList: []
        });
      }
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
  // 拒绝学生加入课程
  refuseAddCourse: function (e) {
    var courseId = e.currentTarget.dataset.courseId;
    var studentId = e.currentTarget.dataset.studentId;
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType;
        if (networkType == "none" || networkType == "unknown") {
          wx.showToast({
            title: '网络异常，请稍后重试',
            icon: 'loading'
          })
        } else {
          var token = wx.getStorageSync('token');
          var checksum = token + courseId + studentId + app.globalData.SALT;
          this.setData({
            'refuseAddCourseParams.token': token,
            'refuseAddCourseParams.course_id': courseId,
            'refuseAddCourseParams.student_id': studentId,
            'refuseAddCourseParams.checksum': md5(checksum)
          });
          var url = app.globalData.baseUrl + '/courses/refuse_add_course';
          util.http(url, this.data.refuseAddCourseParams, this.refuseAddCourseCb)
        }
      }
    })
  },
  // 拒绝学生加入课程回调函数
  refuseAddCourseCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '已拒绝学生加入',
      })
      //从列表中删除此条信息
      var applyList = this.data.applyList;
      var refuseAddCourseParams = this.data.refuseAddCourseParams;
      for (var i = 0; i < applyList.length; i++) {
        if (applyList[i].student_id == refuseAddCourseParams.student_id && applyList[i].course_id == refuseAddCourseParams.course_id) {
          applyList.splice(i, 1)
        }
      }
      this.setData({
        'applyList': applyList
      });
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 同意学生加入课程
  addStudentToCourse: function (e) {
    var studentId = e.currentTarget.dataset.studentId;
    var courseId = e.currentTarget.dataset.courseId;
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType;
        if (networkType == "none" || networkType == "unknown") {
          wx.showToast({
            title: '网络异常，请稍后重试',
            icon: 'loading'
          })
        } else {
          // 发起接口请求
          var token = wx.getStorageSync('token');
          var checksum = token + courseId + studentId + app.globalData.SALT;
          this.setData({
            'addStudentToCourseParams.token': token,
            'addStudentToCourseParams.course_id': courseId,
            'addStudentToCourseParams.student_id': studentId,
            'addStudentToCourseParams.checksum': md5(checksum)
          });
          var url = app.globalData.baseUrl + '/courses/add_student_to_course';
          util.http(url, this.data.addStudentToCourseParams, this.addStudentToCourseCb)
        }
      }
    })
  },
  // 增加学生到课程回调函数
  addStudentToCourseCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '已同意学生加入',
      })
      //从列表中删除此条信息
      var applyList = this.data.applyList;
      var addStudentToCourseParams = this.data.addStudentToCourseParams;
      for (var i = 0; i < applyList.length; i++) {
        if (applyList[i].student_id == addStudentToCourseParams.student_id && applyList[i].course_id == addStudentToCourseParams.course_id) {
          applyList.splice(i, 1)
        }
      }
      this.setData({
        'applyList': applyList
      });
      // 对应的课程管理页面增加人数
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];//课程管理页面
      var courseList = prevPage.data.courseList;
      for (var i = 0; i < courseList.length; i++) {
        if (courseList[i].course_id == this.data.addStudentToCourseParams.course_id) {
          courseList[i].student_num++
        }
      }
      prevPage.setData({
        'courseList':courseList
      })
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  }
})