//1. 精准时间格式化
function formatTime(time) {
  var date = new Date(time);
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()

  var hour = date.getHours()
  var minute = date.getMinutes()
  var second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('.') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

//2. 发起https的post请求
function http(url, data, callBack) {
  wx.request({
    url: url,
    data: data,
    method: 'POST',
    header: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    success: (res) => {
      callBack(res.data);
    },
    fail: () => {
      wx.showToast({
        title: '网络异常，请稍后重试',
        icon: 'loading',
        duration: 2000,
      })
    }
  })
}
//3. token失效，重新登录
function reLogin(statu) {
  //token失效,请重新登录
  wx.showModal({
    title: '提示',
    content: '登录已失效,请重新登录',
    showCancel: false,
    confirmText: "重新登录",
    success: function (res) {
      if (res.confirm) {
        console.log('用户点击确定')
        //跳到登录界面
        wx.redirectTo({
          url: '../login/login',
        })
        //清空token
        wx.clearStorageSync();
      }
    }
  })
}

function tokenInvalidation() {
  wx.showToast({
    title: '登录失效，请重新登录',
    icon: 'loading'
  })
  setTimeout(function () {
    wx.redirectTo({ url: '../login/login' });
  }, 1000)
}

//4. 发起uploadFile串行上传请求
function uploadFile(url, arr, formData, callBack) {
  if (arr.length != 0) {
    wx.uploadFile({
      url: url,
      filePath: arr[0],
      name: 'file',
      formData: formData,
      success: (res) => {
        var data = JSON.parse(res.data);
        callBack(data);
        arr.splice(0, 1);
        uploadFile(url, arr, formData, callBack)
      },
      fail: (res) => {
        console.log(res);
      }
    })
  }
}

//5. 预览图片
function previewImg(e) {
  var src = e.currentTarget.dataset.src;
  wx.previewImage({
    current: src,
    urls: [src]
  })
}

//6. 删除数组中指定项
function remove(arr, value) {
  var len = arr.length;
  var newArr = [];
  for (var i = 0; i < len; i++) {
    if (arr[i] != value) {
      newArr.push(arr[i])
    }
  }
  return newArr;
}

//7. 格式化日期
function dateFormat(time, sign) {
  var t = new Date(time);
  //如果月份和日期是0~9,前面补0
  var tf = function (i) {
    return i > 9 ? i : "0" + i
  };
  var year = t.getFullYear();
  var month = tf(t.getMonth() + 1);
  var date = tf(t.getDate());
  return year + sign + month + sign + date;
}

// 8.学生端dna返回信息格式化
function formatStuDna(res) {
  var course_name = res.course_name;
  if (course_name.length >= 16) {
    course_name = course_name.substring(0, 16) + "...";
  }
  var temp = {
    add_time: this.dateFormat(res.add_time * 1000, '.'),//时间格式化
    comment_num: res.comment_num,
    course_id: res.course_id,
    course_name: course_name,
    dna_id: res.dna_id,
    dna_name: res.dna_name,
    dna_type_id: res.dna_type_id,
    dna_type_name: res.dna_type_name,
    images: res.images,
    is_confirm: res.is_confirm,
    student_id: res.student_id,
    update_time: this.dateFormat(res.update_time * 1000, '.'),//时间格式化
    voices: res.voices,
  };
  return temp;
}

// 9.老师端dna返回信息格式化
function formatTeaDna(res) {
  var course_name = res.course_name;
  // 课程信息
  if (course_name.length >= 16) {
    course_name = course_name.substring(0, 16) + "...";
  }
  // 学校信息
  var school = res.student.school
  if (school.length > 6) {
    school = school.substring(0, 6) + "..."
  }
  // 班级信息
  var grade = res.student.grade;
  if (grade.length > 5) {
    grade = grade.substring(0, 5) + "..."
  }
  var temp = {
    add_time: this.dateFormat(res.add_time * 1000, '.'),//时间格式化
    comment_num: res.comment_num,
    course_id: res.course_id,
    course_name: course_name,
    dna_id: res.dna_id,
    dna_name: res.dna_name,
    dna_type_id: res.dna_type_id,
    dna_type_name: res.dna_type_name,
    images: res.images,
    is_confirm: res.is_confirm,
    student_id: res.student_id,
    update_time: this.dateFormat(res.update_time * 1000, '.'),//时间格式化
    voices: res.voices,
    head: res.student.head,
    school: school,
    grade: grade,
    real_name: res.student.real_name
  };
  return temp;
}

// 检查对象是否是空对象
function isEmpty(obj) {
  for (var prop in obj) {
    if (typeof obj[prop] == 'string') {//判断是字符串类型
      if (obj[prop]) {
        return false;
      }
    } else if (typeof obj[prop] == 'object') {//判断是对象类型
      if (Object.prototype.toString.call(obj[prop]) == '[object Array]') {//是数组类型
        if (obj[prop].length != 0) {
          return false
        }
      }
    } else if (typeof obj[prop] == 'number') {//判断是num类型，主要针对的是is_commented
      if (obj[prop] == 0 || obj[prop] == 1) {
        return false
      }
    }
  }
  return true;
}

// 简单检查对象是否为空
function isEmptySimple(obj){
  for(var prop in obj){
    if(obj.hasOwnProperty(prop)){
      return false
    }
  }
  return JSON.stringify(obj)===JSON.stringify({});
}

// 检查网络状态
function checkNetWorkStatus(callBack) {
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
        callBack();
      }
    }
  })
}
module.exports = {
  formatTime: formatTime,
  http: http,
  reLogin: reLogin,
  tokenInvalidation: tokenInvalidation,
  uploadFile: uploadFile,
  previewImg: previewImg,
  remove: remove,
  dateFormat: dateFormat,
  formatStuDna: formatStuDna,
  formatTeaDna: formatTeaDna,
  isEmpty: isEmpty,
  isEmptySimple: isEmptySimple,
  checkNetWorkStatus: checkNetWorkStatus
}


