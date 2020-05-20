const app = getApp();
const CONFIG = require('../../config.js')
const WXAPI = require('../../utils/api')
import wxbarcode from 'wxbarcode'

Page({
    data:{
      imgPre:WXAPI.imgPre,
      orderId:0,
      goodsList:[]
    },
    onLoad:function(e){
      // e.id = 478785
      const accountInfo = wx.getAccountInfoSync()
      var orderId = e.id;
      this.setData({
        orderId: orderId,
        appid: accountInfo.miniProgram.appId
      });
    },
    onShow : function () {
      var that = this;
      WXAPI.orderDetail(that.data.orderId).then(function (res) {
        if (res.code != 100) {
          wx.showModal({
            title: '错误',
            content: res.msg,
            showCancel: false
          })
          return;
        }

        that.setData({
          orderDetail: res.data
        });
      })
    },
    showQRCode(event){
      this.setData({
        isShowQRCode : true
      })
      // 绘制核销码
      let qrcode = event.currentTarget.dataset.code;
      wxbarcode.qrcode('qrcode', qrcode, 500, 500);

    },
    closeQRPopup(){
      this.setData({
        isShowQRCode : false
      })
    },
    async payOrder(){
      wx.showLoading({
        title: '正在加载'
      });
      let orderId = this.data.orderId;
      let openId = wx.getStorageSync('openId');

      const resPayInfo = await WXAPI.wxPay(orderId,openId);
      if(resPayInfo.code != 100){
        wx.showToast({
          title: '获取支付信息失败:'+resPayInfo.msg,
          icon: 'none',
        })
      }else{
        let payInfo = resPayInfo.data;
        wx.requestPayment({...payInfo,
          success: () => {
          wx.showToast({
            title: '支付成功',
            icon: 'none',
            duration: 2000
          })
          wx.hideLoading({});
          wx.reLaunch({
            url: 'pages/order-details/index',
          })
        }, fail: (err) => {
          console.error(`支付失败:${JSON.stringify(err)}`);
          wx.showToast({
            title: '支付',
            icon: 'none',
            duration: 2000
          })
        }});
      }
      // wx.navigateTo({
      //   url: "/pages/to-pay-order/index?orderType=buyNow"
      // })
    },
    cancelOrder(){

    },
    wuliuDetailsTap:function(e){
      var orderId = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: "/pages/wuliu/index?id=" + orderId
      })
    },
    confirmBtnTap:function(e){
      let that = this;
      let orderId = this.data.orderId;
      wx.showModal({
          title: '确认您已收到商品？',
          content: '',
          success: function(res) {
            if (res.confirm) {
              WXAPI.orderDelivery(wx.getStorageSync('token'), orderId).then(function (res) {
                if (res.code == 0) {
                  that.onShow();
                }
              })
            }
          }
      })
    },
    submitReputation: function (e) {
      let that = this;
      let postJsonString = {};
      postJsonString.token = wx.getStorageSync('token');
      postJsonString.orderId = this.data.orderId;
      let reputations = [];
      let i = 0;
      while (e.detail.value["orderGoodsId" + i]) {
        let orderGoodsId = e.detail.value["orderGoodsId" + i];
        let goodReputation = e.detail.value["goodReputation" + i];
        let goodReputationRemark = e.detail.value["goodReputationRemark" + i];

        let reputations_json = {};
        reputations_json.id = orderGoodsId;
        reputations_json.reputation = goodReputation;
        reputations_json.remark = goodReputationRemark;

        reputations.push(reputations_json);
        i++;
      }
      postJsonString.reputations = reputations;
      WXAPI.orderReputation({
        postJsonString: JSON.stringify(postJsonString)
      }).then(function (res) {
        if (res.code == 0) {
          that.onShow();
        }
      })
    }
})
