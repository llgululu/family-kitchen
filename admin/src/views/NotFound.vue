<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="not-found">
    <div class="card">
      <div class="eyebrow">PAGE INTROUVABLE · ERR 404</div>
      <h1 class="title">这一页<em>没在菜单上</em>。</h1>
      <p class="sub">也许是被收进抽屉里了，也许从来就没存在过。</p>
      <div class="actions">
        <button class="primary" @click="router.push('/')">回到首页 ←</button>
        <button class="ghost" @click="router.back()">回上一页</button>
      </div>
      <div class="serial">N° 0404 · ÉDITION PRIVÉE</div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  padding: 40px;
}
.card {
  max-width: 520px;
  text-align: left;
  position: relative;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.26em;
  color: var(--persimmon);
  font-weight: 600;
  margin-bottom: 14px;
}
.title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--ink);
}
.title em {
  font-style: italic;
  font-weight: 400;
  color: var(--persimmon);
}
.sub {
  margin: 20px 0 32px;
  color: var(--ink-3);
  font-size: 15px;
  line-height: 1.6;
}
.actions {
  display: flex;
  gap: 10px;
}
.primary {
  background: var(--ink);
  color: var(--paper);
  border: none;
  padding: 12px 22px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.18s ease;
}
.primary:hover { background: var(--persimmon); }
.ghost {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink-2);
  padding: 12px 22px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.ghost:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.serial {
  position: absolute;
  bottom: -56px;
  left: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.24em;
  color: var(--ink-4);
}
</style>
