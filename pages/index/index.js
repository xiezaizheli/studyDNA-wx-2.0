var md5 = require("../../utils/MD5.js");
var util = require('../../utils/util.js');
var app = getApp();

Page({
  data: {
    netWorkStatus: true,
    loadingPage: true,
    userType: '',
    hasDna: '', //是否有DNA数据
    dnaList: [], //dna列表信息
    currentDnaData: [], //当前返回的DNA信息
    isEmpty: true, //dnalist是否为空
    loadingMore: false, // 加载更多
    noMore: false, //无更多DNA数据
    noSelectDna: false,//没有相关筛选条件的DNA
    backgroundModal: false,
    timeModal: false,
    filterModal: false,
    pageOverflow: false,//防止底部页面滚动
    moreSubject: false,//查看更多
    moreDnaTypes: false,
    moreGrade: false,
    voiceControl: false,
    stuInfo: { // 学生信息
      head: '',
      realName: '',
      school: '',
      grade: ''
    },
    time: {
      array: [
        {
          'last_days': '1',
          'name': '今天'
        },
        {
          'last_days': '7',
          'name': '近一周'
        },
        {
          'last_days': '30',
          'name': '近一个月'
        },
        {
          'last_days': '365',
          'name': '一年以内'
        },

      ],
      currentName: '时间',
      index: 0,
    },
    dnaTypes: {//DNA类别
      array: [],
      currentName: '',
    },
    courseSubjects: {//科目分类
      array: [],
      currentName: '科目',
      index: 0,
    },
    courseGrades: { //年级分类
      array: [],
      currentName: '',
      index: 0,
    },
    toggleProperty: {
      navbar: [
        {
          'is_commented': undefined,
          'name': '所有',
          'color': '#333'
        },
        {
          'is_commented': 0,
          'name': '未批阅',
          'color': '#ffbf06'
        },
        {
          'is_commented': 1,
          'name': '已批阅',
          'color': '#333'
        }
      ],
      currentTab: 0
    },
    getDnaListByStudentParams: { //获取学生DNA信息列表
      token: '',
      filter: {},
      last_id: '',
      checksum: ''
    },
    getDnaListByTeacherParams: { //获取老师DNA信息列表
      token: '',
      filter: {},
      last_id: 0,
      checksum: ''
    },
    delCourseDnaParams: {//删除DNA接口请求
      token: '',
      dna_id: '',
      checksum: ''
    },
  },
  // 监听页面加载
  onLoad: function (options) {
    // 根据token值，判断是否进行页面跳转
    if (!wx.getStorageSync('token')) {
      util.tokenInvalidation();
    } else {
      // 获得缓存中的科目，DNA类别，年级等数据
      this.setData({
        'dnaTypes.array': wx.getStorageSync('dna_type_list'),
        'courseSubjects.array': wx.getStorageSync('course_subject_list'),
        'courseGrades.array': wx.getStorageSync('course_grade_list')
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
            this.getDnaListByStudent();
          } else if (this.data.userType == 1) { //老师端
            this.getDnaListByTeacher();
          }
        }
      }
    })
  },
  // 获取学生信息
  onShow: function (e) {
    this.getStuInfo();
  },
  onHide: function () {
    this.stopVoice();
  },
  // 分享页面
  onShareAppMessage: function () {
    return {
      title: '掌握学科思维，轻松快乐学习！',
      src: '/pages/share/share'
    }
  },
  // 获取学生信息并对数据进行处理
  getStuInfo() {
    var school = wx.getStorageSync('school');
    if (school.length > 6) {
      school = school.substring(0, 6) + "..."
    }
    var grade = wx.getStorageSync('grade');
    if (grade.length > 5) {
      grade = grade.substring(0, 5) + "..."
    }
    this.setData({
      'stuInfo.head': wx.getStorageSync('head'),
      'stuInfo.realName': wx.getStorageSync('real_name'),
      'stuInfo.school': school,
      'stuInfo.grade': grade
    })
  },
  // 页面上拉触底事件
  onReachBottom: function (e) {
    util.checkNetWorkStatus(this.reachBottomCb);
  },
  reachBottomCb() {
    var userType = this.data.userType;
    // 如果当前返回的数据没有10条，说明没有相关的数据
    var currentDnaData = this.data.currentDnaData;
    if (currentDnaData != null) { // 如果当前返回的不是空数据
      if (currentDnaData.length == 10) {
        if (userType == 0) {
          this.getDnaListByStudent();
        } else if (userType == 1) {
          this.getDnaListByTeacher();
        }
        wx.showNavigationBarLoading();
      }
    }
  },
  // 将每一个choose里面的选择项都添加active属性
  chooseActiveFalse(e) {
    var subjectArray = this.data.courseSubjects.array;
    var gradeArray = this.data.courseGrades.array;
    var dnaTypesArray = this.data.dnaTypes.array;
    var timeArray = this.data.time.array;
    var commentArray = this.data.toggleProperty.navbar;
    this.forEachActive(subjectArray);
    this.forEachActive(gradeArray);
    this.forEachActive(dnaTypesArray);
    this.forEachActive(timeArray);
    this.forEachActive(commentArray)
    this.setData({
      'courseSubjects.array': subjectArray,
      'dnaTypes.array': dnaTypesArray,
      'courseGrades.array': gradeArray,
      'time.array': timeArray,
      'toggleProperty.navbar': commentArray
    });
    // 第一项的navbar是active
    this.setData({
      'toggleProperty.navbar[0].active': true
    })
  },
  // 遍历
  forEachActive(arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i].active = false;
    }
  },
  // 获取指定学生的DNA列表
  getDnaListByStudent: function (e) {
    // 检查网络状态，发起接口请求
    util.checkNetWorkStatus(this.launchGetDnaByStudent)
  },
  launchGetDnaByStudent() {
    // 请求参数token,filter,last_id,checksum
    var getDnaListByStudentParams = this.data.getDnaListByStudentParams;
    var token = wx.getStorageSync('token');
    var filter = JSON.stringify(getDnaListByStudentParams.filter);
    var checksum = token + filter + getDnaListByStudentParams.last_id + app.globalData.SALT;
    this.setData({
      'getDnaListByStudentParams.token': token,
      'getDnaListByStudentParams.filter': filter,
      'getDnaListByStudentParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/dnas/get_dna_list_by_student';
    util.http(url, this.data.getDnaListByStudentParams, this.getDnaListByStudentCb);
  },
  // 获取指定学生DNA列表回调函数
  getDnaListByStudentCb(res) {
    // 将filter反序列化
    var filter = JSON.parse(this.data.getDnaListByStudentParams.filter);
    this.setData({
      'getDnaListByStudentParams.filter': filter
    })
    // 将time的值实时更新到下拉框中;
    if (filter.last_days) {
      var that = this;
      this.data.time.array.forEach(function (item, i, array) {
        if (item.last_days == filter.last_days) {
          that.setData({
            'time.currentName': item.name
          })
        }
      })
    } else {
      this.setData({
        'time.currentName': '时间'
      })
    }
    // 如果返回结果为真
    if (res.status == 0) {
      var currentDnaData = res.result;
      this.setData({ 'currentDnaData': currentDnaData });
      // 当前返回数据不为空，对数据进行处理
      if (currentDnaData != null) {
        //对返回的数据做处理
        var dnaStorage = [];
        for (var i = 0; i < currentDnaData.length; i++) {
          var dna = currentDnaData[i];
          var temp = util.formatStuDna(dna);
          temp.isPlaying = false;
          dnaStorage.push(temp);
        }
        // 如果要绑定新加载的数据，那么需要将新数据和旧数据绑定在一起
        var dnaList = this.data.dnaList;
        var totalDnaList = [];
        if (!this.data.isEmpty) {
          totalDnaList = dnaList.concat(dnaStorage)
        } else {
          totalDnaList = dnaStorage;
          this.setData({ 'isEmpty': false })
        }
        var last_id = totalDnaList[totalDnaList.length - 1].dna_id;
        this.setData({
          'dnaList': totalDnaList,
          'getDnaListByStudentParams.last_id': last_id,
        });
      }
      // 判断是否有dna信息,dnaList为空，filter也为空
      var filter = this.data.getDnaListByStudentParams.filter;
      var dnaList = this.data.dnaList;
      var filterEmpty = util.isEmpty(filter);
      if (filterEmpty && dnaList.length == 0) {
        this.setData({ 'hasDna': false })
      } else {
        this.setData({ 'hasDna': true })
      }
      //判断没有相关筛选条件的DNA
      if (filterEmpty == false) {
        if (dnaList.length == 0) {
          this.setData({ 'noSelectDna': true })
        } else {
          this.setData({ 'noSelectDna': false })
        }
      } else {
        this.setData({ 'noSelectDna': false })
      }
      // 判断是否现在加载更多、无更多dna信息
      if (currentDnaData != null) {
        if (currentDnaData.length == 10) {
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
      if (currentDnaData == null && dnaList.length != 0) {
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
    // 数据设置完成之后，隐藏空白页面，并隐藏加载条
    wx.hideNavigationBarLoading();
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) {
      wx.hideLoading();
    }
  },
  // 获取指定老师的DNA列表
  getDnaListByTeacher: function () {
    //发起接口请求
    util.checkNetWorkStatus(this.launchGetDnaListByTeacher);
  },
  launchGetDnaListByTeacher() {
    //请求参数token,filter,last_id,checksum
    var getDnaListByTeacherParams = this.data.getDnaListByTeacherParams;
    var token = wx.getStorageSync('token');
    var filter = JSON.stringify(getDnaListByTeacherParams.filter);
    var checksum = token + filter + getDnaListByTeacherParams.last_id + app.globalData.SALT;
    this.setData({
      'getDnaListByTeacherParams.token': token,
      'getDnaListByTeacherParams.filter': filter,
      'getDnaListByTeacherParams.checksum': md5(checksum)
    });
    var url = app.globalData.baseUrl + '/dnas/get_dna_list_by_teacher';
    util.http(url, this.data.getDnaListByTeacherParams, this.getDnaListByTeacherCb);
  },
  // 获取指定老师的DNA列表回调函数
  getDnaListByTeacherCb(res) {
    // 将filter反序列化成对象
    var filter = JSON.parse(this.data.getDnaListByTeacherParams.filter);
    this.setData({
      'getDnaListByTeacherParams.filter': filter
    })
    // 将is_commented的值实时更新到navbar中;
    var that = this;
    this.data.toggleProperty.navbar.forEach(function (item, i, array) {
      if (item.is_commented == filter.is_commented) {
        that.setData({
          'toggleProperty.currentTab': i
        })
      }
    })
    if (res.status == 0) {
      var currentDnaData = res.result;
      this.setData({ 'currentDnaData': currentDnaData });
      // 当前返回数据不为空
      if (currentDnaData != null) {
        //对返回的数据做处理
        var dnaStorage = [];
        for (var i = 0; i < currentDnaData.length; i++) {
          var dna = currentDnaData[i];
          var temp = util.formatTeaDna(dna);
          temp.isPlaying = false;
          dnaStorage.push(temp);
        }
        // 如果要绑定新加载的数据，那么需要将新数据和旧数据绑定在一起
        var dnaList = this.data.dnaList;
        var totalDnaList = [];
        if (!this.data.isEmpty) {
          totalDnaList = dnaList.concat(dnaStorage)
        } else {
          totalDnaList = dnaStorage;
          this.setData({ 'isEmpty': false })
        }
        var last_id = totalDnaList[totalDnaList.length - 1].dna_id;
        this.setData({
          'dnaList': totalDnaList,
          'getDnaListByTeacherParams.last_id': last_id,
        });
        wx.hideNavigationBarLoading();
      }
      // 判断是否有dna信息,dnaList为空，filter也为空
      var filter = this.data.getDnaListByTeacherParams.filter;
      var dnaList = this.data.dnaList;
      var filterEmpty = util.isEmpty(filter);
      if (filterEmpty && dnaList.length == 0) {
        this.setData({ 'hasDna': false })
      } else {
        this.setData({ 'hasDna': true })
      }
      //判断没有相关筛选条件的DNA
      if (filterEmpty == false) {
        if (dnaList.length == 0) {
          this.setData({ 'noSelectDna': true })
        } else {
          this.setData({ 'noSelectDna': false })
        }
      } else {
        this.setData({ 'noSelectDna': false })
      }

      // 判断是否现在加载更多、无更多dna信息
      if (currentDnaData != null) {
        if (currentDnaData.length == 10) {
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
      if (currentDnaData == null && dnaList.length != 0) {
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
    // 数据设置完成之后，隐藏空白页面，并隐藏加载条
    wx.hideNavigationBarLoading();
    this.setData({ 'loadingPage': false });
    if (wx.hideLoading) wx.hideLoading();
  },
  // 老师端顶部的导航条切换
  navToggle: function (e) {
    //数据加载中
    if (wx.showLoading) wx.showLoading({ title: '正在加载中...' })
    // 将所有的参数归为初始状态，将is_commented调整为激活
    this.setData({
      'getDnaListByTeacherParams.filter': {},
    })
    this.chooseActiveFalse();

    // 更改active的状态
    var index = e.currentTarget.dataset.index;
    var commentArray = this.data.toggleProperty.navbar;
    var is_commented;
    commentArray.forEach(function (item, i, array) {
      if (index == i) {
        item.active = true;
        is_commented = item.is_commented;
      } else {
        item.active = false
      }
    });

    // 设置参数，发起接口请求
    this.setData({
      'toggleProperty.currentTab': index,
      'toggleProperty.navbar': commentArray,
      'getDnaListByTeacherParams.filter.is_commented': commentArray[index].is_commented,
      'getDnaListByTeacherParams.last_id': 0,
      'dnaList': [],
      'isEmpty': true,
      'loadingMore': false,
      'noMore': false,
      'noSelectDna': false,
    });
    this.getDnaListByTeacher();
    this.stopVoice();
  },
  // 弹出时间模态框
  popTimeModal: function () {
    this.setData({
      'timeModal': !this.data.timeModal,
    });
    if (this.data.timeModal) {
      this.setData({
        'backgroundModal': true,
        'pageOverflow': true,
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
    if (this.data.filterModal) {
      this.setData({
        'backgroundModal': true,
        'pageOverflow': true,
        'timeModal': false
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
    if (this.data.timeModal || this.data.filterModal) {
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
      'timeModal': false,
      'filterModal': false,
      'pageOverflow': false
    })
  },
  // 获得时间信息并发起接口请求
  getStuTime: function (e) {
    // 数据加载中
    if (wx.showLoading) { wx.showLoading({ title: '正在加载中...' }) }
    // 更改界面显示和设置filter里面的参数，发起接口请求
    var index = e.currentTarget.dataset.index;
    var name = e.currentTarget.dataset.name;
    // 重置filter的状态
    this.setData({
      'getDnaListByStudentParams.filter': {},
    })
    this.chooseActiveFalse();
    // 更改active的状态
    var timeArray = this.data.time.array;
    var lastDays;
    timeArray.forEach(function (item, i, array) {
      if (index == i) {
        item.active = true;
        lastDays = item.last_days;
      } else {
        item.active = false
      }
    });
    this.setData({
      'time.index': index,
      'time.currentName': name,
      'time.array': timeArray,
      'getDnaListByStudentParams.filter.last_days': lastDays,
      'getDnaListByStudentParams.last_id': 0,
      'dnaList': [],
      'isEmpty': true,
      'loadingMore': false,
      'noMore': false,
      'noSelectDna': false,
    })
    this.getDnaListByStudent();
    this.cancelModal();
    this.stopVoice();
  },
  // 筛选模态框的subject选择项（多选）
  getChooseSubject: function (e) {
    var index = e.currentTarget.dataset.index;
    var subjectArray = this.data.courseSubjects.array;
    subjectArray.forEach(function (item, i, array) {
      if (index == i) item.active = !item.active;
    })
    this.setData({
      'courseSubjects.array': subjectArray,
    });
  },
  // 筛选模态框的dnaTypes选择项（多选）
  getChooseDnaTypes: function (e) {
    var index = e.currentTarget.dataset.index;
    // 处理本地数据，给每个数组项添加active属性，值为false
    var dnaTypesArray = this.data.dnaTypes.array;
    dnaTypesArray.forEach(function (item, i, array) {
      if (index == i) item.active = !item.active;
    })
    this.setData({
      'dnaTypes.array': dnaTypesArray,
    })
  },
  // 筛选模态框的grade选择项（多选）
  getChooseGrade: function (e) {
    var index = e.currentTarget.dataset.index;
    var gradesArray = this.data.courseGrades.array;
    gradesArray.forEach(function (item, i, array) {
      if (index == i) item.active = !item.active;
    })
    this.setData({
      'courseGrades.array': gradesArray,
    })
  },
  // 筛选模态框的时间选择项（单选）
  getChooseTime: function (e) {
    var index = e.currentTarget.dataset.index;
    var timeArray = this.data.time.array;
    timeArray.forEach(function (item, i, array) {
      if (index == i) {
        item.active = !item.active
      } else {
        item.active = false;
      }
    })
    this.setData({
      'time.array': timeArray,
    })
  },
  // 筛选模态框的是否批阅状态选择项（单选）
  getCommentStatus: function (e) {
    var index = e.currentTarget.dataset.index;
    var toggleProperty = this.data.toggleProperty.navbar;
    toggleProperty.forEach(function (item, i, array) {
      if (index == i) {
        item.active = !item.active
      } else {
        item.active = false;
      }
    })
    this.setData({
      'toggleProperty.navbar': toggleProperty,
    })
  },
  // 切换choose里面subject的下箭头显示更多
  toggleSubjectMore: function () {
    this.setData({
      'moreSubject': !this.data.moreSubject
    })
  },
  // 切换choose里面dnaTypes的下箭头显示更多
  toggleDnaTypesMore: function () {
    this.setData({
      'moreDnaTypes': !this.data.moreDnaTypes
    })
  },
  // 切换choose里面grade的下箭头显示更多
  toggleGradeMore: function () {
    this.setData({
      'moreGrade': !this.data.moreGrade
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
    // 科目
    var subjectArray = this.data.courseSubjects.array;
    var subject_ids = [];
    for (let i = 0; i < subjectArray.length; i++) {
      if (subjectArray[i].active) {
        subject_ids.push(subjectArray[i].id)
      }
    }

    // 年级
    var gradeArray = this.data.courseGrades.array;
    var grade_ids = [];
    for (let i = 0; i < gradeArray.length; i++) {
      if (gradeArray[i].active) {
        grade_ids.push(gradeArray[i].id)
      }
    }

    // dna类别
    var dnaTypesArray = this.data.dnaTypes.array;
    var dna_type_ids = [];
    for (let i = 0; i < dnaTypesArray.length; i++) {
      if (dnaTypesArray[i].active) {
        dna_type_ids.push(dnaTypesArray[i].id)
      }
    }

    // 时间
    var timeArray = this.data.time.array;
    var last_days;
    for (let i = 0; i < timeArray.length; i++) {
      if (timeArray[i].active) {
        last_days = timeArray[i].last_days
      }
    }

    //是否批阅
    var commentArray = this.data.toggleProperty.navbar;
    var is_commented;
    for (let i = 0; i < commentArray.length; i++) {
      if (commentArray[i].active) {
        is_commented = commentArray[i].is_commented
      }
    }
    // 老师端和学生端公用的参数
    this.setData({
      'getDnaListByStudentParams.last_id': 0,
      'getDnaListByTeacherParams.last_id': 0,
      'dnaList': [],
      'isEmpty': true,
      'loadingMore': false,
      'noMore': false,
      'noSelectDna': false,
    })
    var userType = this.data.userType;
    if (userType == 0) {
      this.setData({
        'getDnaListByStudentParams.filter.subject_ids': subject_ids,
        'getDnaListByStudentParams.filter.dna_type_ids': dna_type_ids,
        'getDnaListByStudentParams.filter.last_days': last_days
      })
      this.getDnaListByStudent();
    } else if (userType == 1) {
      this.setData({
        'getDnaListByTeacherParams.filter.subject_ids': subject_ids,
        'getDnaListByTeacherParams.filter.dna_type_ids': dna_type_ids,
        'getDnaListByTeacherParams.filter.grade_ids': grade_ids,
        'getDnaListByTeacherParams.filter.is_commented': is_commented,
        'getDnaListByTeacherParams.filter.last_days': last_days
      })
      this.getDnaListByTeacher();
    }
    this.cancelModal();
    this.stopVoice();
  },
  // 跳转到新增DNA页面
  toNewDna: function (e) {
    wx.navigateTo({ url: '../newDna/newDna' });
    this.cancelModal();
  },
  // 跳转到修改DNA页面
  toEditDna: function (e) {
    var dataset = e.currentTarget.dataset;
    wx.setStorageSync('dna_id', dataset.dnaId);
    wx.setStorageSync('course_id', dataset.courseId);
    wx.setStorageSync('dna_type_id', dataset.dnaTypeId);
    wx.setStorageSync('dna_name', dataset.dnaName);
    wx.setStorageSync('dna_images', dataset.images);
    wx.setStorageSync('dna_voices', dataset.voices);
    wx.navigateTo({
      url: '../editDna/editDna'
    })
  },
  // 删除DNA
  deleteDna: function (e) {
    var dnaId = e.currentTarget.dataset.dnaId;
    var title = e.currentTarget.dataset.title;
    wx.showModal({
      title: '删除DNA',
      content: '是否删除《 ' + title + ' 》，一旦删除，无法再次找回',
      success: (res) => {
        if (res.confirm) {
          //发起删除DNA接口请求
          var token = wx.getStorageSync('token');
          var checksum = token + dnaId + app.globalData.SALT;
          this.setData({
            'delCourseDnaParams.token': token,
            'delCourseDnaParams.dna_id': dnaId,
            'delCourseDnaParams.checksum': md5(checksum)
          });
          var url = app.globalData.baseUrl + '/dnas/del_course_dna';
          wx.request({
            url: url,
            data: this.data.delCourseDnaParams,
            method: 'POST',
            header: { 'content-type': 'application/x-www-form-urlencoded' },
            success: (res) => {
              // 设置按钮的状态为解禁
              if (res.data.status == 0) {//删除成功
                wx.showToast({
                  title: '删除成功',
                })
                //更新dnaList的数据
                var dnaList = this.data.dnaList;
                dnaList.forEach(function (item, i, array) {
                  if (item.dna_id == dnaId) dnaList.splice(i, 1);
                })
                this.setData({ dnaList: dnaList });
                if (dnaList.length == 0) {
                  this.setData({ 'hasDna': false })
                }
              } else if (res.status == -3) {//token失效
                util.reLogin();
              } else {//未删除成功
                wx.showToast({
                  title: res.data.message,
                  icon: 'loading'
                })
              }
            },
          })
        }
      }
    })
  },
  // 获得DNA批阅信息
  getDnaCommentList: function (e) {
    var dnaId = e.currentTarget.dataset.dnaId;
    wx.setStorageSync('dna_id', dnaId);
    wx.navigateTo({
      url: '../getDnaCommentList/getDnaCommentList?dnaId=' + dnaId,
    })
  },
  // 图片预览
  previewImg: function (e) {
    var src = e.currentTarget.dataset.src;
    var dnaId = e.currentTarget.dataset.dnaId;
    var dnaList = this.data.dnaList;
    var imgListInfo;
    var imgList = [];
    for (var i = 0; i < dnaList.length; i++) {
      if (dnaList[i].dna_id == dnaId) {
        imgListInfo = dnaList[i].images;
      }
    }
    for (let i = 0; i < imgListInfo.length; i++) {
      imgList.push(imgListInfo[i].file_path)
    }
    wx.previewImage({
      current: src,
      urls: imgList
    })
  },
  // 跳转到新增DNA批阅页面（老师端）
  toNewDnaComment: function (e) {
    var dnaId = e.currentTarget.dataset.dnaId;
    wx.setStorageSync('dna_id', dnaId);
    wx.navigateTo({
      url: '../newDnaComment/newDnaComment?dnaId=' + dnaId,
    })
  },
  // 跳转到课程管理页面
  toManageCourse: function () {
    wx.switchTab({
      url: '../manageCourse/manageCourse',
    })
  },
  // 语音切换
  toggleVoice: function (e) {
    var index = e.currentTarget.dataset.index;
    var dnaList = this.data.dnaList;
    for (var i = 0; i < dnaList.length; i++) {
      if (index == i) {
        dnaList[i].isPlaying = !dnaList[i].isPlaying;
        if (dnaList[i].isPlaying) {
          this.stopVoice();
          dnaList[index].isPlaying = true;
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
        dnaList[i].isPlaying = false;
      }
    }
    this.setData({ 'dnaList': dnaList });
  },
  // 下载语音
  downloadFile(index) {
    var dnaList = this.data.dnaList
    wx.downloadFile({
      url: dnaList[index].voices[0].file_path,
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
    var dnaList = this.data.dnaList;
    wx.playVoice({
      filePath: voice,
      complete: (res) => {
        dnaList[index].isPlaying = false;
        this.setData({
          'voiceControl': false,
          'dnaList': dnaList
        });
      },
      fail: (res) => {
        console.log(res);
      }
    })
    dnaList[index].isPlaying = true;
    this.setData({
      'voiceControl': true,
      'dnaList': dnaList
    });
  },
  // 停止语音播放
  stopVoice() {
    // audio关闭，停止语音播放,当前dnaList的isPlaying变为false
    var dnaList = this.data.dnaList;
    dnaList.forEach((item, i, array) => {
      item.isPlaying = false;
    })
    this.setData({
      'voiceControl': false,
      'dnaList': dnaList
    });
    wx.stopVoice();
  }
})