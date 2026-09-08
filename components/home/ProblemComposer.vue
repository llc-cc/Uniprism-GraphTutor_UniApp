<script setup lang="ts">
import { computed, ref } from 'vue'
import MiniFormulaVoicePanel from '../formula/MiniFormulaVoicePanel.vue'
import { useSpokenFormulaVoice } from '../../composables/useSpokenFormulaVoice'

const props = withDefaults(defineProps<{
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: { question: string; imagePath?: string; imageName?: string }]
}>()

const prompt = ref('')
const imagePath = ref('')
const imageName = ref('')
const errorText = ref('')
const voice = useSpokenFormulaVoice()
const {
  status: voiceStatus,
  seconds: voiceSeconds,
  transcript: voiceTranscript,
  resolution: voiceResolution,
  selectedCandidateIndex: voiceSelectedCandidateIndex,
  selectedLatex: voiceSelectedLatex,
  errorMessage: voiceErrorMessage,
  permissionRecoveryRequired: voicePermissionRecoveryRequired,
} = voice
const voiceActive = computed(() => voice.status.value !== 'idle')

const chooseProblemImage = (sourceType: 'camera' | 'album') => {
  if (props.loading) return

  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: [sourceType],
    success: (result) => {
      const path = result.tempFiles[0]?.tempFilePath
      if (!path) return

      imagePath.value = path
      imageName.value = sourceType === 'camera' ? '刚刚拍摄的题目' : '从相册选择的题目'
      errorText.value = ''
    },
    fail: (error) => {
      if (error.errMsg.toLowerCase().includes('cancel')) return
      errorText.value = sourceType === 'camera'
        ? '暂时无法打开相机，请检查授权后重试。'
        : '图片读取失败，请重新选择。'
    },
  })
}

const openImagePicker = () => {
  if (props.loading) return

  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (result) => {
      chooseProblemImage(result.tapIndex === 0 ? 'camera' : 'album')
    },
  })
}

const clearImage = () => {
  if (props.loading) return
  imagePath.value = ''
  imageName.value = ''
}

const toggleVoice = () => {
  if (props.loading) return
  if (voice.isListening.value) {
    voice.stop()
    return
  }
  if (voice.isBusy.value) return
  if (voice.status.value === 'preview' || voice.status.value === 'error') voice.cancel()
  errorText.value = ''
  void voice.start()
}

const insertSpokenFormula = (latex: string) => {
  const formula = `$${latex.trim()}$`
  prompt.value = [prompt.value.trim(), formula].filter(Boolean).join(' ')
  voice.cancel()
}

const submitProblem = () => {
  if (props.loading) return
  if (voice.isBusy.value) {
    if (voice.isListening.value) voice.stop()
    errorText.value = '请先完成语音公式识别，再提交题目。'
    return
  }

  const question = prompt.value.trim()
  if (!question && !imagePath.value) {
    errorText.value = '写下一道题，或先上传题目图片。'
    return
  }

  errorText.value = ''
  emit('submit', {
    question: question || '请识别题图中的题目，并给出分步解答。',
    imagePath: imagePath.value || undefined,
    imageName: imageName.value || undefined,
  })
}

</script>

<template>
  <view :class="['composer', { 'composer--loading': loading }]">
    <textarea
      v-model="prompt"
      class="composer__input"
      :disabled="loading"
      :maxlength="600"
      :show-confirm-bar="false"
      :adjust-position="true"
      :disable-default-padding="true"
      :cursor-spacing="24"
      confirm-type="done"
      placeholder="输入、拍照或说出问题，逐步查看推理与交互图解。"
      placeholder-class="composer__placeholder"
    />

    <view v-if="imagePath" class="image-preview">
      <image
        class="image-preview__thumb"
        :src="imagePath"
        mode="aspectFill"
        aria-label="已选择的题目图片"
      />
      <view class="image-preview__copy">
        <view class="image-preview__status">
          <view class="image-preview__status-dot" />
          <text>题图已就绪</text>
        </view>
        <text class="image-preview__name">{{ imageName }}</text>
      </view>
      <button
        class="image-preview__remove"
        :disabled="loading"
        hover-class="button-hover"
        aria-label="移除题图"
        @tap="clearImage"
      >
        <text>移除</text>
      </button>
    </view>

    <MiniFormulaVoicePanel
      v-if="voiceStatus !== 'idle'"
      :status="voiceStatus"
      :seconds="voiceSeconds"
      :transcript="voiceTranscript"
      :resolution="voiceResolution"
      :selected-candidate-index="voiceSelectedCandidateIndex"
      :selected-latex="voiceSelectedLatex"
      :error-message="voiceErrorMessage"
      :permission-recovery-required="voicePermissionRecoveryRequired"
      @stop="voice.stop"
      @cancel="voice.cancel"
      @retry="voice.retry"
      @relisten="voice.start()"
      @clarify="voice.answerClarification"
      @select="voice.selectCandidate"
      @insert="insertSpokenFormula"
    />

    <view v-if="errorText" class="composer-error" role="alert">
      <view class="composer-error__icon">
        <text>!</text>
      </view>
      <text>{{ errorText }}</text>
    </view>

    <view class="composer__actions">
      <view class="composer__tools">
        <button
          class="tool-button"
          :disabled="loading"
          hover-class="tool-button--hover"
          @tap="openImagePicker"
        >
          <view class="tool-button__icon tool-button__icon--image">
            <view class="image-glyph">
              <view class="image-glyph__sun" />
              <view class="image-glyph__mountain" />
            </view>
          </view>
          <text>上传题图</text>
        </button>

        <button
          :class="['tool-button', { 'tool-button--active': voiceActive }]"
          :disabled="loading"
          hover-class="tool-button--hover"
          @tap="toggleVoice"
        >
          <view class="tool-button__icon tool-button__icon--voice">
            <view class="microphone-glyph">
              <view class="microphone-glyph__body" />
              <view class="microphone-glyph__stand" />
            </view>
          </view>
          <text>{{ voice.isListening.value ? '停止' : voice.isBusy.value ? '处理中…' : '语音公式' }}</text>
        </button>
      </view>

      <button
        :class="['submit-button', { 'submit-button--disabled': loading }]"
        :disabled="loading"
        hover-class="submit-button--hover"
        aria-label="提交题目"
        @tap="submitProblem"
      >
        <view v-if="loading" class="submit-loading" aria-label="正在准备解题">
          <view class="submit-loading__dot submit-loading__dot--one" />
          <view class="submit-loading__dot submit-loading__dot--two" />
          <view class="submit-loading__dot submit-loading__dot--three" />
        </view>
        <view v-else class="submit-arrow">
          <view class="submit-arrow__shaft" />
          <view class="submit-arrow__head" />
        </view>
      </button>
    </view>

    <view v-if="loading" class="composer__progress">
      <view class="composer__progress-bar" />
      <text>正在整理题目并准备图解…</text>
    </view>
  </view>
</template>

<style scoped>
.composer {
  position: relative;
  width: 100%;
  margin-top: 28rpx;
  padding: 18rpx 18rpx 16rpx;
  overflow: hidden;
  border: 1rpx solid #d9dde4;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 36rpx rgba(31, 41, 55, 0.05);
  box-sizing: border-box;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.composer--loading {
  border-color: #b8d0f4;
  box-shadow: 0 20rpx 56rpx rgba(57, 116, 232, 0.11);
}

.composer__input {
  width: 100%;
  height: 140rpx;
  min-height: 140rpx;
  padding: 8rpx 10rpx;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.7;
  background: transparent;
  box-sizing: border-box;
}

:deep(.composer__placeholder) {
  color: #a0a8b4;
  font-size: 28rpx;
  font-weight: 450;
  line-height: 1.65;
}

.image-preview {
  display: flex;
  align-items: center;
  min-height: 103rpx;
  margin-top: 9rpx;
  padding: 10rpx;
  border: 1rpx solid #cbe9dd;
  border-radius: 18rpx;
  background: #f2fbf7;
  box-sizing: border-box;
}

.image-preview__thumb {
  width: 94rpx;
  height: 78rpx;
  flex: 0 0 94rpx;
  border-radius: 13rpx;
  background: #e7ecef;
}

.image-preview__copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-left: 17rpx;
}

.image-preview__status {
  display: flex;
  align-items: center;
  color: #20826b;
  font-size: 22rpx;
  font-weight: 750;
}

.image-preview__status-dot {
  width: 8rpx;
  height: 8rpx;
  margin-right: 8rpx;
  border-radius: 50%;
  background: #35a88a;
}

.image-preview__name {
  max-width: 310rpx;
  margin-top: 8rpx;
  overflow: hidden;
  color: #607069;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-preview__remove,
.voice-state__done {
  height: 54rpx;
  margin: 0;
  padding: 0 18rpx;
  color: #6e7c8f;
  font-size: 21rpx;
  font-weight: 650;
  line-height: 54rpx;
  border: 0;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.82);
}

.image-preview__remove::after,
.voice-state__done::after,
.tool-button::after,
.submit-button::after {
  border: 0;
}

.button-hover {
  opacity: 0.7;
}

.voice-state {
  display: flex;
  align-items: center;
  min-height: 90rpx;
  margin-top: 10rpx;
  padding: 12rpx 12rpx 12rpx 18rpx;
  border: 1rpx solid #cbdcf7;
  border-radius: 18rpx;
  background: #f2f7ff;
  box-sizing: border-box;
}

.voice-state__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 52rpx;
  gap: 5rpx;
}

.voice-wave {
  width: 5rpx;
  border-radius: 999rpx;
  background: #3974e8;
  animation: voice-wave 760ms ease-in-out infinite alternate;
}

.voice-wave--one,
.voice-wave--five {
  height: 16rpx;
}

.voice-wave--two,
.voice-wave--four {
  height: 31rpx;
  animation-delay: -260ms;
}

.voice-wave--three {
  height: 43rpx;
  animation-delay: -480ms;
}

.voice-state__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-left: 8rpx;
}

.voice-state__title {
  color: #315f9f;
  font-size: 22rpx;
  font-weight: 750;
}

.voice-state__hint {
  margin-top: 6rpx;
  color: #7f94b1;
  font-size: 19rpx;
}

.voice-state__done {
  color: #3974e8;
  border: 1rpx solid #c9daf5;
  background: #ffffff;
}

.composer-error {
  display: flex;
  align-items: center;
  min-height: 54rpx;
  margin-top: 13rpx;
  padding: 0 14rpx;
  color: #b84f3d;
  font-size: 21rpx;
  font-weight: 600;
  border-radius: 12rpx;
  background: #fff3ef;
  box-sizing: border-box;
}

.composer-error__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27rpx;
  height: 27rpx;
  margin-right: 10rpx;
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 800;
  line-height: 1;
  border-radius: 50%;
  background: #d96954;
}

.composer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 4rpx 2rpx;
  border-top: 1rpx solid #eef0f3;
}

.composer__tools {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 62rpx;
  margin: 0 12rpx 0 0;
  padding: 0 18rpx 0 12rpx;
  color: #4b5563;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 62rpx;
  border: 1rpx solid #dfe3e8;
  border-radius: 14rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.tool-button--hover,
.tool-button--active {
  color: #2c68c6;
  border-color: #bdd1f1;
  background: #f3f7fe;
}

.tool-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 41rpx;
  height: 41rpx;
  margin-right: 9rpx;
  border-radius: 10rpx;
}

.tool-button__icon--image,
.tool-button__icon--voice {
  background: transparent;
}

.image-glyph {
  position: relative;
  width: 24rpx;
  height: 20rpx;
  overflow: hidden;
  border: 3rpx solid currentColor;
  border-radius: 4rpx;
  box-sizing: border-box;
}

.image-glyph__sun {
  position: absolute;
  right: 3rpx;
  top: 3rpx;
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: currentColor;
}

.image-glyph__mountain {
  position: absolute;
  left: 3rpx;
  bottom: -5rpx;
  width: 13rpx;
  height: 13rpx;
  border-radius: 2rpx;
  background: currentColor;
  transform: rotate(45deg);
}

.microphone-glyph {
  position: relative;
  width: 21rpx;
  height: 27rpx;
}

.microphone-glyph__body {
  position: absolute;
  left: 6rpx;
  top: 0;
  width: 11rpx;
  height: 18rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.microphone-glyph__stand {
  position: absolute;
  left: 3rpx;
  top: 7rpx;
  width: 17rpx;
  height: 15rpx;
  border: solid currentColor;
  border-width: 0 3rpx 3rpx;
  border-radius: 0 0 10rpx 10rpx;
  box-sizing: border-box;
}

.microphone-glyph__stand::after {
  position: absolute;
  left: 5rpx;
  bottom: -8rpx;
  width: 8rpx;
  height: 3rpx;
  border-radius: 999rpx;
  background: currentColor;
  content: '';
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 72rpx;
  flex: 0 0 84rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 16rpx;
  background: #176fe5;
  box-shadow: 0 12rpx 24rpx rgba(23, 111, 229, 0.22);
}

.submit-button--hover {
  background: #2f67d2;
  transform: translateY(1rpx);
}

.submit-button--disabled {
  opacity: 1;
  background: #6e97df;
}

.submit-arrow {
  position: relative;
  width: 32rpx;
  height: 28rpx;
}

.submit-arrow__shaft {
  position: absolute;
  left: 3rpx;
  top: 13rpx;
  width: 26rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: #ffffff;
}

.submit-arrow__head {
  position: absolute;
  right: 2rpx;
  top: 7rpx;
  width: 12rpx;
  height: 12rpx;
  border: solid #ffffff;
  border-width: 4rpx 4rpx 0 0;
  transform: rotate(45deg);
}

.submit-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.submit-loading__dot {
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: #ffffff;
  animation: submit-dot 700ms ease-in-out infinite alternate;
}

.submit-loading__dot--two {
  animation-delay: 150ms;
}

.submit-loading__dot--three {
  animation-delay: 300ms;
}

.composer__progress {
  display: flex;
  align-items: center;
  margin-top: 17rpx;
  color: #6780a4;
  font-size: 20rpx;
  font-weight: 600;
}

.composer__progress-bar {
  width: 77rpx;
  height: 7rpx;
  margin-right: 12rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #dce8fa;
}

.composer__progress-bar::after {
  display: block;
  width: 35rpx;
  height: 100%;
  border-radius: inherit;
  background: #3974e8;
  content: '';
  animation: progress-slide 900ms ease-in-out infinite alternate;
}

@keyframes voice-wave {
  from { transform: scaleY(0.55); opacity: 0.65; }
  to { transform: scaleY(1); opacity: 1; }
}

@keyframes submit-dot {
  from { transform: translateY(3rpx); opacity: 0.45; }
  to { transform: translateY(-3rpx); opacity: 1; }
}

@keyframes progress-slide {
  from { transform: translateX(0); }
  to { transform: translateX(42rpx); }
}
</style>
