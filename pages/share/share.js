Page({
  toLogin: function () {
    wx.navigateTo({ url: '../login/login' })
  },
  onShareAppMessage: function () {
    return {
      title: '掌握学科思维，轻松快乐学习！',
      src: '/pages/share/share'
    }
  },
})