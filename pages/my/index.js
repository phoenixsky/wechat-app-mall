const app = getApp()
const CONFIG = require('../../config.js')
const WXAPI = require('../../utils/api')
const AUTH = require('../../utils/auth')
const TOOLS = require('../../utils/tools.js')

Page({
	data: {
    wxlogin: true,
    user : null,
    balance:0.00,
    freeze:0,
    score:0,
    growth:0,
    score_sign_continuous:0,
    rechargeOpen: false // 是否开启充值[预存]功能
  },
	onLoad() {
    this.setData({
      appVersion: wx.getAccountInfoSync().miniProgram.version || CONFIG.version
    })
	},	
  async onShow() {
    const _this = this

    // this.setData({
    //   version: CONFIG.version,
    // })
    
    this.checkLogin();

    // 获取购物车数据，显示TabBarBadge
    TOOLS.showTabBarBadge();
  },
  async checkLogin(){
    const isLogined = await AUTH.checkHasLogined();
    // 弹出/关闭授权提示框
    this.setData({
      wxlogin: isLogined
    })
    if(isLogined){
      let ret = await WXAPI.getUser(wx.getStorageSync('userId')); 
      if(ret.code == 100){
        this.setData({
          user : ret.data
        })
      }
    }
  },
  aboutUs : function () {
    wx.showModal({
      title: '关于我们',
      content: 'Powered By Phoenixsky',
      showCancel:false
    })
  },
  loginOut(){
    this.setData({
      user:null
    })
    AUTH.loginOut()
    wx.reLaunch({
      url: '/pages/my/index'
    })
  },
  getPhoneNumber: function(e) {
    if (!e.detail.errMsg || e.detail.errMsg != "getPhoneNumber:ok") {
      wx.showModal({
        title: '提示',
        content: e.detail.errMsg,
        showCancel: false
      })
      return;
    }
    WXAPI.bindMobileWxa(wx.getStorageSync('token'), e.detail.encryptedData, e.detail.iv).then(res => {
      if (res.code === 10002) {
        this.setData({
          wxlogin: false
        })
        return
      }
      if (res.code == 0) {
        wx.showToast({
          title: '绑定成功',
          icon: 'success',
          duration: 2000
        })
        // this.getUserApiInfo();
      } else {
        wx.showModal({
          title: '提示',
          content: res.msg,
          showCancel: false
        })
      }
    })
  },
  
  goAsset: function () {
    wx.navigateTo({
      url: "/pages/asset/index"
    })
  },
  goScore: function () {
    wx.navigateTo({
      url: "/pages/score/index"
    })
  },
  goOrder: function (e) {
    wx.navigateTo({
      url: "/pages/order-list/index?type=" + e.currentTarget.dataset.type
    })
  },
  cancelLogin() {
    this.setData({
      wxlogin: true
    })
  },
  goLogin() {
    this.setData({
      wxlogin: false
    })
  },
  processLogin(e) {
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '已取消',
        icon: 'none',
      })
      return;
    }
    AUTH.register(this);
  },
  scanOrderCode(){
    wx.scanCode({
      onlyFromCamera: true,
      success(res) {
        wx.navigateTo({
          url: '/pages/order-details/scan-result?hxNumber=' + res.result,
        })
      },
      fail(err) {
        console.error(err)
        wx.showToast({
          title: err.errMsg,
          icon: 'none'
        })
      }
    })
  },
  clearStorage(){
    wx.clearStorageSync()
    this.loginOut();
    wx.showToast({
      title: '已清除',
      icon: 'success'
    })
  },
})
