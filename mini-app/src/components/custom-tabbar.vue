<template>
  <wd-tabbar
    v-model="active"
    fixed
    bordered
    placeholder
    safe-area-inset-bottom
    active-color="#E07A5F"
    inactive-color="#8E8580"
    @change="onChange"
  >
    <wd-tabbar-item name="home" title="小厨房" icon="home" />
    <wd-tabbar-item name="menu" title="菜单" icon="goods" />
    <wd-tabbar-item name="timeline" title="时间线" icon="clock" />
    <wd-tabbar-item name="profile" title="我的" icon="user" />
  </wd-tabbar>
</template>

<script>
export default {
  name: 'CustomTabbar',
  props: {
    current: { type: String, default: 'home' },
  },
  data() {
    return {
      active: this.current,
    };
  },
  watch: {
    current(val) {
      this.active = val;
    },
  },
  methods: {
    onChange({ value }) {
      const urlMap = {
        home: '/pages/tabbar/home/home',
        menu: '/pages/tabbar/menu/menu',
        timeline: '/pages/tabbar/timeline/timeline',
        profile: '/pages/tabbar/profile/profile',
      };
      if (value !== this.current) {
        uni.switchTab({ url: urlMap[value] });
      }
    },
  },
};
</script>
