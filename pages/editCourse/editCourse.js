var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    courseGrades: {
      array: [],
      index: 0
    },
    courseSubjects: {
      array: [],
      index: 0
    },
    modalProperty: {
      pageModal: false,
      courseDescModal: false,
      pageOverflow: false
    },
    editBtnProperty: {
      loading: false,
      disabled: false,
    },
    changeCourseParams: {//创建课程接口参数
      token: '',
      course_id: '',
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
        'courseGrades.array': wx.getStorageSync('course_grade_list'),
      });
      var courseId = wx.getStorageSync('course_id');
      var subjectId = wx.getStorageSync('subject_id');
      var gradeId = wx.getStorageSync('grade_id');
      var courseName = wx.getStorageSync('course_name');
      var courseDesc = wx.getStorageSync('course_desc');

      var courseSubjects = this.data.courseSubjects.array;
      courseSubjects.forEach((item, i, array) => {
        if (item.id == subjectId) {
          this.setData({ 'courseSubjects.index': i })
        }
      });
      var courseGrades = this.data.courseGrades.array;
      courseGrades.forEach((item, i, array) => {
        if (item.id == gradeId) {
          this.setData({ 'courseGrades.index': i })
        }
      });

      // 设置修改接口参数
      this.setData({
        'changeCourseParams.token': wx.getStorageSync('token'),
        'changeCourseParams.course_id': courseId,
        'changeCourseParams.subject_id': subjectId,
        'changeCourseParams.grade_id': gradeId,
        'changeCourseParams.course_name': courseName,
        'changeCourseParams.course_desc': courseDesc
      })
    }
  },
  //选择学级下拉菜单
  pickerCourseGradeChange: function (e) {
    var grade_id = this.data.courseGrades.array[e.detail.value].id;
    this.setData({
      'courseGrades.index': e.detail.value,
      'courseGrades.dropdown': true,
      'changeCourseParams.grade_id': grade_id
    })
  },
  //选择学科下拉菜单
  pickerCourseSubjectChange: function (e) {
    var subject_id = this.data.courseSubjects.array[e.detail.value].id;
    this.setData({
      'courseSubjects.index': e.detail.value,
      'courseSubjects.dropdown': true,
      'changeCourseParams.subject_id': subject_id
    })
  },
  // 获得课程标题
  getCourseName: function (e) {
    var val = e.detail.value;
    if (val) {
      this.setData({
        'changeCourseParams.course_name': val
      })
    } else {
      this.setData({
        'changeCourseParams.course_name': ''
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
        'changeCourseParams.course_desc': val
      })
    } else {
      this.setData({
        'changeCourseParams.course_desc': ''
      })
    }
  },
  // 发起修改课程接口
  changeCourse: function (e) {
    var changeCourseParams = this.data.changeCourseParams;
    // 客服端验证
    if (!changeCourseParams.grade_id) {
      wx.showToast({
        title: '未选择学级',
        icon: 'loading'
      })
    } else if (!changeCourseParams.subject_id) {
      wx.showToast({
        title: '未选择学科',
        icon: 'loading'
      })
    } else if (!changeCourseParams.course_name) {
      wx.showToast({
        title: '未填写课程标题',
        icon: 'loading'
      })
    } else if (!changeCourseParams.course_desc) {
      wx.showToast({
        title: '未填写课程简介',
        icon: 'loading'
      })
    } else {
      // 根据网络情况，发起服务器端申请
      util.checkNetWorkStatus(this.launchChangeCourse);
    }
  },
  launchChangeCourse() {
    wx.showToast({
      title: '正在提交',
      icon: 'loading'
    })
    this.setData({
      'editBtnProperty.loading': true,
      'editBtnProperty.disabled': true
    });
    var changeCourseParams = this.data.changeCourseParams;
    var checksum = changeCourseParams.token + changeCourseParams.course_id + changeCourseParams.grade_id + changeCourseParams.subject_id + changeCourseParams.course_name + changeCourseParams.course_desc + app.globalData.SALT;
    this.setData({
      'changeCourseParams.checksum': md5(checksum)
    })
    var url = app.globalData.baseUrl + '/courses/change_course';
    util.http(url, changeCourseParams, this.changeCourseCb)
  },
  changeCourseCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '修改成功',
      })
      // 更新课程详情页面的内容
      var pages = getCurrentPages();
      var currPage = pages[pages.length - 1];//当前页面
      var prevPage = pages[pages.length - 2];//上一个页面
      var nextPage = pages[pages.length - 3];//课程列表页面
      prevPage.getCourseInfoWithStudent();
      // 课程列表页面
      nextPage.setData({
        'getCourseListByTeacherParams.last_id': 0,
        'courseList': [],
        'isEmpty': true,
        'loadingMore': false,
        'noMore': false,
        'noRelativeCourse': false,
      })
      nextPage.getCourseListByTeacher();
      setTimeout(function(){
        wx.navigateBack();
      },1000)
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      });
      this.setData({
        'editBtnProperty.loading': false,
        'editBtnProperty.disabled': false
      })
    }
  }
})