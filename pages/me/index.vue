<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  loadPreferences,
  mutablePreferences as form,
  resetPreferences,
  savePreferences,
  type AnswerDetail,
  type BoardView,
  type FontSizePreference,
} from '../../stores/preferences'
import { resolveCustomNavigationTop } from '../../utils/layout'

const grades = ['初中三年级', '高中一年级', '高中二年级', '高中三年级', '大学基础']
const subjects = ['数学 · 立体几何', '数学 · 平面几何', '物理 · 力学', '化学 · 分子结构']
const details: AnswerDetail[] = ['精简', '标准', '详细']
const views: BoardView[] = ['自动', '正视', '俯视', '等轴测']
const fontSizes: FontSizePreference[] = ['紧凑', '标准', '舒适']
const pageStyle = { paddingTop: resolveCustomNavigationTop() }
const savedNotice = ref(false)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

type ProfileField = 'grade' | 'defaultSubject'
type ToggleField = 'stepMode' | 'autoOpenBoard' | 'showGrid' | 'reducedMotion'

const selectProfile = (
  field: ProfileField,
  values: string[],
  event: { detail: { value: string } },
) => {
  const next = values[Number(event.detail.value)]
  if (next) form[field] = next
}

const selectDetail = (event: { detail: { value: string } }) => {
  const next = details[Number(event.detail.value)]
  if (next) form.answerDetail = next
}

const selectView = (event: { detail: { value: string } }) => {
  const next = views[Number(event.detail.value)]
  if (next) form.defaultView = next
}

const selectFontSize = (event: { detail: { value: string } }) => {
  const next = fontSizes[Number(event.detail.value)]
  if (next) form.fontSize = next
}

const updateToggle = (field: ToggleField, event: Event) => {
  const value = (event as unknown as { detail: { value: boolean } }).detail.value
  form[field] = Boolean(value)
}

const showSavedNotice = () => {
  savedNotice.value = true
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    savedNotice.value = false
  }, 2200)
}

const save = () => {
  savePreferences()
  showSavedNotice()
}

const reset = () => {
  resetPreferences()
  showSavedNotice()
}

onShow(loadPreferences)
onUnmounted(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <view class="settings-page" :style="pageStyle">
    <view class="page-header">
      <text class="page-title">设置</text>
    </view>

    <view class="settings-panels">
      <view class="section-card section-card--profile">
        <view class="panel-heading">
          <view class="panel-heading__title-row">
            <text class="panel-heading__index">01</text>
            <text class="panel-heading__title">学习档案</text>
          </view>
          <text class="panel-heading__description">用于调整讲解难度与默认题目入口。</text>
        </view>

        <view class="field-grid">
          <view class="field-block">
            <text class="field-label">显示名称</text>
            <input
              v-model="form.displayName"
              class="field-input"
              type="text"
              maxlength="20"
              placeholder="请输入显示名称"
            >
          </view>

          <view class="field-block">
            <text class="field-label">学习阶段</text>
            <picker
              mode="selector"
              :range="grades"
              :value="Math.max(0, grades.indexOf(form.grade))"
              @change="selectProfile('grade', grades, $event)"
            >
              <view class="field-select">
                <text>{{ form.grade }}</text>
                <view class="select-chevron" />
              </view>
            </picker>
          </view>

          <view class="field-block">
            <text class="field-label">默认学科</text>
            <picker
              mode="selector"
              :range="subjects"
              :value="Math.max(0, subjects.indexOf(form.defaultSubject))"
              @change="selectProfile('defaultSubject', subjects, $event)"
            >
              <view class="field-select">
                <text>{{ form.defaultSubject }}</text>
                <view class="select-chevron" />
              </view>
            </picker>
          </view>
        </view>
      </view>

      <view class="section-card section-card--solver">
        <view class="panel-heading">
          <view class="panel-heading__title-row">
            <text class="panel-heading__index">02</text>
            <text class="panel-heading__title">解题偏好</text>
          </view>
          <text class="panel-heading__description">控制解答第一次打开时的信息密度。</text>
        </view>

        <view class="setting-list">
          <view class="setting-row">
            <view class="setting-copy">
              <text class="setting-title">逐步阅读</text>
              <text class="setting-description">先显示第一步，再按顺序展开后续推理</text>
            </view>
            <switch class="preference-switch" :checked="form.stepMode" color="#2674de" @change="updateToggle('stepMode', $event)" />
          </view>

          <view class="setting-row">
            <view class="setting-copy">
              <text class="setting-title">进入时打开图解</text>
              <text class="setting-description">预置解答打开后直接显示右侧互动白板</text>
            </view>
            <switch class="preference-switch" :checked="form.autoOpenBoard" color="#2674de" @change="updateToggle('autoOpenBoard', $event)" />
          </view>

          <picker mode="selector" :range="details" :value="Math.max(0, details.indexOf(form.answerDetail))" @change="selectDetail">
            <view class="setting-row setting-row--last">
              <view class="setting-copy">
                <text class="setting-title">讲解密度</text>
                <text class="setting-description">控制每一步中的依据、推导与公式篇幅</text>
              </view>
              <view class="row-select">
                <text>{{ form.answerDetail }}</text>
                <view class="select-chevron" />
              </view>
            </view>
          </picker>
        </view>
      </view>

      <view class="section-card section-card--canvas">
        <view class="panel-heading">
          <view class="panel-heading__title-row">
            <text class="panel-heading__index">03</text>
            <text class="panel-heading__title">阅读与画板</text>
          </view>
          <text class="panel-heading__description">调整阅读舒适度和白板初始状态，不改变解题结果。</text>
        </view>

        <view class="setting-list setting-list--canvas">
          <view class="setting-row setting-row--boxed">
            <view class="setting-copy">
              <text class="setting-title">二维网格</text>
              <text class="setting-description">辅助判断坐标、角度和相对长度</text>
            </view>
            <switch class="preference-switch" :checked="form.showGrid" color="#2674de" @change="updateToggle('showGrid', $event)" />
          </view>

          <picker mode="selector" :range="views" :value="Math.max(0, views.indexOf(form.defaultView))" @change="selectView">
            <view class="setting-row setting-row--boxed">
              <view class="setting-copy">
                <text class="setting-title">三维初始视角</text>
                <text class="setting-description">打开空间图解时使用的相机方向</text>
              </view>
              <view class="row-select">
                <text>{{ form.defaultView }}</text>
                <view class="select-chevron" />
              </view>
            </view>
          </picker>

          <view class="setting-row setting-row--boxed">
            <view class="setting-copy">
              <text class="setting-title">减少动态效果</text>
              <text class="setting-description">降低页面转场与白板过渡动画</text>
            </view>
            <switch class="preference-switch" :checked="form.reducedMotion" color="#2674de" @change="updateToggle('reducedMotion', $event)" />
          </view>

          <picker mode="selector" :range="fontSizes" :value="Math.max(0, fontSizes.indexOf(form.fontSize))" @change="selectFontSize">
            <view class="setting-row setting-row--boxed">
              <view class="setting-copy">
                <text class="setting-title">阅读字号</text>
                <text class="setting-description">同步调整页面正文、控件与题库卡片字号</text>
              </view>
              <view class="row-select">
                <text>{{ form.fontSize }}</text>
                <view class="select-chevron" />
              </view>
            </view>
          </picker>
        </view>
      </view>

      <view class="settings-actions">
        <button class="action-button reset-button" @tap="reset">恢复默认</button>
        <button class="action-button save-button" @tap="save">保存更改</button>
      </view>
    </view>

    <view v-if="savedNotice" class="saved-notice">
      <view class="notice-check">
        <view class="notice-check__short" />
        <view class="notice-check__long" />
      </view>
      <text>设置已保存到当前设备</text>
    </view>

    <view class="page-bottom-space" />
  </view>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-right: 28rpx;
  padding-left: 28rpx;
  color: #1f2937;
  background: #f7f8fa;
}

.page-header { padding: 42rpx 0 39rpx; }

.page-title {
  display: block;
  color: #182234;
  font-size: 56rpx;
  font-weight: 760;
  line-height: 1.15;
  letter-spacing: -1.5rpx;
}

.settings-panels { display: flex; flex-direction: column; gap: 32rpx; }

.section-card {
  min-width: 0;
  padding: 42rpx 36rpx;
  border: 2rpx solid #e5eaf0;
  border-radius: 40rpx;
  background: #fff;
  box-shadow: 0 20rpx 56rpx rgba(31, 41, 55, .04);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 48rpx;
  padding-bottom: 36rpx;
  border-bottom: 2rpx solid #efedf5;
}

.panel-heading__title-row { display: flex; align-items: center; gap: 22rpx; }

.panel-heading__index {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: #1769da;
  font-size: 21rpx;
  font-weight: 850;
  line-height: 1;
  border-radius: 18rpx;
  background: #edf5ff;
}

.section-card--solver .panel-heading__index { color: #168d82; background: #e9faf5; }
.section-card--canvas .panel-heading__index { color: #e45f4f; background: #fff0e8; }

.panel-heading__title { color: #263245; font-size: 32rpx; font-weight: 800; line-height: 1.3; }

.panel-heading__description {
  margin-left: 82rpx;
  color: #929cab;
  font-size: 22rpx;
  line-height: 1.55;
}

.field-grid { display: flex; flex-direction: column; gap: 38rpx; }
.field-block { display: flex; flex-direction: column; gap: 16rpx; }
.field-label { color: #596578; font-size: 23rpx; font-weight: 800; }

.field-input,
.field-select {
  width: 100%;
  height: 90rpx;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 0 24rpx;
  color: #273244;
  font-size: 26rpx;
  font-weight: 600;
  border: 2rpx solid #dfe5ec;
  border-radius: 20rpx;
  background: #fafbfd;
}

.field-select { justify-content: space-between; gap: 20rpx; }

.select-chevron {
  width: 13rpx;
  height: 13rpx;
  flex: none;
  margin: -6rpx 3rpx 0 8rpx;
  border-right: 3rpx solid #8d98a8;
  border-bottom: 3rpx solid #8d98a8;
  transform: rotate(45deg);
}

.setting-list { display: flex; flex-direction: column; }

.setting-row {
  min-height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30rpx;
  box-sizing: border-box;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f1eff6;
}

.setting-row--last { border-bottom: 0; }
.setting-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 10rpx; }
.setting-title { color: #3b4759; font-size: 26rpx; font-weight: 800; line-height: 1.35; }
.setting-description { color: #929cab; font-size: 22rpx; line-height: 1.5; }
.preference-switch { flex: none; transform: scale(.82); transform-origin: right center; }

.row-select {
  width: 212rpx;
  min-height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  box-sizing: border-box;
  gap: 16rpx;
  padding: 0 22rpx;
  color: #273244;
  font-size: 24rpx;
  font-weight: 650;
  border: 2rpx solid #dfe5ec;
  border-radius: 20rpx;
  background: #fafbfd;
}

.setting-list--canvas { gap: 24rpx; }

.setting-row--boxed {
  min-height: 152rpx;
  padding: 28rpx 26rpx;
  border: 2rpx solid #edf0f4;
  border-radius: 26rpx;
  background: #fbfcfd;
}

.settings-actions { display: flex; gap: 20rpx; padding-top: 8rpx; }

.action-button {
  min-width: 0;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin: 0;
  padding: 0 24rpx;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 92rpx;
  border-radius: 20rpx;
}

.action-button::after { border: 0; }
.reset-button { color: #687386; border: 2rpx solid #dce2e9; background: #fff; }

.save-button {
  color: #fff;
  border: 2rpx solid #1769da;
  background: #2674de;
  box-shadow: 0 18rpx 38rpx rgba(38, 116, 222, .18);
}

.saved-notice {
  position: fixed;
  z-index: 30;
  right: 28rpx;
  bottom: calc(168rpx + env(safe-area-inset-bottom));
  left: 28rpx;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  box-sizing: border-box;
  padding: 20rpx 28rpx;
  color: #376f5d;
  font-size: 25rpx;
  font-weight: 800;
  border: 2rpx solid #c6eadc;
  border-radius: 24rpx;
  background: #f1fbf7;
  box-shadow: 0 28rpx 68rpx rgba(44, 94, 76, .13);
}

.notice-check {
  position: relative;
  width: 30rpx;
  height: 30rpx;
  flex: none;
  box-sizing: border-box;
  border: 3rpx solid currentColor;
  border-radius: 50%;
}

.notice-check__short,
.notice-check__long {
  position: absolute;
  height: 3rpx;
  border-radius: 99rpx;
  background: currentColor;
  transform-origin: left center;
}

.notice-check__short { top: 14rpx; left: 6rpx; width: 8rpx; transform: rotate(45deg); }
.notice-check__long { top: 19rpx; left: 12rpx; width: 13rpx; transform: rotate(-48deg); }
.page-bottom-space { height: calc(150rpx + env(safe-area-inset-bottom)); }

@media (max-width: 380px) {
  .setting-row:not(.setting-row--boxed) { align-items: stretch; flex-direction: column; }
  .setting-row:not(.setting-row--boxed) .row-select { width: 100%; }
}

@media (min-width: 768px) {
  .settings-page { padding-right: 44rpx; padding-left: 44rpx; }
  .settings-panels { flex-flow: row wrap; }
  .section-card--profile,
  .section-card--solver { width: calc(50% - 16rpx); box-sizing: border-box; }
  .section-card--canvas,
  .settings-actions { width: 100%; }
  .setting-list--canvas { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
