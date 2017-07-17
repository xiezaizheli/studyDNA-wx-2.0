var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    loadingPage: true,
    netWorkStatus: true,
    userType: '',
    hasCourse: '',
    stuAddCourseStatus: false,
    courseList: [],
    currentCourseData: [],
    isEmpty: true,
    loadingMore: false,
    noMore: false,
    noRelativeCourse: false,
    backgroundModal: false,
    pageOverflow: false,//防止底部页面滚动
    subjectModal: false,
    gradeModal: false,
    filterModal: false,//筛选模态框
    moreSubject: false,//更多学级
    moreGrade: false,//更多年级
    moreCourseDesc: false,//更多简介
    teaInfo: {},
    courseGrades: { //年级分类
      array: [],
      currentName: '年级',
      index: 0,
    },
    courseSubjects: {//科目分类
      array: [],
      currentName: '科目',
      index: 0,
    },
    joinStatus: {// 加入状态
      array: [
        {
          'join_status': undefined,
          'name': '所有'
        },
        {
          'join_status': '0',
          'name': '已加入'
        },
        {
          'join_status': '1',
          'name': '正在申请'
        },
      ],
      currentName: '时间',
      index: 0,
    },
    getCourseListByTeacherParams: {
      token: '',
      filter: {},
      last_id: '',
      checksum: '',
    },
    getCourseListByStudentParams: {
      token: '',
      filter: {},
      last_id: '',
      checksum: '',
    },
    requestAddCourseParams: { //学生请求加入课程
      token: '',
      course_id: '',
      checksum: ''
    },
  },
  onLoad: function () {
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 获得缓存中的科目，年级等数据
      var courseSubjects = wx.getStorageSync('course_subject_list');
      courseSubjects.unshift({
        'name': '所有学科',
        'id':undefined
      });
      var courseGrades = wx.getStorageSync('course_grade_list');
      courseGrades.unshift({
        'name': '所有年级',
        'id':undefined
      })
      this.setData({
        'courseSubjects.array': courseSubjects,
        'courseGrades.array': courseGrades
      });
      //给DNA类别、年级、科目、时间添加active，为了后期的筛选
      this.chooseActiveFalse();
      // 根据用户类型，获取不一样的接口数据
      this.setData({ 'userType': wx.getStorageSync('user_type') });
      // 根据网络情况，发起接口请求
      this.getNetworkType();
    }
  },
  // 根据网络情况，发起接口请求
  getNetworkType() {
    wx.getNetworkType({
      success: (res) => {
        var networkType = res.networkType // 返回网络类型2g，3g，4g，wifi, none, unknown
        if (networkType == "none" || networkType == "unknown") {
          //没有网络连接
          this.setData({
            'netWorkStatus': false,
            'loadingPage': false,
          })
        } else {
          if (wx.showLoading) {
            wx.showLoading({ title: '正在加载中...' })
          }
          this.setData({
            'netWorkStatus': true,
            'loadingPage': true
          });
          if (this.data.userType == 0) { // 学生端
            this.getCourseListByStudent();
          } else if (this.data.userType == 1) { //老师端
            this.getCourseListByTeacher();
          }
        }
      }
    })
  },
  // 获取老师信息
  onShow: function (e) {
    this.getTeaInfo();
  },
  // 获取老师信息并进行数据处理
  getTeaInfo() {
    var school = wx.getStorageSync('school');
    if (school.length > 6) {
      school = school.substring(0, 6) + "..."
    }
    var grade = wx.getStorageSync('grade');
    if (grade.length > 5) {
      grade = grade.substring(0, 5) + "..."
    }
    this.setData({
      'teaInfo.head': wx.getStorageSync('head'),
      'teaInfo.realName': wx.getStorageSync('real_name'),
      'teaInfo.school': school,
      'teaInfo.grade': grade
    })
  },
  // 分享页面
  onShareAppMessage: function () {
    return {
      title: '掌握学科思维，轻松快乐学习！',
      src: '/pages/share/share'
    }
  },
  // 将每一个choose里面的选择项都添加active属性
  chooseActiveFalse(e) {
    var subjectArray = this.data.courseSubjects.array;
    var gradeArray = this.data.courseGrades.array;
    var statusArray = this.data.joinStatus.array;
    this.forEachActive(subjectArray);
    this.forEachActive(gradeArray);
    this.forEachActive(statusArray);
    this.setData({
      'courseSubjects.array': subjectArray,
      'courseGrades.array': gradeArray,
      'joinStatus.array': statusArray,
    });
    // 第一项的navbar是active
    this.setData({
      'statusArray.array[0].active': true
    })
  },
  // 遍历
  forEachActive(arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i].active = false;
    }
  },
  // 页面上拉触底事件
  onReachBottom: function (e) {
    if(this.data.userType==1){
      util.checkNetWorkStatus(this.reachBottomCb);
    }
  },
  // 页面上拉触底回调函数
  reachBottomCb() {
    var userType = this.data.userType;
    // 如果当前返回的数据没有10条，说明没有相关的数据
    var currentCourseData = this.data.currentCourseData;
    // 如果当前返回的不是空数据
    if (currentCourseData.length == 20) {
      if (userType == 1) {
        this.getCourseListByTeacher();
      }
    }
  },
  // 根据网络情况，判断是否调用获取指定学生课程列表
  getCourseListByStudent: function () {
    util.checkNetWorkStatus(this.launchGetCourseListByStudent);
  },
  // 获取指定学生课程列表
  launchGetCourseListByStudent() {
    var getCourseListByStudentParams = this.data.getCourseListByStudentParams;
    var token = wx.getStorageSync('token');
    var filter = JSON.stringify(getCourseListByStudentParams.filter);
    var checksum = token + filter + getCourseListByStudentParams.last_id + app.globalData.SALT;
    this.setData({
      'getCourseListByStudentParams.token': token,
      'getCourseListByStudentParams.filter': filter,
      'getCourseListByStudentParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/courses/get_course_list_by_student';
    util.http(url, getCourseListByStudentParams, this.getCourseListByStudentCb);
  },
  // 获取指定学生课程列表回调函数
  getCourseListByStudentCb(res) {
    // 反序列化，便于再次发起申请再次序列化
    var filter = JSON.parse(this.data.getCourseListByStudentParams.filter);
    this.setData({
      'getCourseListByStudentParams.filter': filter
    })
    if (res.status == 0) {
      var currentCourseData = res.result.courses;
      this.setData({ 'currentCourseData': currentCourseData });
      // 当返回数据不为空数组时，对数据进行处理
      if (currentCourseData.length != 0) {
        var courseStorage = [];
        for (var i = 0; i < currentCourseData.length; i++) {
          var course = currentCourseData[i];
          var course_desc = course.course_info.course_desc;
          var course_desc_thumb = '';
          if (course_desc.length >= 30) {
            course_desc_thumb = course_desc.substring(0, 30) + '...';
          } else {
            course_desc_thumb = course_desc;
          }
          var temp = {
            subject_grade: course.course_info.grade_info.grade_name + course.course_info.subject_info.subject_name,
            add_time: util.formatTime(course.add_time * 1000),
            head: course.course_info.teacher_info.head,
            real_name: course.course_info.teacher_info.real_name,
            school: course.course_info.teacher_info.school,
            grade: course.course_info.teacher_info.grade,
            course_name: course.course_info.course_name,
            course_desc: course_desc,
            course_desc_thumb: course_desc_thumb,
            course_id: course.course_id,
            student_num: course.stat_info.student_num,
            auto_id: course.auto_id,
            status: course.status
          }
          courseStorage.push(temp);
        }
        // 如果要绑定新加载的数据，那么需要将新数据和旧数据绑定在一起
        var courseList = this.data.courseList;
        var totalCourseList = [];
        if (!this.data.isEmpty) {
          totalCourseList = courseList.concat(courseStorage);
        } else {
          totalCourseList = courseStorage;
          this.setData({ 'isEmpty': false })
        }
        var last_id = totalCourseList[totalCourseList.length - 1].auto_id;
        this.setData({
          'courseList': totalCourseList,
          'getCourseListByStudentParams.last_id': last_id,
        });
      }
      // 判断是否有课程信息
      var filter = this.data.getCourseListByStudentParams.filter;
      var courseList = this.data.courseList;
      // 判断filter是否为空
      var filterEmpty = true;
      for (var prop in filter) {
        if (filter.hasOwnProperty(prop)) {
          filterEmpty = false;
        } else {
          filterEmpty = true;
        }
      }
      if (filterEmpty && courseList.length == 0) {
        this.setData({ 'hasCourse': false })
      } else {
        this.setData({ 'hasCourse': true })
      }

      //判断没有相关筛选条件的课程
      if (filterEmpty == false) {
        if (courseList.length == 0) {
          this.setData({ 'noRelativeCourse': true })
        } else {
          this.setData({ 'noRelativeCourse': false })
        }
      } else {
        this.setData({ 'noRelativeCourse': false })
      }

      // 判断是否现在加载更多、无更多dna信息
      if (currentCourseData.length != 0) {
        if (currentCourseData.length == 100) {
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
      if (currentCourseData.length == 0 && courseList.length != 0) {
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
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
    wx.hideNavigationBarLoading();
  },
  // 根据网络情况，判断是否调用获取指定老师课程列表
  getCourseListByTeacher: function () {
    util.checkNetWorkStatus(this.launchGetCourseListByTeacher);
  },
  // 获取指定老师课程列表
  launchGetCourseListByTeacher() {
    var getCourseListByTeacherParams = this.data.getCourseListByTeacherParams;
    var token = wx.getStorageSync('token');
    var filter = JSON.stringify(getCourseListByTeacherParams.filter);
    var checksum = token + filter + getCourseListByTeacherParams.last_id + app.globalData.SALT;
    this.setData({
      'getCourseListByTeacherParams.token': token,
      'getCourseListByTeacherParams.filter': filter,
      'getCourseListByTeacherParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/courses/get_course_list_by_teacher';
    util.http(url, getCourseListByTeacherParams, this.getCourseListByTeacherCb);
  },
  // 获取指定老师课程列表回调函数
  getCourseListByTeacherCb(res) {
    // 反序列化，便于再次发起申请再次序列化
    var filter = JSON.parse(this.data.getCourseListByTeacherParams.filter);
    this.setData({
      'getCourseListByTeacherParams.filter': filter
    })
    if (res.status == 0) {
      var currentCourseData = res.result.courses;
      this.setData({ 'currentCourseData': currentCourseData });
      // 当返回数据不为空数组时，对数据进行处理
      if (currentCourseData.length != 0) {
        var courseStorage = [];
        for (var i = 0; i < currentCourseData.length; i++) {
          var course = currentCourseData[i];
          var course_desc = course.course_info.course_desc;
          var school = course.course_info.teacher_info.school;
          if (school.length > 6) {
            school = school.substring(0, 6) + "..."
          }
          var grade = course.course_info.teacher_info.grade;
          if (grade.length > 6) {
            grade = grade.substring(0, 6) + "..."
          }
          if (course_desc.length >= 30) {
            course_desc = course_desc.substring(0, 30) + '...'
          }
          var temp = {
            subject_grade: course.course_info.grade_info.grade_name + course.course_info.subject_info.subject_name,
            grade_id: course.course_info.grade_info.grade_id,
            subject_id: course.course_info.subject_info.subject_id,
            add_time: util.formatTime(course.add_time * 1000),
            course_name: course.course_info.course_name,
            course_desc: course_desc,
            student_num: course.stat_info.student_num,
            course_id: course.course_id,
            auto_id: course.auto_id,
            head: course.course_info.teacher_info.head,
            real_name: course.course_info.teacher_info.real_name,
            school: school,
            grade: grade
          }
          courseStorage.push(temp);
        }
        // 如果要绑定新加载的数据，那么需要将新数据和旧数据绑定在一起
        var courseList = this.data.courseList;
        var totalCourseList = [];
        if (!this.data.isEmpty) {
          totalCourseList = courseList.concat(courseStorage);
        } else {
          totalCourseList = courseStorage;
          this.setData({ 'isEmpty': false })
        }
        var last_id = totalCourseList[totalCourseList.length - 1].auto_id;
        this.setData({
          'courseList': totalCourseList,
          'getCourseListByTeacherParams.last_id': last_id,
        });
      }
      // 判断是否有课程信息
      var filter = this.data.getCourseListByTeacherParams.filter;
      var courseList = this.data.courseList;
      // 判断filter是否为空
      var filterEmpty = true;
      for (var prop in filter) {
        if (filter.hasOwnProperty(prop)) {
          filterEmpty = false;
        } else {
          filterEmpty = true;
        }
      }
      if (filterEmpty && courseList.length == 0) {
        this.setData({ 'hasCourse': false })
      } else {
        this.setData({ 'hasCourse': true })
      }

      //判断没有相关筛选条件的课程
      if (filterEmpty == false) {
        if (courseList.length == 0) {
          this.setData({ 'noRelativeCourse': true })
        } else {
          this.setData({ 'noRelativeCourse': false })
        }
      } else {
        this.setData({ 'noRelativeCourse': false })
      }

      // 判断是否现在加载更多、无更多dna信息
      if (currentCourseData.length != 0) {
        if (currentCourseData.length == 20) {
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
      if (currentCourseData.length == 0 && courseList.length != 0) {
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
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
  },
  // 弹出年级模态框
  popGradeModal: function () {
    this.setData({
      'gradeModal': !this.data.gradeModal,
    });
    if (this.data.gradeModal) {
      this.setData({
        'backgroundModal': true,
        'pageOverflow': true,
        'subjectModal': false,
        'filterModal': false
      })
    } else {
      this.setData({
        'pageOverflow': false,
      })
    }
    this.cancelBgModal();
  },
  // 弹出学科模态框
  popSubjectModal: function () {
    this.setData({
      'subjectModal': !this.data.subjectModal,
    });
    if (this.data.subjectModal) {
      this.setData({
        'backgroundModal': true,
        'pageOverflow': true,
        'gradeModal': false,
        'filterModal': false
      })
    } else {
      this.setData({
        'pageOverflow': false,
      })
    }
    this.cancelBgModal();
  },
  // 弹出筛选模态框
  popFilterModal: function () {
    this.setData({
      'filterModal': !this.data.filterModal,
    });
    if (this.data.fiterModal) {
      this.setData({
        'backgroundModal': true,
        'pageOverflow': true,
        'gradeModal': false,
        'subjectModal': false
      })
    } else {
      this.setData({
        'pageOverflow': false,
      })
    }
    this.cancelBgModal();
  },
  // 取消背景模态框
  cancelBgModal() {
    // 有一个模态框是显示的，背景模态框显示
    if (this.data.subjectModal || this.data.gradeModal || this.data.filterModal) {
      this.setData({
        'backgroundModal': true,
        'pageOverflow': true
      })
    } else {
      this.setData({
        'backgroundModal': false,
        'pageOverflow': false
      })
    }
  },
  // 取消所有模态框
  cancelModal: function () {
    this.setData({
      'backgroundModal': false,
      'subjectModal': false,
      'gradeModal': false,
      'filterModal': false,
      'pageOverflow': false
    })
  },
  // 获得年级并发起接口请求
  getTeaCourseGrade: function (e) {
    // 数据加载中
    if (wx.showLoading) { wx.showLoading({ title: '正在加载中...' }) }
    // 更改界面显示和设置filter里面的参数，发起接口请求
    var index = e.currentTarget.dataset.index;
    var name = e.currentTarget.dataset.name;
    var gradeId = e.currentTarget.dataset.gradeId;
    this.setData({
      'courseGrades.index': index,
      'courseGrades.currentName': name,
      'getCourseListByTeacherParams.filter.grade_id': gradeId,
      'getCourseListByTeacherParams.last_id': 0,
      'courseList': [],
      'isEmpty': true,
      'loadingMore': false,
      'noMore': false,
      'noRelativeCourse': false
    })
    this.getCourseListByTeacher();
    this.cancelModal();
  },
  // 获得学科并发起接口请求
  getTeaCourseSubject: function (e) {
    if (wx.showLoading) { wx.showLoading({ title: '正在加载中...' }) }
    // 更改界面显示和设置filter里面的参数，发起接口请求
    var index = e.currentTarget.dataset.index;
    var name = e.currentTarget.dataset.name;
    var subjectId = e.currentTarget.dataset.subjectId;
    this.setData({
      'courseSubjects.index': index,
      'courseSubjects.currentName': name,
      'getCourseListByTeacherParams.filter.subject_id': subjectId,
      'getCourseListByTeacherParams.last_id': 0,
      'courseList': [],
      'isEmpty': true,
      'loadingMore': false,
      'noMore': false,
      'noRelativeCourse': false
    })
    this.getCourseListByTeacher();
    this.cancelModal();
  },
  // 筛选模态框的grade选择项（多选）
  getChooseGrade: function (e) {
    var index = e.currentTarget.dataset.index;
    var gradesArray = this.data.courseGrades.array;
    gradesArray.forEach(function (item, i, array) {
      if (index == i) {
        item.active = !item.active;
      } else {
        item.active = false;
      }
    })
    this.setData({
      'courseGrades.array': gradesArray,
    })
  },
  // 筛选模态框的subject选择项（多选）
  getChooseSubject: function (e) {
    var index = e.currentTarget.dataset.index;
    var subjectArray = this.data.courseSubjects.array;
    subjectArray.forEach(function (item, i, array) {
      if (index == i) {
        item.active = !item.active;
      } else {
        item.active = false;
      }
    })
    this.setData({
      'courseSubjects.array': subjectArray,
    });
  },
  // 筛选模态框的申请状态选择项（单选）
  getChooseJoinStatus: function (e) {
    var index = e.currentTarget.dataset.index;
    var joinStatus = this.data.joinStatus.array;
    joinStatus.forEach(function (item, i, array) {
      if (index == i) {
        item.active = !item.active
      } else {
        item.active = false;
      }
    })
    this.setData({
      'joinStatus.array': joinStatus,
    })
  },
  // 切换choose里面grade的下箭头显示更多
  toggleGradeMore: function () {
    this.setData({
      'moreGrade': !this.data.moreGrade
    })
  },
  // 切换choose里面subject的下箭头显示更多
  toggleSubjectMore: function () {
    this.setData({
      'moreSubject': !this.data.moreSubject
    })
  },
  // 清空choose里面的filter里面的值
  emptyFilterDna: function (e) {
    // 将所有的active重置为0
    this.chooseActiveFalse();
  },
  // 点击确认发起的筛选接口请求
  filterDna: function (e) {
    // 数据加载中
    if (wx.showLoading) { wx.showLoading({ title: '正在加载中...' }) }
    // 设置接口参数filter，发起接口请求
    // 年级
    var gradeArray = this.data.courseGrades.array;
    var grade_ids;
    for (let i = 0; i < gradeArray.length; i++) {
      if (gradeArray[i].active) {
        grade_ids = gradeArray[i].id
      }
    }

    // 科目
    var subjectArray = this.data.courseSubjects.array;
    var subject_ids;
    for (let i = 0; i < subjectArray.length; i++) {
      if (subjectArray[i].active) {
        subject_ids = subjectArray[i].id
      }
    }

    // 时间
    var joinStatusArray = this.data.joinStatus.array;
    var join_status;
    for (let i = 0; i < joinStatusArray.length; i++) {
      if (joinStatusArray[i].active) {
        join_status = joinStatusArray[i].join_status
      }
    }

    this.setData({
      'getCourseListByStudentParams.filter.subject_id': subject_ids,
      'getCourseListByStudentParams.filter.grade_id': grade_ids,
      'getCourseListByStudentParams.filter.join_status': join_status,
      'isEmpty': true,
      'loadingMore': false,
      'noMore': false,
      'getCourseListByStudentParams.last_id': 0,
      'noRelativeCourse': false,
      'courseList': []
    })
    this.getCourseListByStudent();
    this.cancelModal();
  },
  // 跳转到创建课程页面
  toCreateCourse: function () {
    wx.navigateTo({
      url: '../createCourse/createCourse',
    })
  },
  // 跳转到课程详情页面
  toCourseDetail: function (e) {
    var courseId = e.currentTarget.dataset.courseId;
    wx.setStorageSync('course_id', courseId);
    wx.navigateTo({
      url: '../courseDetail/courseDetail?courseId=' + courseId,
    })
  },
  // 学生端跳转到搜索课程页面
  toSearchCourse: function (e) {
    wx.navigateTo({
      url: '../searchCourse/searchCourse',
    })
  },
  // 课程简介的展开和收缩
  showMoreCourseDesc: function () {
    this.setData({
      moreCourseDesc: !this.data.moreCourseDesc
    })
  },
  // 跳转到申请管理页面
  toTeaManageCourseByStudentRequest: function () {
    wx.navigateTo({
      url: '../manageCourseByStudentRequest/manageCourseByStudentRequest',
    })
  },
  // 扫码二维码功能
  scanCode: function () {
    wx.scanCode({
      success: (res) => {
        var result = JSON.parse(res.result);
        var action = result.action;
        var courseId = result.data;
        //请求加入课程
        if(action == 1)
        {
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
      },
      fail(res){
        console.log(res)
      }
    })
  },
  // 申请加入课程回调函数
  requestAddCourseCb(res) {
    if (res.status == 0) {
      wx.showToast({
        title: '正在申请中，待老师同意',
      });
      // 重新发起课程管理接口请求
      var that = this;
      setTimeout(function () {
        that.setData({
          'isEmpty': true,
          'loadingMore': false,
          'noMore': false,
          'getCourseListByStudentParams.last_id': 0,
          'getCourseListByStudentParams.filter': {},
          'noRelativeCourse': false,
          'courseList': []
        })
        that.getCourseListByStudent();
        that.cancelModal();
      }, 2000)
    } else if (res.status == -3) {
      util.reLogin();
    } else {
      wx.showToast({
        title: res.message,
        icon: 'loading'
      })
    }
  },
})