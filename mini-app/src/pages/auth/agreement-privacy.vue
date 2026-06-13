<template>
  <view class="page">
    <view class="title">隐私政策</view>
    <view class="updated">最近更新：2026-05-15</view>

    <view class="section">
      <text class="h2">一、我们收集的信息</text>
      <text class="p">
        1. 微信账号信息：您授权微信登录后，我们获取您的微信 openid 用于账号识别；
        头像、昵称由您主动通过微信"头像昵称填写能力"提供。
      </text>
      <text class="p"> 2. 您主动填写的信息：菜谱内容、图片、订单备注、个性签名、意见反馈等。 </text>
      <text class="p"> 3. 设备相关信息：仅在您主动调用相机/相册时，访问对应权限以选择图片。 </text>
    </view>

    <view class="section">
      <text class="h2">二、信息使用</text>
      <text class="p">
        以上信息仅用于本服务的功能实现（账号体系、家庭空间共享、个性化展示），
        不会用于任何商业广告或转售给第三方。
      </text>
    </view>

    <view class="section">
      <text class="h2">三、信息共享</text>
      <text class="p">
        家庭空间内的菜谱、订单、时间线对您所在家庭的另一名成员可见。
        除法律法规要求外，我们不会向其他第三方共享您的个人信息。
      </text>
    </view>

    <view class="section">
      <text class="h2">四、信息存储</text>
      <text class="p">
        信息存储在中国境内服务器；图片通过云存储服务保存。我们采取加密传输、访问控制等措施保护数据安全。
      </text>
    </view>

    <view class="section">
      <text class="h2">五、您的权利</text>
      <text class="p">
        您可以在"我的 → 编辑个人资料"修改头像/昵称；
        在"家庭空间设置"中退出家庭；通过"意见反馈"申请注销账号或删除数据。
      </text>
    </view>

    <view class="section">
      <text class="h2">六、未成年人保护</text>
      <text class="p">
        本服务面向成年用户。如您是未成年人，请在监护人指导下使用并阅读本政策。
      </text>
    </view>

    <view class="section">
      <text class="h2">七、政策变更</text>
      <text class="p">隐私政策更新后将在小程序内公布；重大变更将通过站内消息提醒您。</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 32rpx;
  background: #fff;
  min-height: 100vh;
}
.title {
  font-size: 40rpx;
  font-weight: 600;
  color: #2e2926;
}
.updated {
  font-size: 24rpx;
  color: #8e8580;
  margin: 8rpx 0 32rpx;
}
.section {
  margin-bottom: 32rpx;
}
.h2 {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2e2926;
  margin-bottom: 12rpx;
}
.p {
  display: block;
  font-size: 26rpx;
  color: #6b6560;
  line-height: 1.7;
}
</style>
