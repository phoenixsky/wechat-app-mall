const WXAPI = require('./api')


async function checkSession() {
  return new Promise((resolve, reject) => {
    wx.checkSession({
      success() {
        return resolve(true)
      },
      fail() {
        return resolve(false)
      }
    })
  })
}

// 检测登录状态，返回 true / false
async function checkHasLogined() {
  // 没有用户缓存
  if (!wx.getStorageSync('userId') ) {
    return false;
  }
  // session过期
  if (!await checkSession()) {
    wx.removeStorageSync('userId')
    return false;
  }
  return true
}

async function getWxCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        return resolve(res.code)
      },
      fail() {
        wx.showToast({
          title: '获取code失败',
          icon: 'none'
        })
        return reject('获取code失败')
      }
    })
  })
}

async function getWxUserInfo() {
  return new Promise((resolve, reject) => {
    wx.getUserInfo({
      success: res => {
        return resolve(res)
      },
      fail: err => {
        console.error(err)
        return resolve()
      }
    })
  })
}

/**
 * 根据code登录
 * @param page 
 */
async function login(page) {
  let code = await getWxCode();
  let res = await WXAPI.login(code);
  if (res.code == 100) {
    let {user:{userId,clientId,wxUnionId,wxOpenId}} = res.data;
    wx.setStorageSync('userId', userId)
    wx.setStorageSync('clientId', clientId)
    wx.setStorageSync('unionId', wxUnionId)
    wx.setStorageSync('openId', wxOpenId)
    if (page) page.onShow();
  } else {
    console.error('登录错误')
    wx.showToast({
      title: '登录失败...',
      icon:'none',
    })
  }
}

async function register(page) {

  let code = await getWxCode();
  let {iv,encryptedData} = await getWxUserInfo();
  let appId = wx.getAccountInfoSync().miniProgram.appId;
  let res = await WXAPI.register({
    appId,code,iv,encryptedData
  });
  if(res.code == 100){
    login(page);
    // let {userId,unionId} = res.data;
    // wx.setStorageSync('userId', userId)
    // wx.setStorageSync('unionId', unionId)
  }else{
    wx.showToast({
      title: '注册失败,请重试...',
      icon:'none',
    })
  }
}

function loginOut() {
  wx.removeStorageSync('userId')
  wx.removeStorageSync('clientId')
  wx.removeStorageSync('unionId')
  wx.removeStorageSync('openId')
}

async function checkAndAuthorize(scope) {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success(res) {
        if (!res.authSetting[scope]) {
          wx.authorize({
            scope: scope,
            success() {
              resolve() // 无返回参数
            },
            fail(e) {
              console.error(e)
              // if (e.errMsg.indexof('auth deny') != -1) {
              //   wx.showToast({
              //     title: e.errMsg,
              //     icon: 'none'
              //   })
              // }
              wx.showModal({
                title: '无权操作',
                content: '需要获得您的授权',
                showCancel: false,
                confirmText: '立即授权',
                confirmColor: '#e64340',
                success(res) {
                  wx.openSetting();
                },
                fail(e) {
                  console.error(e)
                  reject(e)
                },
              })
            }
          })
        } else {
          resolve() // 无返回参数
        }
      },
      fail(e) {
        console.error(e)
        reject(e)
      }
    })
  })
}


module.exports = {
  checkHasLogined: checkHasLogined,
  getWxCode: getWxCode,
  getUserInfo: getWxUserInfo,
  login: login,
  register: register,
  loginOut: loginOut,
  checkAndAuthorize: checkAndAuthorize
}
