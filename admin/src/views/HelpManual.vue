<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

interface TocItem {
  id: string;
  label: string;
}

const toc: TocItem[] = [
  { id: 'overview', label: '系统概览' },
  { id: 'dashboard', label: '数据看板' },
  { id: 'families', label: '家庭空间' },
  { id: 'users', label: '用户管理' },
  { id: 'orders', label: '订单管理' },
  { id: 'badges', label: '成就管理' },
  { id: 'feedback', label: '意见反馈' },
  { id: 'config', label: '业务配置' },
  { id: 'about', label: '关于' },
];

const activeId = ref('overview');
let observer: IntersectionObserver | null = null;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(async () => {
  await nextTick();

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id;
        }
      }
    },
    { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
  );

  for (const item of toc) {
    const el = document.getElementById(item.id);
    if (el) observer.observe(el);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <div class="help-manual">
    <header class="hero">
      <div class="eyebrow">MANUEL · 帮助手册</div>
      <h1 class="title">管理后台<em>使用指南</em>。</h1>
    </header>

    <div class="layout">
      <!-- Left TOC -->
      <aside class="toc">
        <div class="toc-label">目录 · SOMMAIRE</div>
        <ul class="toc-list">
          <li
            v-for="item in toc"
            :key="item.id"
            :class="{ active: activeId === item.id }"
            @click="scrollTo(item.id)"
          >
            {{ item.label }}
          </li>
        </ul>
      </aside>

      <!-- Right content -->
      <main class="content">
        <!-- §1 系统概览 -->
        <section id="overview" class="section">
          <h2>系统概览</h2>
          <div class="rule">
            <span class="rule-no">§ 1</span><span class="rule-mid">OVERVIEW</span>
          </div>
          <p>
            情侣厨房管理后台（Mémoire）是面向运营人员的一站式管理平台。它提供对家庭空间、用户、订单、成就徽章及业务配置的完整管理能力。
          </p>
          <h3>核心概念</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>家庭空间</dt>
              <dd>由两位成员组成的私密协作空间，所有菜品与订单均归属于某个家庭。</dd>
            </div>
            <div class="def-row">
              <dt>订单</dt>
              <dd>记录一次从点菜到上菜再到评价的完整流程。</dd>
            </div>
            <div class="def-row">
              <dt>成就徽章</dt>
              <dd>基于用户行为自动触发的奖励体系，如连续点餐、首次评价等。</dd>
            </div>
            <div class="def-row">
              <dt>业务配置</dt>
              <dd>系统级别的开关与参数，如打赏比例、反馈类型等。</dd>
            </div>
          </dl>
        </section>

        <!-- §2 数据看板 -->
        <section id="dashboard" class="section">
          <h2>数据看板</h2>
          <div class="rule">
            <span class="rule-no">§ 2</span><span class="rule-mid">DASHBOARD</span>
          </div>
          <p>数据看板是登录后的默认首页，展示平台关键运营指标，帮助你快速掌握整体状况。</p>
          <h3>指标说明</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>家庭总数</dt>
              <dd>当前平台上已创建的家庭空间数量。</dd>
            </div>
            <div class="def-row">
              <dt>用户总数</dt>
              <dd>所有注册用户数，含已加入和未加入家庭的用户。</dd>
            </div>
            <div class="def-row">
              <dt>订单总数</dt>
              <dd>平台累计产生的订单数量。</dd>
            </div>
            <div class="def-row">
              <dt>菜品总数</dt>
              <dd>所有家庭创建的菜品（食谱）数量。</dd>
            </div>
          </dl>
          <p class="note">
            <span class="note-tag">提示</span>
            看板数据实时从后端获取，刷新页面即可获取最新数据。
          </p>
        </section>

        <!-- §3 家庭空间 -->
        <section id="families" class="section">
          <h2>家庭空间</h2>
          <div class="rule">
            <span class="rule-no">§ 3</span><span class="rule-mid">FAMILIES</span>
          </div>
          <p>家庭空间是平台的核心业务单元。每个家庭由两位成员组成，共享菜品库和订单记录。</p>
          <h3>功能说明</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>家庭列表</dt>
              <dd>查看所有家庭，支持按名称搜索，列表显示成员数、菜品数、订单数等概要信息。</dd>
            </div>
            <div class="def-row">
              <dt>家庭详情</dt>
              <dd>点击家庭可进入详情页，查看成员信息、菜品列表和订单记录的完整视图。</dd>
            </div>
            <div class="def-row">
              <dt>创建方式</dt>
              <dd>家庭由小程序端用户主动创建并邀请另一半加入，管理后台仅提供查看能力。</dd>
            </div>
          </dl>
          <p class="note">
            <span class="note-tag">提示</span>
            在列表页点击任意家庭行即可跳转至详情页，无需额外操作。
          </p>
        </section>

        <!-- §4 用户管理 -->
        <section id="users" class="section">
          <h2>用户管理</h2>
          <div class="rule">
            <span class="rule-no">§ 4</span><span class="rule-mid">USERS</span>
          </div>
          <p>用户管理页面展示平台上所有注册用户的信息，便于运营人员排查问题或了解用户情况。</p>
          <h3>功能说明</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>用户列表</dt>
              <dd>分页展示用户，显示头像、昵称、OpenID、所属家庭等基本信息，支持关键词搜索。</dd>
            </div>
            <div class="def-row">
              <dt>用户详情</dt>
              <dd>查看单个用户的完整资料，包括加入的家庭、成就徽章、历史订单等关联数据。</dd>
            </div>
          </dl>
        </section>

        <!-- §5 订单管理 -->
        <section id="orders" class="section">
          <h2>订单管理</h2>
          <div class="rule">
            <span class="rule-no">§ 5</span><span class="rule-mid">ORDERS</span>
          </div>
          <p>订单管理页面用于查看和追踪所有订单的状态流转。</p>
          <h3>订单状态流转</h3>
          <div class="flow">
            <span class="flow-step">待处理</span>
            <span class="flow-arrow">→</span>
            <span class="flow-step">制作中</span>
            <span class="flow-arrow">→</span>
            <span class="flow-step">已上菜</span>
            <span class="flow-arrow">→</span>
            <span class="flow-step highlight">已评价</span>
          </div>
          <dl class="def-list">
            <div class="def-row">
              <dt>待处理</dt>
              <dd>订单已创建，等待厨师确认开始制作。</dd>
            </div>
            <div class="def-row">
              <dt>制作中</dt>
              <dd>厨师已确认，正在烹饪。</dd>
            </div>
            <div class="def-row">
              <dt>已上菜</dt>
              <dd>菜品已完成并上桌，等待评价。</dd>
            </div>
            <div class="def-row">
              <dt>已评价</dt>
              <dd>用餐者已完成评价，订单流程结束。</dd>
            </div>
          </dl>
          <p class="note">
            <span class="note-tag">提示</span>
            点击订单可查看详细信息，包括所点菜品、评价内容等。
          </p>
        </section>

        <!-- §6 成就管理 -->
        <section id="badges" class="section">
          <h2>成就管理</h2>
          <div class="rule">
            <span class="rule-no">§ 6</span><span class="rule-mid">BADGES</span>
          </div>
          <p>
            成就系统通过数据驱动的徽章体系激励用户互动。每个徽章由定义（BadgeDefinition）和触发规则组成。核心配置存储在「评估器参数」JSON
            字段中。
          </p>

          <h3>核心概念</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>评估器类型</dt>
              <dd>
                决定如何判定是否达成，对应 <code class="c">evaluatorType</code> 字段。系统提供 11
                种内置评估器，详见下方。
              </dd>
            </div>
            <div class="def-row">
              <dt>评估器参数</dt>
              <dd>
                对应 <code class="c">evaluatorConfig</code> 字段，是一个 JSON
                对象，不同评估器类型要求不同的字段组合。
              </dd>
            </div>
            <div class="def-row">
              <dt>触发事件</dt>
              <dd>
                对应 <code class="c">triggerType</code> 字段，指定何时触发评估。可选值：<code
                  class="c"
                  >order_rated</code
                >、<code class="c">order_served</code>、<code class="c">order_created</code>、<code
                  class="c"
                  >recipe_created</code
                >、<code class="c">recipe_favorited</code>、<code class="c">message_sent</code
                >、<code class="c">tip_settled</code>、<code class="c">love_point_earned</code
                >、<code class="c">family_joined</code>、<code class="c">daily_check</code>。
              </dd>
            </div>
            <div class="def-row">
              <dt>归属维度</dt>
              <dd>
                对应 <code class="c">ownerType</code> 字段：<code class="c">user</code
                >（个人徽章）或 <code class="c">family</code>（家庭徽章）。
              </dd>
            </div>
          </dl>

          <h3>评估器参数字段说明</h3>
          <p>
            以下按评估器类型逐一说明 <code class="c">evaluatorConfig</code> 中各字段的作用和格式。
          </p>

          <!-- count -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">count</code>
              <span class="eval-desc">计数达标</span>
            </div>
            <p class="eval-intro">统计数据库中满足条件的记录数，达到阈值即达成。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>model</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span
                  >Prisma 模型名，如 <code class="c">order</code>、<code class="c">rating</code
                  >、<code class="c">orderMessage</code>、<code class="c">lovePointLog</code>、<code
                    class="c"
                    >recipe</code
                  >、<code class="c">recipeFavorite</code></span
                >
              </div>
              <div class="param-row">
                <code>scopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span
                  >作用域字段名。常用值：<code class="c">chefUserId</code>、<code class="c"
                    >customerUserId</code
                  >、<code class="c">raterUserId</code>、<code class="c">senderUserId</code>、<code
                    class="c"
                    >userId</code
                  >、<code class="c">familyId</code>、<code class="c">createdByUserId</code></span
                >
              </div>
              <div class="param-row">
                <code>threshold</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>达标阈值</span>
              </div>
              <div class="param-row">
                <code>filters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span
                  >Prisma where 附加条件，如 <code class="c">{ "status": "completed" }</code>、<code
                    class="c"
                    >{ "stars": 5 }</code
                  >、<code class="c">{ "type": "emoji" }</code></span
                >
              </div>
              <div class="param-row">
                <code>sameDay</code>
                <span class="tag">string</span>
                <span class="opt">否</span>
                <span
                  >限制统计「同一天」的记录。值为日期字段名，如
                  <code class="c">"completedAt"</code></span
                >
              </div>
              <div class="param-row">
                <code>itemFilter</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span
                  >筛选订单中的菜品条件。目前支持
                  <code class="c">{ "recipeDifficulty": &lt;number&gt; }</code
                  >，按菜品难度筛选</span
                >
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "model": "order",
  "scopeBy": "chefUserId",
  "filters": { "status": "completed" },
  "itemFilter": { "recipeDifficulty": 5 },
  "threshold": 3
}</pre
              >
            </div>
          </div>

          <!-- streak -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">streak</code>
              <span class="eval-desc">连续达成</span>
            </div>
            <p class="eval-intro">检查最近 N 条记录是否连续满足某个条件（如五星好评）。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>model</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>Prisma 模型名，通常为 <code class="c">order</code></span>
              </div>
              <div class="param-row">
                <code>scopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>作用域字段名</span>
              </div>
              <div class="param-row">
                <code>length</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>需要连续满足的次数</span>
              </div>
              <div class="param-row">
                <code>check</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span
                  >条件表达式，格式 <code class="c">字段名+操作符+值</code>，如
                  <code class="c">"stars===5"</code>。支持 <code class="c">===</code>、<code
                    class="c"
                    >&gt;=</code
                  >、<code class="c">&lt;=</code>、<code class="c">&gt;</code>、<code class="c"
                    >&lt;</code
                  >、<code class="c">!==</code></span
                >
              </div>
              <div class="param-row">
                <code>include</code>
                <span class="tag">string</span>
                <span class="opt">否</span>
                <span
                  >查询时关联加载的字段，默认 <code class="c">"rating"</code>（用于读取评分的 stars
                  字段）</span
                >
              </div>
              <div class="param-row">
                <code>filters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span>Prisma where 附加条件</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "model": "order",
  "scopeBy": "chefUserId",
  "check": "stars===5",
  "length": 5
}</pre
              >
            </div>
          </div>

          <!-- sum -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">sum</code>
              <span class="eval-desc">聚合求和</span>
            </div>
            <p class="eval-intro">对某个数值字段求和，达到阈值即达成。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>model</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>Prisma 模型名，如 <code class="c">lovePointLog</code></span>
              </div>
              <div class="param-row">
                <code>scopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>作用域字段名</span>
              </div>
              <div class="param-row">
                <code>sumField</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>要求和的数值字段名，如 <code class="c">"changeAmount"</code></span>
              </div>
              <div class="param-row">
                <code>threshold</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>达标阈值</span>
              </div>
              <div class="param-row">
                <code>filters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span>Prisma where 附加条件</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "model": "lovePointLog",
  "scopeBy": "userId",
  "filters": { "changeAmount": { "gt": 0 } },
  "sumField": "changeAmount",
  "threshold": 100
}</pre
              >
            </div>
          </div>

          <!-- time_check -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">time_check</code>
              <span class="eval-desc">时间检查</span>
            </div>
            <p class="eval-intro">
              两种模式：① 时间字段落在指定小时范围内；② 两个时间字段的差值在限定分钟数内。
            </p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>field</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span
                  >要检查的时间字段名，如 <code class="c">"servedAt"</code>、<code class="c"
                    >"completedAt"</code
                  >、<code class="c">"acceptedAt"</code></span
                >
              </div>
              <div class="param-row">
                <code>hourRange</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span
                  >模式①：小时范围
                  <code class="c">{ "start": 23, "end": 5 }</code>（支持跨午夜，23→5 表示 23:00
                  至次日 05:00）</span
                >
              </div>
              <div class="param-row">
                <code>withinMinutesFrom</code>
                <span class="tag">string</span>
                <span class="opt">否</span>
                <span>模式②：起始时间字段名，如 <code class="c">"acceptedAt"</code></span>
              </div>
              <div class="param-row">
                <code>maxMinutes</code>
                <span class="tag">number</span>
                <span class="opt">否</span>
                <span>模式②：最大允许分钟数</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例 · 深夜食堂</div>
              <pre class="eval-code">
{
  "field": "servedAt",
  "hourRange": { "start": 23, "end": 5 }
}</pre
              >
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例 · 闪电大厨</div>
              <pre class="eval-code">
{
  "field": "servedAt",
  "withinMinutesFrom": "acceptedAt",
  "maxMinutes": 30
}</pre
              >
            </div>
          </div>

          <!-- special_date -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">special_date</code>
              <span class="eval-desc">特殊日期</span>
            </div>
            <p class="eval-intro">检查时间字段是否落在指定的节日日期上。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>field</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>时间字段名，如 <code class="c">"completedAt"</code></span>
              </div>
              <div class="param-row">
                <code>dates</code>
                <span class="tag">string[]</span>
                <span class="req">是</span>
                <span
                  >日期数组。固定日期格式 <code class="c">"MM-DD"</code>（如
                  <code class="c">"02-14"</code>）；中秋节用
                  <code class="c">"dynamic_mid_autumn"</code></span
                >
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "field": "completedAt",
  "dates": ["02-14"]
}</pre
              >
            </div>
          </div>

          <!-- family_age -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">family_age</code>
              <span class="eval-desc">家庭天数</span>
            </div>
            <p class="eval-intro">检查家庭创建至今是否满 N 天。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>minDays</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>最低天数。0 表示成立当天即达成。</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "minDays": 100
}</pre
              >
            </div>
          </div>

          <!-- recipe_stat -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">recipe_stat</code>
              <span class="eval-desc">菜谱统计</span>
            </div>
            <p class="eval-intro">检查当前订单中的菜品是否某项统计值达到阈值。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>statField</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span
                  >统计字段名：<code class="c">"orderCount"</code>（被点次数）或
                  <code class="c">"avgRating"</code>（平均评分）</span
                >
              </div>
              <div class="param-row">
                <code>threshold</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>达标阈值</span>
              </div>
              <div class="param-row">
                <code>minOrderCount</code>
                <span class="tag">number</span>
                <span class="opt">否</span>
                <span>最少被点次数（用于 avgRating 场景，避免样本过少）</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例 · 满分菜谱</div>
              <pre class="eval-code">
{
  "statField": "avgRating",
  "threshold": 5.0,
  "minOrderCount": 3
}</pre
              >
            </div>
          </div>

          <!-- first_time -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">first_time</code>
              <span class="eval-desc">首次事件</span>
            </div>
            <p class="eval-intro">检查某类事件是否仅发生过 1 次（即首次触发）。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>model</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>Prisma 模型名</span>
              </div>
              <div class="param-row">
                <code>scopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>作用域字段名</span>
              </div>
              <div class="param-row">
                <code>filters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span>Prisma where 附加条件</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "model": "rating",
  "scopeBy": "raterUserId",
  "filters": { "comment": { "not": null } }
}</pre
              >
            </div>
          </div>

          <!-- message_distinct -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">message_distinct</code>
              <span class="eval-desc">去重计数</span>
            </div>
            <p class="eval-intro">
              统计某个字段的不同取值数量是否达到要求（如使用过多少种不同表情）。
            </p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>model</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>Prisma 模型名</span>
              </div>
              <div class="param-row">
                <code>scopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>作用域字段名</span>
              </div>
              <div class="param-row">
                <code>distinctField</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span
                  >要去重的字段路径，支持嵌套，如 <code class="c">"content.emojiKey"</code></span
                >
              </div>
              <div class="param-row">
                <code>totalCount</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>需要的不重复值数量</span>
              </div>
              <div class="param-row">
                <code>filters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span>Prisma where 附加条件</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "model": "orderMessage",
  "scopeBy": "senderUserId",
  "filters": { "type": "emoji" },
  "distinctField": "content.emojiKey",
  "totalCount": 8
}</pre
              >
            </div>
          </div>

          <!-- no_action -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">no_action</code>
              <span class="eval-desc">未做某事</span>
            </div>
            <p class="eval-intro">
              完成了 N 次某行为，但从未做过另一行为（如完成 10 单但从未催菜）。
            </p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>countModel</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>统计完成数用的 Prisma 模型名</span>
              </div>
              <div class="param-row">
                <code>countScopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>统计的作用域字段名</span>
              </div>
              <div class="param-row">
                <code>countFilters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span>统计的 Prisma where 附加条件</span>
              </div>
              <div class="param-row">
                <code>countThreshold</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>需要达到的完成次数</span>
              </div>
              <div class="param-row">
                <code>excludeModel</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>要排除的行为对应的 Prisma 模型名</span>
              </div>
              <div class="param-row">
                <code>excludeScopeBy</code>
                <span class="tag">string</span>
                <span class="req">是</span>
                <span>排除行为的关联字段名（通常为 <code class="c">"orderId"</code>）</span>
              </div>
              <div class="param-row">
                <code>excludeFilters</code>
                <span class="tag">object</span>
                <span class="opt">否</span>
                <span>排除行为的 Prisma where 附加条件</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例 · 完成十单从未催菜</div>
              <pre class="eval-code">
{
  "countModel": "order",
  "countScopeBy": "familyId",
  "countFilters": { "status": "completed" },
  "countThreshold": 10,
  "excludeModel": "orderMessage",
  "excludeFilters": { "type": "rush" },
  "excludeScopeBy": "orderId"
}</pre
              >
            </div>
          </div>

          <!-- both_members -->
          <div class="eval-card">
            <div class="eval-head">
              <code class="eval-type">both_members</code>
              <span class="eval-desc">双方参与</span>
            </div>
            <p class="eval-intro">检查家庭中双方成员是否各自完成了至少 N 次做菜。</p>
            <div class="param-table">
              <div class="param-row param-header">
                <span>字段</span><span>类型</span><span>必填</span><span>说明</span>
              </div>
              <div class="param-row">
                <code>threshold</code>
                <span class="tag">number</span>
                <span class="req">是</span>
                <span>每个成员至少完成的做菜次数</span>
              </div>
            </div>
            <div class="eval-example">
              <div class="eval-example-label">示例</div>
              <pre class="eval-code">
{
  "threshold": 5
}</pre
              >
            </div>
          </div>

          <h3>操作说明</h3>
          <ul class="steps">
            <li>在徽章列表页面查看所有已定义的徽章及其状态（启用/禁用）。</li>
            <li>点击「新增徽章」按钮创建新的徽章定义。</li>
            <li>编辑现有徽章的名称、图标、描述和触发条件。</li>
            <li>通过启用/禁用开关控制徽章是否参与成就判定。</li>
          </ul>
        </section>

        <!-- §7 意见反馈 -->
        <section id="feedback" class="section">
          <h2>意见反馈</h2>
          <div class="rule">
            <span class="rule-no">§ 7</span><span class="rule-mid">FEEDBACK</span>
          </div>
          <p>意见反馈页面汇总用户通过小程序提交的反馈，方便运营人员及时跟进处理。</p>
          <h3>功能说明</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>反馈列表</dt>
              <dd>展示所有用户反馈，包含反馈类型、内容摘要、提交时间和处理状态。</dd>
            </div>
            <div class="def-row">
              <dt>状态管理</dt>
              <dd>支持将反馈标记为「已处理」，便于追踪处理进度。</dd>
            </div>
          </dl>
        </section>

        <!-- §8 业务配置 -->
        <section id="config" class="section">
          <h2>业务配置</h2>
          <div class="rule">
            <span class="rule-no">§ 8</span><span class="rule-mid">CONFIG</span>
          </div>
          <p>业务配置页面管理系统级别的参数与开关，修改后即时生效。</p>
          <h3>配置项说明</h3>
          <dl class="def-list">
            <div class="def-row">
              <dt>打赏配置</dt>
              <dd>设定打赏比例和上限等参数。</dd>
            </div>
            <div class="def-row">
              <dt>反馈类型</dt>
              <dd>定义用户可选的反馈分类，如功能建议、Bug 报告等。</dd>
            </div>
            <div class="def-row">
              <dt>其他参数</dt>
              <dd>根据业务迭代可能新增的配置项，均在此页面统一管理。</dd>
            </div>
          </dl>
          <p class="note">
            <span class="note-tag warning">注意</span>
            配置修改即时生效，请谨慎操作。建议在修改前确认变更影响范围。
          </p>
        </section>

        <!-- §9 关于 -->
        <section id="about" class="section">
          <h2>关于</h2>
          <div class="rule">
            <span class="rule-no">§ 9</span><span class="rule-mid">ABOUT</span>
          </div>
          <p>
            关于页面展示系统基础信息，包括版本号、后端地址、Swagger
            接口文档链接等，并提供数据库连接健康检测功能。
          </p>
          <h3>常用链接</h3>
          <ul class="steps">
            <li><strong>Swagger 接口文档</strong> — 查看和调试后端 API 接口。</li>
            <li><strong>微信公众平台</strong> — 管理小程序版本、体验版等。</li>
            <li><strong>MinIO 控制台</strong> — 本地对象存储文件管理。</li>
          </ul>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.help-manual {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Hero ─────────────────────────────────────────────────── */
.hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.26em;
  color: var(--persimmon);
  font-weight: 600;
}
.title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(28px, 3.6vw, 40px);
  line-height: 1.05;
  letter-spacing: -0.025em;
  margin: 0;
  color: var(--ink);
}
.title em {
  font-style: italic;
  font-weight: 400;
  color: var(--persimmon);
}

/* ── Two-column layout ────────────────────────────────────── */
.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 40px;
}

/* ── TOC ──────────────────────────────────────────────────── */
.toc {
  position: sticky;
  top: 0;
  align-self: start;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.toc-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--ink-4);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.toc-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.toc-list li {
  padding: 8px 14px;
  font-size: 13.5px;
  color: var(--ink-3);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition:
    color 0.18s ease,
    background 0.18s ease;
  user-select: none;
}
.toc-list li:hover {
  color: var(--ink);
  background: var(--paper-2);
}
.toc-list li.active {
  color: var(--persimmon);
  background: var(--paper-2);
  font-weight: 600;
}

/* ── Content ──────────────────────────────────────────────── */
.content {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 22px;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.015em;
}
.section h3 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--ink);
  margin: 20px 0 0;
}
.section p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--ink-2);
}

/* ── Rule ─────────────────────────────────────────────────── */
.rule {
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--ink-3);
  text-transform: uppercase;
}
.rule::before,
.rule::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ink);
  opacity: 0.18;
}
.rule-no {
  color: var(--persimmon);
  font-weight: 600;
}
.rule-mid {
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.22em;
}

/* ── Definition list ──────────────────────────────────────── */
.def-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.def-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px dotted var(--rule);
}
.def-row:last-child {
  border-bottom: none;
}
.def-row dt {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--ink-3);
  text-transform: uppercase;
  font-weight: 600;
  padding-top: 2px;
}
.def-row dd {
  margin: 0;
  color: var(--ink);
  font-size: 14.5px;
  line-height: 1.6;
}

/* ── Note callout ─────────────────────────────────────────── */
.note {
  padding: 12px 16px;
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: var(--r-sm);
  font-size: 13.5px !important;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.note-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--persimmon);
  flex-shrink: 0;
}
.note-tag.warning {
  color: var(--ember);
}

/* ── Steps list ───────────────────────────────────────────── */
.steps {
  margin: 0;
  padding: 0 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.steps li {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--ink-2);
}
.steps li strong {
  color: var(--ink);
  font-weight: 600;
}

/* ── Flow diagram ─────────────────────────────────────────── */
.flow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 4px 0 8px;
}
.flow-step {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 5px 14px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  color: var(--ink-2);
  background: var(--paper-2);
}
.flow-step.highlight {
  color: var(--persimmon);
  border-color: var(--persimmon);
  background: rgba(192, 74, 44, 0.06);
}
.flow-arrow {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 14px;
}

/* ── Inline code ──────────────────────────────────────────── */
code.c {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--paper-2);
  border: 1px solid var(--rule);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--persimmon);
}

/* ── Evaluator card ───────────────────────────────────────── */
.eval-card {
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: var(--r-sm);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 12px 0;
}
.eval-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.eval-type {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--persimmon);
  background: rgba(192, 74, 44, 0.08);
  padding: 2px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.eval-desc {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--ink-2);
}
.eval-intro {
  margin: 0 !important;
  font-size: 13.5px !important;
  color: var(--ink-3) !important;
}

/* ── Param table ──────────────────────────────────────────── */
.param-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--rule);
  border-radius: 4px;
  overflow: hidden;
  font-size: 13px;
}
.param-row {
  display: grid;
  grid-template-columns: 150px 56px 36px 1fr;
  gap: 0;
  padding: 8px 12px;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
  line-height: 1.5;
}
.param-row:last-child {
  border-bottom: none;
}
.param-header {
  background: var(--paper);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-4);
  font-weight: 600;
}
.param-row code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--persimmon);
}
.param-row .tag {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}
.param-row .req {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--olive);
}
.param-row .opt {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-4);
}
.param-row span:last-child {
  color: var(--ink-2);
  font-size: 13px;
}

/* ── Eval example ─────────────────────────────────────────── */
.eval-example {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.eval-example-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--ink-4);
  text-transform: uppercase;
  font-weight: 600;
}
.eval-code {
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-2);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 12px 16px;
  margin: 0;
  overflow-x: auto;
  white-space: pre;
  tab-size: 2;
}
</style>
