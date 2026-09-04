<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import {
  loadPreferences,
  mutablePreferences as form,
  resetPreferences,
  savePreferences,
  type AnswerDetail,
  type BoardView,
  type FontSizePreference,
} from '@/stores/preferences'
import { sessionState } from '@/stores/session'
import { resolveCustomNavigationTop } from '@/utils/layout'

const grades = ['初中三年级', '高中一年级', '高中二年级', '高中三年级', '大学基础']
const subjects = ['数学 · 立体几何', '数学 · 平面几何', '物理 · 力学', '化学 · 分子结构']
const details: AnswerDetail[] = ['精简', '标准', '详细']
const views: BoardView[] = ['自动', '正视', '俯视', '等轴测']
const fontSizes: FontSizePreference[] = ['紧凑', '标准', '舒适']
const pageStyle = { paddingTop: resolveCustomNavigationTop() }

onShow(loadPreferences)

const selectFromPicker = (field: 'grade' | 'defaultSubject', values: string[], event: { detail: { value: string } }) => {
  const index = Number(event.detail.value)
  if (values[index]) form[field] = values[index]
}

type ToggleField = 'stepMode' | 'autoOpenBoard' | 'showGrid' | 'reducedMotion'

const updateToggle = (field: ToggleField, event: Event) => {
  const { value } = (event as unknown as { detail: { value: boolean } }).detail
  form[field] = Boolean(value)
}

const save = () => {
  savePreferences()
  uni.showToast({ title: '偏好已保存', icon: 'success' })
}

const reset = () => {
  resetPreferences()
  uni.showToast({ title: '已恢复默认', icon: 'none' })
}
</script>

<template>
  <view class="me-page safe-page" :style="pageStyle">
    <view class="topbar">
      <view class="brand">
        <image class="brand__logo" src="/static/prism-logo.png" mode="aspectFit" />
        <view>
          <text class="brand__name">万有棱镜</text>
          <text class="brand__sub">学习与画板偏好</text>
        </view>
      </view>
    </view>

    <view class="content">
      <view class="profile-card">
        <view class="avatar">{{ form.displayName.slice(0, 1) }}</view>
        <view class="profile-card__copy">
          <text class="profile-card__name">{{ form.displayName }}</text>
          <text class="profile-card__meta">游客体验 · {{ form.grade }}</text>
        </view>
        <view class="guest-badge">本机模式</view>
      </view>

      <view class="auth-note">
        <view class="auth-note__icon">i</view>
        <text>登录接口正在接入中。当前设置、收藏和浏览记录会安全保存在本机，不影响页面体验。</text>
      </view>

      <view class="section-card">
        <view class="section-heading">
          <text class="section-heading__index">01</text>
          <view><text class="section-heading__title">学习档案</text><text class="section-heading__desc">用于调整默认讲解入口</text></view>
        </view>

        <label class="field-row">
          <view><text class="field-row__title">显示名称</text><text class="field-row__desc">仅保存在当前设备</text></view>
          <input v-model="form.displayName" class="name-input" maxlength="12" />
        </label>
        <picker :range="grades" :value="grades.indexOf(form.grade)" @change="selectFromPicker('grade', grades, $event)">
          <view class="field-row">
            <view><text class="field-row__title">学习阶段</text><text class="field-row__desc">决定讲解所用的知识层级</text></view>
            <text class="field-value">{{ form.grade }} ›</text>
          </view>
        </picker>
        <picker :range="subjects" :value="subjects.indexOf(form.defaultSubject)" @change="selectFromPicker('defaultSubject', subjects, $event)">
          <view class="field-row field-row--last">
            <view><text class="field-row__title">默认学科</text><text class="field-row__desc">首页文字题目的默认入口</text></view>
            <text class="field-value">{{ form.defaultSubject }} ›</text>
          </view>
        </picker>
      </view>

      <view class="section-card">
        <view class="section-heading section-heading--mint">
          <text class="section-heading__index">02</text>
          <view><text class="section-heading__title">解题偏好</text><text class="section-heading__desc">控制首次打开时的信息密度</text></view>
        </view>
        <view class="field-row">
          <view><text class="field-row__title">逐步阅读</text><text class="field-row__desc">按顺序展开依据、推导与结论</text></view>
          <switch :checked="form.stepMode" color="#3974E8" @change="updateToggle('stepMode', $event)" />
        </view>
        <view class="field-row">
          <view><text class="field-row__title">进入时打开图解</text><text class="field-row__desc">有图步骤优先展示互动白板</text></view>
          <switch :checked="form.autoOpenBoard" color="#3974E8" @change="updateToggle('autoOpenBoard', $event)" />
        </view>
        <view class="option-row">
          <text class="field-row__title">讲解密度</text>
          <view class="segmented">
            <button v-for="item in details" :key="item" :class="['segment', { active: form.answerDetail === item }]" @tap="form.answerDetail = item">{{ item }}</button>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-heading section-heading--coral">
          <text class="section-heading__index">03</text>
          <view><text class="section-heading__title">阅读与画板</text><text class="section-heading__desc">调整图解初始状态与阅读舒适度</text></view>
        </view>
        <view class="field-row">
          <view><text class="field-row__title">二维网格</text><text class="field-row__desc">辅助观察坐标、角度与比例</text></view>
          <switch :checked="form.showGrid" color="#3974E8" @change="updateToggle('showGrid', $event)" />
        </view>
        <view class="field-row field-row--last">
          <view><text class="field-row__title">减少动态效果</text><text class="field-row__desc">降低页面和图解过渡动画</text></view>
          <switch :checked="form.reducedMotion" color="#3974E8" @change="updateToggle('reducedMotion', $event)" />
        </view>
        <view class="option-row">
          <text class="field-row__title">默认视角</text>
          <scroll-view scroll-x class="chips-scroll">
            <view class="chips">
              <button v-for="item in views" :key="item" :class="['chip', { active: form.defaultView === item }]" @tap="form.defaultView = item">{{ item }}</button>
            </view>
          </scroll-view>
        </view>
        <view class="option-row option-row--last">
          <text class="field-row__title">阅读字号</text>
          <view class="segmented">
            <button v-for="item in fontSizes" :key="item" :class="['segment', { active: form.fontSize === item }]" @tap="form.fontSize = item">{{ item }}</button>
          </view>
        </view>
      </view>

      <view class="device-id">设备档案 {{ sessionState.visitorId.slice(-10) || '初始化中' }}</view>

      <view class="actions">
        <button class="reset-button tap-feedback" @tap="reset">恢复默认</button>
        <button class="save-button tap-feedback" @tap="save">保存更改</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.me-page { padding-bottom: calc(148rpx + env(safe-area-inset-bottom)); }
.topbar { padding: 26rpx 32rpx 14rpx; }
.brand { display: flex; align-items: center; gap: 18rpx; }
.brand__logo { width: 74rpx; height: 74rpx; border-radius: 18rpx; }
.brand > view { display: flex; flex-direction: column; gap: 5rpx; }
.brand__name { color: #17233c; font-size: 34rpx; font-weight: 800; letter-spacing: 1rpx; }
.brand__sub { color: #8a95a6; font-size: 20rpx; }
.content { padding: 18rpx 28rpx 24rpx; }
.profile-card { display: flex; align-items: center; gap: 20rpx; padding: 28rpx; border: 1rpx solid #e3e8ef; border-radius: 30rpx; background: #fff; box-shadow: 0 16rpx 40rpx rgba(31, 41, 55, .05); }
.avatar { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; flex: none; color: #fff; font-size: 34rpx; font-weight: 800; border-radius: 26rpx; background: linear-gradient(145deg, #3974e8, #6d91ee); }
.profile-card__copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 8rpx; }
.profile-card__name { color: #182234; font-size: 31rpx; font-weight: 800; }
.profile-card__meta { color: #8a95a6; font-size: 22rpx; }
.guest-badge { padding: 9rpx 14rpx; color: #3974e8; font-size: 20rpx; font-weight: 700; border-radius: 999rpx; background: #edf5ff; }
.auth-note { display: flex; gap: 14rpx; margin: 20rpx 2rpx 26rpx; padding: 20rpx 22rpx; color: #61718a; font-size: 22rpx; line-height: 1.65; border: 1rpx solid #d8e7f8; border-radius: 22rpx; background: #f0f7ff; }
.auth-note__icon { width: 34rpx; height: 34rpx; display: flex; align-items: center; justify-content: center; flex: none; margin-top: 2rpx; color: #fff; font-size: 20rpx; font-weight: 800; border-radius: 50%; background: #3974e8; }
.section-card { margin-top: 22rpx; padding: 26rpx 26rpx 10rpx; border: 1rpx solid #e4e9f0; border-radius: 28rpx; background: #fff; box-shadow: 0 12rpx 34rpx rgba(31, 41, 55, .035); }
.section-heading { display: flex; align-items: center; gap: 16rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid #eef1f5; }
.section-heading__index { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; flex: none; color: #3974e8; font-size: 20rpx; font-weight: 800; border-radius: 15rpx; background: #edf5ff; }
.section-heading--mint .section-heading__index { color: #168d82; background: #e9faf5; }
.section-heading--coral .section-heading__index { color: #d95d4f; background: #fff0e8; }
.section-heading > view { display: flex; flex-direction: column; gap: 5rpx; }
.section-heading__title { color: #263245; font-size: 29rpx; font-weight: 800; }
.section-heading__desc { color: #98a1af; font-size: 20rpx; }
.field-row { min-height: 116rpx; display: flex; align-items: center; justify-content: space-between; gap: 22rpx; border-bottom: 1rpx solid #eff2f5; }
.field-row > view:first-child { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 7rpx; }
.field-row--last { border-bottom: 0; }
.field-row__title { color: #3b4759; font-size: 25rpx; font-weight: 750; }
.field-row__desc { color: #96a0ae; font-size: 20rpx; line-height: 1.45; }
.field-value { max-width: 270rpx; color: #3974e8; font-size: 22rpx; font-weight: 700; text-align: right; }
.name-input { width: 210rpx; height: 68rpx; padding: 0 16rpx; color: #273244; font-size: 24rpx; text-align: right; border: 1rpx solid #dde4ec; border-radius: 16rpx; background: #fafbfd; }
.option-row { padding: 22rpx 0; border-top: 1rpx solid #eff2f5; }
.option-row--last { padding-bottom: 14rpx; }
.option-row > .field-row__title { display: block; margin-bottom: 18rpx; }
.segmented { display: flex; padding: 6rpx; border-radius: 18rpx; background: #f0f3f7; }
.segment { height: 62rpx; display: flex; align-items: center; justify-content: center; flex: 1; color: #7a8596; font-size: 22rpx; font-weight: 700; border-radius: 14rpx; }
.segment.active { color: #2868ca; background: #fff; box-shadow: 0 5rpx 15rpx rgba(31, 50, 80, .08); }
.chips-scroll { width: 100%; white-space: nowrap; }
.chips { display: inline-flex; gap: 12rpx; padding-right: 8rpx; }
.chip { height: 58rpx; padding: 0 24rpx; color: #758195; font-size: 21rpx; font-weight: 700; border: 1rpx solid #dce3ec; border-radius: 999rpx; background: #fff; }
.chip.active { color: #2868ca; border-color: #bdd3f3; background: #edf5ff; }
.device-id { margin: 24rpx 0 6rpx; color: #a2aab5; font-size: 19rpx; text-align: center; }
.actions { display: flex; gap: 16rpx; margin-top: 20rpx; }
.actions button { height: 82rpx; display: flex; align-items: center; justify-content: center; font-size: 25rpx; font-weight: 800; border-radius: 22rpx; }
.reset-button { flex: 1; color: #697588; border: 1rpx solid #dce2e9; background: #fff; }
.save-button { flex: 1.45; color: #fff; background: #3974e8; box-shadow: 0 12rpx 24rpx rgba(57, 116, 232, .2); }
</style>
