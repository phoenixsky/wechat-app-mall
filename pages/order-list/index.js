const wxpay = require('../../utils/pay.js')
const app = getApp()
const WXAPI = require('../../utils/api')
const AUTH = require('../../utils/auth')

Page({
  data: {
    imgPre: WXAPI.imgPre,
    statusType: [{
        status: 9999,
        label: '全部'
      },
      {
        status: 0,
        label: '待付款'
      },
      {
        status: 1,
        label: '待发货'
      },
      {
        status: 2,
        label: '待收货'
      },
      {
        status: 3,
        label: '待评价'
      },
    ],
    status: 9999,
    hasRefund: false,
    badges: [0, 0, 0, 0, 0],
    orderList: null,
    curPage: 1,
  },
  statusTap: function (e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      status
    });
    this.onShow();
  },
  cancelOrderTap: function (e) {
    const that = this;
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确定要取消该订单吗？',
      content: '',
      success: function (res) {
        if (res.confirm) {
          WXAPI.orderClose(wx.getStorageSync('token'), orderId).then(function (res) {
            if (res.code == 0) {
              that.onShow();
            }
          })
        }
      }
    })
  },

  onLoad: function (options) {
    
  },
  onReady: function () {
    // 生命周期函数--监听页面初次渲染完成

  },

  onShow: function () {
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.loadDataList();
      } else {
        wx.showModal({
          title: '提示',
          content: '本次操作需要您的登录授权',
          cancelText: '暂不登录',
          confirmText: '前往登录',
          success(res) {
            if (res.confirm) {
              wx.switchTab({
                url: "/pages/my/index"
              })
            } else {
              wx.navigateBack()
            }
          }
        })
      }
    })
  },
  // 获取订单列表
  async loadDataList(append) {

    const userId = wx.getStorageSync('userId');
    const clientId = wx.getStorageSync('clientId');
    let page = append ? ++ this.data.curPage : 1;

    wx.showLoading({
      title: '正在加载...'+page,
    })

    WXAPI.orderList({
      userId,
      clientId,
    }, page).then(data => {
      this.setData({
        orderList: append ? [...this.data.orderList, ...data] : data
      })
    }, error => {
      if (append) page--;
      wx.showToast({
        icon:'none',
        title: error || '未知错误',
      })
    }).finally(() => {
      wx.hideLoading()
      this.setData({
        curPage:page
      })
    });


  },
  onHide: function () {
    // 生命周期函数--监听页面隐藏

  },
  onUnload: function () {
    // 生命周期函数--监听页面卸载

  },
  onPullDownRefresh: function () {
    // 页面相关事件处理函数--监听用户下拉动作
    this.loadDataList().then(()=>{
      wx.stopPullDownRefresh({
        complete: (res) => {},
      })
    })
    

  },
  onReachBottom: function () {
    // 页面上拉触底事件的处理函数
    this.loadDataList(true);
  }
})
