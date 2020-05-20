const WXAPI = require('../../utils/api')
const app = getApp();
const CONFIG = require('../../config.js')
const AUTH = require('../../utils/auth')
const SelectSizePrefix = "选择："
import Poster from 'wxa-plugin-canvas/poster/poster'

Page({
  data: {
    imgPre: WXAPI.imgPre,
    wxlogin: true,
    goodsDetail: {},

    hideShopPopup: true,
    buyNumber: 1,
    buyNumMin: 1,
    buyNumMax: 0,

    order: {},
  },

  onShareAppMessage() {
    let _data = {
      title: this.data.goodsDetail.skuName,
      path: '/pages/goods-details/index?id=' + this.data.goodsDetail.skuId + '&inviter_id=' + wx.getStorageSync('userId'),
      success: function (res) {
        // 转发成功
      },
      fail: function (res) {
        // 转发失败
      }
    }
    console.log('share:'+_data.path)
    return _data
  },
  async onLoad(e) {
    this.data.goodsId = e.id
    // 获取分享人的id
    this.data.inviterId = e.inviter_id || '';

    const clientId = wx.getStorageSync('clientId');
    this.setData({
      isConsumer: clientId || clientId == 19,
    })
    // this.reputation(e.id)
    // this.shippingCartInfo()
  },

  onShow() {
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.setData({
          wxlogin: isLogined
        })
        this.goodsFavCheck()
      }
    })
    this.getGoodsDetailAndKanjieInfo(this.data.goodsId)
  },
  async goodsFavCheck() {
    WXAPI.goodsFavList({
      token: wx.getStorageSync('token')
    })
    const res = await WXAPI.goodsFavCheck(wx.getStorageSync('token'), this.data.goodsId)
    if (res.code == 0) {
      this.setData({
        faved: true
      })
    } else {
      this.setData({
        faved: false
      })
    }
  },
  async addFav() {
    AUTH.checkHasLogined().then(isLogined => {
      this.setData({
        wxlogin: isLogined
      })
      if (isLogined) {
        if (this.data.faved) {
          // 取消收藏
          WXAPI.goodsFavDelete(wx.getStorageSync('token'), '', this.data.goodsId).then(res => {
            this.goodsFavCheck()
          })
        } else {
          // 加入收藏
          WXAPI.goodsFavPut(wx.getStorageSync('token'), this.data.goodsId).then(res => {
            this.goodsFavCheck()
          })
        }
      }
    })
  },
  async getGoodsDetailAndKanjieInfo(goodsId) {
    const that = this;
    const goodsDetailRes = await WXAPI.goodsDetail(goodsId)
    if (goodsDetailRes.code == 100) {
      let resData = goodsDetailRes.data;
      // handle data
      if (resData.skuPhoto) {
        resData.skuPhotos = resData.skuPhoto.split(',');
      }
      if (resData.detailPhoto) {
        resData.detailPhotos = resData.detailPhoto.split(',');
      }
      if (resData.enableDate && resData.enableDate.length > 18) {
        resData.enableDate = resData.enableDate.substr(0, 10);
      }
      if (resData.expiredDate && resData.expiredDate.length > 18) {
        resData.expiredDate = resData.expiredDate.substr(0, 10);
      }

      if (resData.content) {
        resData.content = resData.content.replace(/\\n/g, "\n")
      }
      if (resData.instruction) {
        resData.instruction = resData.instruction.replace(/\\n/g, "\n")
      }

      if (resData.hallMappings) {}

      if (resData.stockAmount) {

      }

      let _data = {
        goodsDetail: resData,
        buyNumMax: resData.stockAmount ? resData.stockAmount : 0,
      }

      that.setData(_data);
    }
  },


  toBuy: function () {
    AUTH.checkHasLogined().then(isLogined => {
      if (!isLogined) {
          // 弹出/关闭授权提示框
        this.setData({
          wxlogin: isLogined
        })
        // AUTH.login()
      }else{
        this.setData({
          hideShopPopup: false
        });
      }
    })

  },

  bindBuyNameInput: function (e) {
    let order = this.data.order;
    order.name = e.detail.value;
    this.setData({
      order: order
    })
  },

  bindBuyMobileNumberInput: function (e) {
    let order = this.data.order;
    order.mobileNo = e.detail.value;
    this.setData({
      order: order
    })
  },


  /**
   * 规格选择弹出框隐藏
   */
  closePopupTap: function () {
    this.setData({
      hideShopPopup: true
    })
  },
  numJianTap: function () {
    if (this.data.buyNumber > this.data.buyNumMin) {
      var currentNum = this.data.buyNumber;
      currentNum--;
      this.setData({
        buyNumber: currentNum
      })
    }
  },
  numJiaTap: function () {
    if (this.data.buyNumber < this.data.buyNumMax) {
      var currentNum = this.data.buyNumber;
      currentNum++;
      this.setData({
        buyNumber: currentNum
      })
    }
  },


  /**
   * 立即购买
   */
  async buyNow() {
    let that = this
    let order = this.data.order;

    if (!order.name) {
      wx.showModal({
        title: '提示',
        content: '姓名不能为空！',
        showCancel: false
      })
      return;
    }

    if (!order.mobileNo) {
      wx.showModal({
        title: '提示',
        content: '手机号不能为空',
        showCancel: false
      })
      return;
    }

    if (this.data.buyNumber < 1) {
      wx.showModal({
        title: '提示',
        content: '购买数量不能为0！',
        showCancel: false
      })
      return;
    }

    wx.showLoading({
      title: '加载中',
    })

    order.skuId = this.data.goodsId;
    order.quantity = this.data.buyNumber;
    // 当前用户
    order.userId = wx.getStorageSync('userId');
    // order.clientId = wx.getStorageSync('clientId');
    // 分销用户
    order.salerUserId = this.data.inviterId;

    const res = await WXAPI.addOrder(order);
    if (res.code == 100) {

      let orderId = res.data;
      let openId = wx.getStorageSync('openId');

      let {
        data: payInfo
      } = await WXAPI.wxPay(orderId, openId);
      wx.requestPayment({
        ...payInfo,
        success: () => {
          wx.showToast({
            title: '支付成功',
            icon: 'none',
            duration: 2000
          })
          wx.redirectTo({
            url: '/pages/order-list/index',
          })
          this.closePopupTap();
        },
        fail: (err) => {
          console.error(`支付失败:${JSON.stringify(err)}`);
          wx.showToast({
            title: '支付未完成',
            icon: 'none',
            duration: 2000
          })
        }
      });
      // wx.navigateTo({
      //   url: "/pages/to-pay-order/index?orderType=buyNow"
      // })

    } else {
      wx.showToast({
        title: res.msg,
        icon: 'none',
        duration: 2000
      })
    }


  },


  reputation: function (goodsId) {
    var that = this;
    WXAPI.goodsReputation({
      goodsId: goodsId
    }).then(function (res) {
      if (res.code == 0) {
        that.setData({
          reputation: res.data
        });
      }
    })
  },
  pingtuanList: function (goodsId) {
    var that = this;
    WXAPI.pingtuanList({
      goodsId: goodsId,
      status: 0
    }).then(function (res) {
      if (res.code == 0) {
        that.setData({
          pingtuanList: res.data.result
        });
      }
    })
  },
  getVideoSrc: function (videoId) {
    var that = this;
    WXAPI.videoDetail(videoId).then(function (res) {
      if (res.code == 0) {
        that.setData({
          videoMp4Src: res.data.fdMp4
        });
      }
    })
  },
  joinKanjia() {
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.doneJoinKanjia();
      } else {
        this.setData({
          wxlogin: false
        })
      }
    })
  },
  doneJoinKanjia: function () { // 报名参加砍价活动
    const _this = this;
    if (!_this.data.curGoodsKanjia) {
      return;
    }
    wx.showLoading({
      title: '加载中',
      mask: true
    })
    WXAPI.kanjiaJoin(wx.getStorageSync('token'), _this.data.curGoodsKanjia.id).then(function (res) {
      wx.hideLoading()
      if (res.code == 0) {
        _this.setData({
          kjJoinUid: wx.getStorageSync('uid'),
          myHelpDetail: null
        })
        _this.getGoodsDetailAndKanjieInfo(_this.data.goodsDetail.basicInfo.id)
      } else {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
      }
    })
  },
  joinPingtuan: function (e) {
    let pingtuanopenid = e.currentTarget.dataset.pingtuanopenid
    wx.navigateTo({
      url: "/pages/to-pay-order/index?orderType=buyNow&pingtuanOpenId=" + pingtuanopenid
    })
  },
  goIndex() {
    wx.switchTab({
      url: '/pages/index/index',
    });
  },
  helpKanjia() {
    const _this = this;
    AUTH.checkHasLogined().then(isLogined => {
      _this.setData({
        wxlogin: isLogined
      })
      if (isLogined) {
        _this.helpKanjiaDone()
      }
    })
  },
  helpKanjiaDone() {
    const _this = this;
    WXAPI.kanjiaHelp(wx.getStorageSync('token'), _this.data.kjId, _this.data.kjJoinUid, '').then(function (res) {
      if (res.code != 0) {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
        return;
      }
      _this.setData({
        myHelpDetail: res.data
      });
      wx.showModal({
        title: '成功',
        content: '成功帮TA砍掉 ' + res.data.cutPrice + ' 元',
        showCancel: false
      })
      _this.getGoodsDetailAndKanjieInfo(_this.data.goodsDetail.basicInfo.id)
    })
  },
  cancelLogin() {
    this.setData({
      wxlogin: true
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
  closePop() {
    this.setData({
      posterShow: false
    })
  },
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url, // 当前显示图片的http链接
      urls: [url] // 需要预览的图片http链接列表
    })
  },
  async drawSharePic() {
    wx.showToast({
      icon:'none',
      title: '蓄势待发,敬请期待...',
    })
    return;
    wx.showLoading({
      title: '正在生成...',
    })
    const _this = this
    const qrcodeRes = await WXAPI.wxaQrcode({
      scene: _this.data.goodsDetail.basicInfo.id + ',' + wx.getStorageSync('uid'),
      page: 'pages/goods-details/index',
      is_hyaline: true,
      autoColor: true,
      expireHours: 1
    })
    if (qrcodeRes.code != 0) {
      wx.showToast({
        title: qrcodeRes.msg,
        icon: 'none'
      })
      return
    }
    const qrcode = qrcodeRes.data
    const pic = _this.data.goodsDetail.basicInfo.pic
    wx.getImageInfo({
      src: pic,
      success(res) {
        const height = 490 * res.height / res.width
        _this.drawSharePicDone(height, qrcode)
      },
      fail(e) {
        console.error(e)
      }
    })
  },
  drawSharePicDone(picHeight, qrcode) {
    const _this = this
    const _baseHeight = 74 + (picHeight + 120)
    this.setData({
      posterConfig: {
        width: 750,
        height: picHeight + 660,
        backgroundColor: '#fff',
        debug: false,
        blocks: [{
          x: 76,
          y: 74,
          width: 604,
          height: picHeight + 120,
          borderWidth: 2,
          borderColor: '#c2aa85',
          borderRadius: 8
        }],
        images: [{
            x: 133,
            y: 133,
            url: _this.data.goodsDetail.basicInfo.pic, // 商品图片
            width: 490,
            height: picHeight
          },
          {
            x: 76,
            y: _baseHeight + 199,
            url: qrcode, // 二维码
            width: 222,
            height: 222
          }
        ],
        texts: [{
            x: 375,
            y: _baseHeight + 80,
            width: 650,
            lineNum: 2,
            text: _this.data.goodsDetail.basicInfo.name,
            textAlign: 'center',
            fontSize: 40,
            color: '#333'
          },
          {
            x: 375,
            y: _baseHeight + 180,
            text: '￥' + _this.data.goodsDetail.basicInfo.minPrice,
            textAlign: 'center',
            fontSize: 50,
            color: '#e64340'
          },
          {
            x: 352,
            y: _baseHeight + 320,
            text: '长按识别小程序码',
            fontSize: 28,
            color: '#999'
          }
        ],
      }
    }, () => {
      Poster.create();
    });
  },
  onPosterSuccess(e) {
    console.log('success:', e)
    this.setData({
      posterImg: e.detail,
      showposterImg: true
    })
  },
  onPosterFail(e) {
    console.error('fail:', e)
  },
  savePosterPic() {
    const _this = this
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterImg,
      success: (res) => {
        wx.showModal({
          content: '已保存到手机相册',
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#333'
        })
      },
      complete: () => {
        _this.setData({
          showposterImg: false
        })
      },
      fail: (res) => {
        wx.showToast({
          title: res.errMsg,
          icon: 'none',
          duration: 2000
        })
      }
    })
  },
})
