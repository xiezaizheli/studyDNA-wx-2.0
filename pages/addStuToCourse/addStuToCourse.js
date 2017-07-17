var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    studentList: [],
    studentCurrentList: [],
    isEmpty: true,
    loadingMore: false, // 加载更多
    noMore: false, //无更多DNA数据
    noRelativeStudent: false,
    searchStudentParams: { // 搜索学生
      token: '',
      filter: {},
      last_id: '',
      checksum: ''
    },
    addStudentToCourseParams: {//增加学生到课程
      token: '',
      course_id: '',
      student_id: '',
      checksum: ''
    }
  },
  // 上拉触底加载更多
  onReachBottom: function () {
    util.checkNetWorkStatus(this.reachBottomCb);
  },
  // 上拉触底回调函数
  reachBottomCb() {
    var studentList = this.data.studentList;
    if (this.data.studentCurrentList.length == 20) {
      var token = wx.getStorageSync('token');
      var searchStudentParams = this.data.searchStudentParams;
      var filter = JSON.stringify(searchStudentParams.filter);
      var last_id = studentList[studentList.length - 1].user_id;
      var checksum = token + filter + last_id + app.globalData.SALT;
      this.setData({
        'searchStudentParams.token': token,
        'searchStudentParams.filter': filter,
        'searchStudentParams.last_id': last_id,
        'searchStudentParams.checksum': md5(checksum)
      });
      var url = app.globalData.baseUrl + '/users/search_student';
      util.http(url, searchStudentParams, this.searchStudentCb);
    }
  },
  // 获得输入框的关键词
  getCourseKey: function (e) {
    var val = e.detail.value;
    // 判断如果有值，输入的是数字还是字符串,字符串返回NAN,数字返回正常
    if (val.length != 0) {
      if (parseInt(val)) {
        this.setData({
          'searchStudentParams.filter.mobile': val
        })
      } else {
        this.setData({
          'searchStudentParams.filter.real_name': val
        })
      }
    } else {
      this.setData({
        'searchStudentParams.filter': {}
      })
    }
  },
  // 根据网络情况，搜索学生接口
  searchStudent: function () {
    var filter = this.data.searchStudentParams.filter;
    if (util.isEmptySimple(filter)) {
      wx.showToast({
        title: '未输入任何搜索信息',
        icon: 'loading'
      })
    } else {
      util.checkNetWorkStatus(this.launchSearchStudent);
    }
  },
  // 发起搜索学生接口
  launchSearchStudent(res) {
    if (wx.showLoading) wx.showLoading({
      title: '正在加载中...',
    })
    var token = wx.getStorageSync('token');
    var searchStudentParams = this.data.searchStudentParams;
    var filter = JSON.stringify(searchStudentParams.filter);
    var last_id = '';
    var checksum = token + filter + last_id + app.globalData.SALT;
    this.setData({
      'searchStudentParams.token': token,
      'searchStudentParams.filter': filter,
      'searchStudentParams.last_id': last_id,
      'searchStudentParams.checksum': md5(checksum),
      'loadingMore': false,
      'noMore': false,
      'noRelativeStudent': false,
      'isEmpty': true,
      'studentList': [],
    });
    var url = app.globalData.baseUrl + '/users/search_student';
    util.http(url, searchStudentParams, this.searchStudentCb);
  },
  // 搜索学生接口回调函数
  searchStudentCb(res) {
    // 反序列化
    var filter = this.data.searchStudentParams.filter;
    this.setData({
      'searchStudentParams.filter': JSON.parse(filter)
    });
    if (res.status == 0) {
      var users = res.result.users;
      this.setData({ 'studentCurrentList': users });
      var studentCurrentList = this.data.studentCurrentList;
      // 如果要绑定新加载的数据，那么需要将新数据和旧数据绑定在一起
      var studentList = this.data.studentList;
      var totalStudentList = [];
      if (!this.data.isEmpty) {
        totalStudentList = studentList.concat(studentCurrentList)
      } else {
        totalStudentList = studentCurrentList;
        this.setData({ 'isEmpty': false })
      }
      for (var i = 0; i < totalStudentList.length; i++) {
        totalStudentList[i].join_status = -1
      }
      // 本地判断学生是否在课程里面
      var studentIdList = wx.getStorageSync('student_id_list');
      for (var i = 0; i < totalStudentList.length; i++) {
        for (var j = 0; j < studentIdList.length; j++) {
          if (totalStudentList[i].user_id == studentIdList[j]) {
            totalStudentList[i].join_status = 0
          }
        }
      }
      this.setData({
        'studentList': totalStudentList
      });
      // 判断有没有相关筛选条件的学生信息
      if (util.isEmptySimple(filter) == false && this.data.studentList.length == 0) {
        this.setData({
          'noRelativeStudent': true
        })
      } else {
        this.setData({
          'noRelativeStudent': false
        })
      }
      // 判断是否加载更多、无更多dna信息
      if (studentCurrentList.length != 0) {
        if (studentCurrentList.length == 20) {
          this.setData({
            'loadingMore': true,
            'noMore': false,
          })
        } else {
          this.setData({
            'loadingMore': false,
            'noMore': true,
          })
        }
      }
      if (studentCurrentList.length == 0 && studentList.length != 0) {
        this.setData({
          'loadingMore': false,
          'noMore': true,
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
    if (wx.hideLoading) wx.hideLoading();
  },
  // 发起增加学生到课程
  addStudentToCourse: function (e) {
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
          // 发起接口请求
          var token = wx.getStorageSync('token');
          var courseId = wx.getStorageSync('course_id');
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
        title: res.message,
        icon: 'loading'
      })
      // 更新课程详情页面,本地数据更新
      var pages = getCurrentPages();
      var currPage = pages[pages.length - 1];//当前页面
      var prevPage = pages[pages.length - 2];//上一个页面
      var secondPage = pages[pages.length - 3];//课程管理页面
      setTimeout(function () {
        prevPage.getCourseInfoWithStudent();
      }, 1500)
      // 更新课程管理页面数据
      var courseList = secondPage.data.courseList;
      var courseId = wx.getStorageSync('course_id');
      for (var i = 0; i < courseList.length; i++) {
        if (courseList[i].course_id == courseId) {
          courseList[i].student_num++;
        }
      }
      secondPage.setData({
        'courseList': courseList
      });
      // 更新student_id_list中的缓存
      var studentIdList = wx.getStorageSync('student_id_list');
      studentIdList.push(this.data.addStudentToCourseParams.student_id);
      wx.setStorageSync('student_id_list', studentIdList);
      // 更新当前学生加入课程的状态
      var studentList = this.data.studentList;
      for (var i = 0; i < studentList.length; i++) {
        if (studentList[i].user_id == this.data.addStudentToCourseParams.student_id) {
          studentList[i].join_status = 0;
        }
      }
      this.setData({
        'studentList': studentList
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