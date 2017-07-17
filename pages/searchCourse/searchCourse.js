var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    courseList: [],
    courseCurrentList: [],
    isEmpty: true,
    loadingMore: false, // 加载更多
    noMore: false, //无更多DNA数据
    noRelativeCourse: false,
    moreCourseDesc: false,
    searchCourseByStudentParams: { // 学生搜索课程
      token: '',
      filter: {},
      last_id: '',
      checksum: '',
    },
    requestAddCourseParams: { //学生请求加入课程
      token: '',
      course_id: '',
      checksum: ''
    }
  },
  // 上拉触底加载更多
  onReachBottom: function () {
    if (this.data.courseCurrentList.length == 10) {
      util.checkNetWorkStatus(this.reachBottomCb);
    }
  },
  // 上拉触底回调函数
  reachBottomCb() {
    console.log('发起下拉请求')
    var courseList = this.data.courseList;
    if (this.data.courseCurrentList.length == 10) {
      var token = wx.getStorageSync('token');
      var searchCourseByStudentParams = this.data.searchCourseByStudentParams;
      var filter = JSON.stringify(searchCourseByStudentParams.filter);
      var last_id = courseList[courseList.length - 1].course_id;
      var checksum = token + filter + last_id + app.globalData.SALT;
      this.setData({
        'searchCourseByStudentParams.token': token,
        'searchCourseByStudentParams.filter': filter,
        'searchCourseByStudentParams.last_id': last_id,
        'searchCourseByStudentParams.checksum': md5(checksum)
      });
      var url = app.globalData.baseUrl + '/courses/search_course_by_student';
      util.http(url, searchCourseByStudentParams, this.searchCourseByStudentCb);
    }
  },
  // 获得输入框里面的课程关键词
  getCourseKey: function (e) {
    var courseKey = e.detail.value;
    if (courseKey) {
      this.setData({
        'searchCourseByStudentParams.filter.course_name': courseKey
      })
    } else {
      this.setData({
        'searchCourseByStudentParams.filter': {}
      })
    }
  },
  // 根据网络情况，学生搜索课程接口
  searchCourseByStudent: function (e) {
    var filter = this.data.searchCourseByStudentParams.filter;
    if (util.isEmptySimple(filter)) {
      wx.showToast({
        title: '未输入任何搜索信息',
        icon: 'loading'
      })
    } else {
      util.checkNetWorkStatus(this.launchSearchCourseByStudent);
    }
  },
  // 正式发起学生搜索课程接口请求
  launchSearchCourseByStudent() {
    if (wx.showLoading) wx.showLoading({ title: '正在加载中...' });
    var token = wx.getStorageSync('token');
    var searchCourseByStudentParams = this.data.searchCourseByStudentParams;
    var filter = JSON.stringify(searchCourseByStudentParams.filter);
    var last_id = '';
    var checksum = token + filter + last_id + app.globalData.SALT;
    this.setData({
      'searchCourseByStudentParams.token': token,
      'searchCourseByStudentParams.filter': filter,
      'searchCourseByStudentParams.last_id': last_id,
      'searchCourseByStudentParams.checksum': md5(checksum),
      'loadingMore': false,
      'noMore': false,
      'noRelativeCourse': false,
      'isEmpty': true,
      'courseList': [],
    });
    var url = app.globalData.baseUrl + '/courses/search_course_by_student';
    util.http(url, searchCourseByStudentParams, this.searchCourseByStudentCb);
  },
  // 学生搜索课程回调函数
  searchCourseByStudentCb(res) {
    // 反序列化
    var filter = this.data.searchCourseByStudentParams.filter;
    this.setData({
      'searchCourseByStudentParams.filter': JSON.parse(filter)
    });
    if (res.status == 0) {
      this.setData({
        'courseCurrentList': res.result.courses
      });
      // 对数据进行本地处理，判断已经加入
      var courseCurrentList = this.data.courseCurrentList;
      console.log(courseCurrentList.length)
      var courseStorage = [];
      for (var i = 0; i < courseCurrentList.length; i++) {
        var course = courseCurrentList[i];
        var course_desc = course.course_desc;
        var course_desc_thumb = '';
        if (course_desc.length > 50) {
          course_desc_thumb = course_desc.substring(0, 50) + "..."
        } else {
          course_desc_thumb = course_desc
        }
        var school = course.teacher_info.school;
        if (school.length > 6) {
          school = school.substring(0, 6) + "..."
        }
        var grade = course.teacher_info.grade;
        if (grade.length > 6) {
          grade = grade.substring(0, 6) + "..."
        }
        var temp = {
          subject_grade: course.grade_info.grade_name + course.subject_info.subject_name,
          add_time: util.formatTime(course.add_time * 1000),
          head: course.teacher_info.head,
          real_name: course.teacher_info.real_name,
          school: school,
          grade: grade,
          course_id: course.course_id,
          course_name: course.course_name,
          course_desc: course_desc,
          course_desc_thumb: course_desc_thumb,
          student_num: course.stat_info.student_num,
          join_info: course.join_info.status,
        }
        courseStorage.push(temp)
      }
      // 如果要绑定新加载的数据，那么需要将新数据和旧数据绑定在一起
      var courseList = this.data.courseList;
      var totalCourseList = [];
      if (!this.data.isEmpty) {
        totalCourseList = courseList.concat(courseStorage)
      } else {
        totalCourseList = courseStorage;
        this.setData({ 'isEmpty': false })
      }
      this.setData({
        'courseCurrentList': courseStorage,
        'courseList': totalCourseList
      })
      // 判断有无结果
      if (util.isEmptySimple(filter) == false && this.data.courseList.length == 0) {
        this.setData({
          'noRelativeCourse': true
        })
      } else {
        this.setData({
          'noRelativeCourse': false
        })
      }
      // 判断是否加载更多、无更多dna信息
      if (courseCurrentList.length != 0) {
        if (courseCurrentList.length == 10) {
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
      if (courseCurrentList.length == 0 && courseList.length != 0) {
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
  // 学生端申请加入之后，发起接口请求
  requestAddCourse: function (e) {
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType;
        if (networkType == "none" || networkType == "unknown") {
          wx.showToast({
            title: '网络异常，请稍后重试',
            icon: 'loading'
          })
        } else {
          var courseId = e.currentTarget.dataset.courseId;
          var token = wx.getStorageSync('token');
          var checksum = token + courseId + app.globalData.SALT;
          this.setData({
            'requestAddCourseParams.token': token,
            'requestAddCourseParams.course_id': courseId,
            'requestAddCourseParams.checksum': md5(checksum)
          });
          var url = app.globalData.baseUrl + '/courses/request_add_course';
          util.http(url, this.data.requestAddCourseParams, this.requestAddCourseCb)
        }
      }
    })
  },
  // 发起学生加入课程回调
  requestAddCourseCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '正在申请中...',
        icon: 'loading'
      });
      // 更改申请加入按钮的状态
      var courseList = this.data.courseList;
      var courseId = this.data.requestAddCourseParams.course_id;
      for (var i = 0; i < courseList.length; i++) {
        if (courseList[i].course_id == courseId) {
          courseList[i].join_info = 1;
        }
      }
      this.setData({ 'courseList': courseList });
      // 申请成功之后，刷新课程管理
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];
      prevPage.setData({
        'isEmpty': true,
        'loadingMore': false,
        'noMore': false,
        'getCourseListByStudentParams.last_id': 0,
        'noRelativeCourse': false,
        'courseList': []
      })
      prevPage.getCourseListByStudent();
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
  // 课程简介的展开和收缩
  showMoreCourseDesc: function () {
    this.setData({
      moreCourseDesc: !this.data.moreCourseDesc
    })
  }
})