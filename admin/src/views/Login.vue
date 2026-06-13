<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: 'admin',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin(): Promise<void> {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    ElMessage.success('登录成功');
    const redirect = (route.query.redirect as string | undefined) ?? '/';
    await router.replace(redirect);
  } catch {
    // intercepted by http interceptor
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Left: editorial panel -->
    <aside class="left">
      <div class="left-top">
        <div class="mark">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M5 24 L20 12 L23 9 Q26 7 28 7 L27 8 Q24 11 21 15 L7 27 Z"
              fill="currentColor"
            />
            <line x1="21" y1="15" x2="27" y2="8" stroke="#C04A2C" stroke-width="1.2" stroke-linecap="round" />
            <circle cx="27" cy="27" r="1.5" fill="#C04A2C" />
          </svg>
        </div>
        <div class="eyebrow">N°&nbsp;01 · ADMINISTRATEUR</div>
      </div>

      <div class="left-body">
        <h1 class="hero">
          情侣<span class="hero-amp">&amp;</span>厨房<br />
          <em class="hero-em">Mémoire</em>
        </h1>
        <p class="kicker">
          为两个人的小厨房而备的<br />
          后台 · 记账 · 备忘
        </p>
      </div>

      <div class="left-foot">
        <div class="foot-rule" />
        <div class="foot-text">
          <span>Édition Privée</span>
          <span class="foot-sep">/</span>
          <span class="foot-num">№ 002</span>
        </div>
      </div>

      <!-- Decorative paper marks -->
      <div class="stamp" aria-hidden="true">
        <div class="stamp-arc">
          <svg viewBox="0 0 120 120">
            <defs>
              <path id="arc" d="M 60 60 m -46 0 a 46 46 0 1 1 92 0 a 46 46 0 1 1 -92 0" />
            </defs>
            <text fill="#C04A2C" font-family="DM Sans" font-size="9" letter-spacing="3">
              <textPath href="#arc">PRIVÉ · CONFIDENTIEL · PRIVÉ · CONFIDENTIEL ·</textPath>
            </text>
          </svg>
        </div>
        <div class="stamp-center">M·02</div>
      </div>
    </aside>

    <!-- Right: form -->
    <main class="right">
      <div class="form-wrap">
        <div class="form-eyebrow">SE CONNECTER · 登录</div>
        <h2 class="form-title">请先取一份口令。</h2>
        <p class="form-sub">未公开发行 — 仅限内部成员。</p>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username" label="账号">
            <el-input v-model="form.username" placeholder="admin" size="large" />
          </el-form-item>
          <el-form-item prop="password" label="密码">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit"
            @click="handleLogin"
          >
            打开账本 →
          </el-button>
        </el-form>

        <div class="hint">
          <span class="hint-key">提示</span>
          <span class="hint-val">默认账号 admin / admin123456</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  background: var(--paper);
  display: grid;
  grid-template-columns: 1.05fr 1fr;
}

@media (max-width: 880px) {
  .login-page { grid-template-columns: 1fr; }
  .left { display: none; }
}

/* ── Left panel ────────────────────────────────────────────────── */
.left {
  position: relative;
  background:
    radial-gradient(at 22% 30%, rgba(192, 74, 44, 0.08), transparent 50%),
    radial-gradient(at 80% 80%, rgba(110, 122, 69, 0.08), transparent 55%),
    var(--paper);
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--rule);
  overflow: hidden;
}
.left::before {
  /* paper grain — stronger on this side */
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.6;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.11  0 0 0 0 0.085  0 0 0 0 0.078  0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
.left::after {
  /* corner crease */
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 64px; height: 64px;
  background: linear-gradient(225deg, var(--rule) 50%, transparent 50%);
  opacity: 0.4;
}
.left > * { position: relative; z-index: 1; }

.left-top { display: flex; align-items: center; gap: 16px; }
.mark {
  width: 44px;
  height: 44px;
  background: var(--ink);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--paper);
}
.mark svg { width: 26px; height: 26px; }
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.28em;
  color: var(--ink-3);
}

.left-body {
  margin-top: auto;
  margin-bottom: auto;
  padding: 32px 0;
}
.hero {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(56px, 8vw, 96px);
  line-height: 0.92;
  letter-spacing: -0.035em;
  color: var(--ink);
  margin: 0;
  animation: rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.hero-amp {
  font-style: italic;
  font-weight: 400;
  color: var(--persimmon);
  margin: 0 0.05em;
}
.hero-em {
  font-style: italic;
  font-weight: 400;
  color: var(--persimmon);
  font-family: var(--font-display);
  font-size: 0.7em;
  letter-spacing: -0.01em;
}
.kicker {
  margin: 28px 0 0;
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.65;
  color: var(--ink-2);
  max-width: 320px;
  animation: rise 0.7s 0.1s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.left-foot { margin-top: auto; }
.foot-rule {
  height: 1px;
  background: linear-gradient(to right, var(--ink) 0%, var(--ink) 25%, transparent 25%, transparent 28%, var(--ink) 28%, var(--ink) 100%);
  opacity: 0.5;
  margin-bottom: 12px;
}
.foot-text {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.1em;
}
.foot-num { color: var(--persimmon); font-weight: 600; }
.foot-sep { color: var(--ink-4); }

/* Stamp ornament */
.stamp {
  position: absolute;
  bottom: 56px;
  right: 56px;
  width: 120px;
  height: 120px;
  opacity: 0.85;
  transform: rotate(-8deg);
  animation: stampIn 0.9s 0.3s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.stamp-arc { position: absolute; inset: 0; }
.stamp-arc svg { width: 100%; height: 100%; }
.stamp-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  color: var(--persimmon);
  letter-spacing: -0.02em;
  text-shadow: 1px 0 0 var(--paper);
}
.stamp::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1.5px solid var(--persimmon);
  border-radius: 999px;
  opacity: 0.6;
}

/* ── Right panel ───────────────────────────────────────────────── */
.right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--paper-2);
}
.form-wrap {
  width: 100%;
  max-width: 380px;
  animation: rise 0.6s 0.15s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.form-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.28em;
  color: var(--persimmon);
  margin-bottom: 10px;
}
.form-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 32px;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0 0 6px;
  line-height: 1.15;
}
.form-sub {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--ink-3);
  margin: 0 0 32px;
  font-size: 15px;
}

.form :deep(.el-form-item__label) {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  color: var(--ink-3);
  text-transform: uppercase;
  padding-bottom: 6px;
  font-weight: 600;
}
.form :deep(.el-input__wrapper) {
  background: var(--paper-3) !important;
  padding: 0 14px;
}
.form :deep(.el-input--large) { height: 48px; }
.form :deep(.el-input--large .el-input__inner) {
  font-family: var(--font-body);
  font-size: 15px;
  letter-spacing: 0.01em;
}

.submit {
  width: 100%;
  margin-top: 12px;
  height: 50px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.02em;
  border-radius: var(--r-sm);
}

.hint {
  margin-top: 28px;
  padding: 12px 14px;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: var(--r-sm);
  display: flex;
  gap: 12px;
  align-items: baseline;
}
.hint-key {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--persimmon);
  font-weight: 600;
}
.hint-val {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--ink-3);
}

/* ── Animations ────────────────────────────────────────────────── */
@keyframes rise {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes stampIn {
  from { opacity: 0; transform: rotate(-22deg) scale(1.3); }
  to   { opacity: 0.85; transform: rotate(-8deg) scale(1); }
}
</style>
