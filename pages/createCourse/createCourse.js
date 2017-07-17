var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    courseGrades: {
      array: [],
      dropdown: false,
    },
    courseSubjects: {
      array: [],
      dropdown: false,
    },
    modalProperty: {
      pageModal: false,
      courseDescModal: false,
      pageOverflow: false
    },
    addBtnProperty: {
      loading: false,
      disabled: false,
    },
    addCourseParams: {//创建课程接口参数
      token: '',
      grade_id: '',
      subject_id: '',
      course_name: '',
      course_desc: '',
      checksum: ''
    }
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 从缓存中获取学级和学科信息
      this.setData({
        'courseSubjects.array': wx.getStorageSync('course_subject_list'),
        'courseGrades.array': wx.getStorageSync('course_grade_list')
      });
    }
  },
  //选择学级下拉菜单
  pickerCourseGradeChange: function (e) {
    var grade_id = this.data.courseGrades.array[e.detail.value].id;
    this.setData({
      'courseGrades.index': e.detail.value,
      'courseGrades.dropdown': true,
      'addCourseParams.grade_id': grade_id
    })
  },
  //选择学科下拉菜单
  pickerCourseSubjectChange: function (e) {
    var subject_id = this.data.courseSubjects.array[e.detail.value].id;
    this.setData({
      'courseSubjects.index': e.detail.value,
      'courseSubjects.dropdown': true,
      'addCourseParams.subject_id': subject_id
    })
  },
  // 获得课程标题
  getCourseName: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'addCourseParams.course_name': val
      })
    } else {
      this.setData({
        'addCourseParams.course_name': ''
      })
    }
  },
  // 弹出课程简介模态框
  popCourseDescModal: function (e) {
    this.setData({
      'modalProperty.pageModal': true,
      'modalProperty.courseDescModal': true,
      'modalProperty.pageOverflow': true
    })
  },
  // 取消模态框
  cancelModal: function (e) {
    this.setData({
      'modalProperty.pageModal': false,
      'modalProperty.courseDescModal': false,
      'modalProperty.pageOverflow': false
    })
  },
  // 获得课程简介
  getCourseDesc: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'addCourseParams.course_desc': val,
      })
    } else {
      this.setData({
        'addCourseParams.course_desc': '',
      })
    }
  },
  // 发起创建课程接口
  addCourse: function (e) {
    var addCourseParams = this.data.addCourseParams;
    // 客服端验证
    if (!addCourseParams.grade_id) {
      wx.showToast({
        title: '未选择学级',
        icon: 'loading'
      })
    } else if (!addCourseParams.subject_id) {
      wx.showToast({
        title: '未选择学科',
        icon: 'loading'
      })
    } else if (!addCourseParams.course_name) {
      wx.showToast({
        title: '未填写课程标题',
        icon: 'loading'
      })
    } else if (!addCourseParams.course_desc) {
      wx.showToast({
        title: '未填写课程简介',
        icon: 'loading'
      })
    } else {
      // 根据网络情况，发起服务器端申请
      util.checkNetWorkStatus(this.launchAddCourse);
    }
  },
  launchAddCourse() {
    wx.showToast({
      title: '正在提交',
      icon: 'loading'
    })
    this.setData({
      'addBtnProperty.loading': true,
      'addBtnProperty.disabled': true
    });
    var addCourseParams = this.data.addCourseParams;
    var token = wx.getStorageSync('token');
    var checksum = token + addCourseParams.grade_id + addCourseParams.subject_id + addCourseParams.course_name + addCourseParams.course_desc + app.globalData.SALT;
    this.setData({
      'addCourseParams.token': token,
      'addCourseParams.checksum': md5(checksum)
    })
    var url = app.globalData.baseUrl + '/courses/add_course';
    util.http(url, addCourseParams, this.addCourseCb)
  },
  addCourseCb(res) {
    if (res.status == 0) {
      this.setData({
        'addBtnProperty.loading': false,
        'addBtnProperty.disabled': false
      })
      var courseId = res.result.course_info.course_id;
      // 更新课程管理页面的内容
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];//上一个页面
      prevPage.setData({
        'courseList': [],
        'isEmpty': true,
        'loadingMore': false,
        'noMore': false,
        'noRelativeCourse': false,
        'getCourseListByTeacherParams.last_id': 0,
        'getCourseListByTeacherParams.filter': {},
        'courseGrades.currentName':'年级',
        'courseGrades.index':0,
        'courseSubjects.currentName':'科目',
        'courseSubjects.index':0
      })
      prevPage.getCourseListByTeacher();
      // 跳转到课程详情页面
      wx.setStorageSync('course_id', courseId);
      wx.redirectTo({
        url: '../courseDetail/courseDetail?courseId=' + courseId,
      })
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'addBtnProperty.loading': false,
        'addBtnProperty.disabled': false
      })
    }
  }
})