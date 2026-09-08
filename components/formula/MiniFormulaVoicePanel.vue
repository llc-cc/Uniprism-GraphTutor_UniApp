<script setup lang="ts">
import { computed } from 'vue'
import type {
  SpokenFormulaClarificationOption,
  SpokenFormulaResolution,
} from '../../services/spoken-formula'
import type { SpokenFormulaVoiceStatus } from '../../composables/useSpokenFormulaVoice'

const props = defineProps<{
  status: SpokenFormulaVoiceStatus
  seconds: number
  transcript: string
  resolution: SpokenFormulaResolution | null
  selectedCandidateIndex: number
  selectedLatex: string
  errorMessage: string
  permissionRecoveryRequired?: boolean
  showKeyboardAction?: boolean
}>()

const emit = defineEmits<{
  stop: []
  cancel: []
  retry: []
  relisten: []
  clarify: [option: SpokenFormulaClarificationOption]
  select: [index: number]
  insert: [latex: string]
}>()

const formattedTime = computed(() => {
  const seconds = String(props.seconds % 60).padStart(2, '0')
  const minutes = String(Math.floor(props.seconds / 60)).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const progressLabels: Partial<Record<SpokenFormulaVoiceStatus, string>> = {
  checking: '正在连接 SenseVoice 语音服务…',
  requestingPermission: '正在请求麦克风权限…',
  preparing: '正在将录音转换为标准音频…',
  transcribing: '正在识别语音…',
  converting: '正在转换为数学公式…',
}

const progressText = computed(() => progressLabels[props.status] ?? '正在处理…')

const recoveryOptions = computed(() => (
  props.resolution?.clarification?.options.filter((option) => (
    option.action !== 'selectCandidate'
    && (props.showKeyboardAction || option.action !== 'useKeyboard')
  )) ?? []
))
</script>

<template>
  <view class="voice-panel">
    <view v-if="status === 'listening'" class="voice-panel__listening">
      <view class="voice-panel__live" />
      <view class="voice-panel__copy">
        <text class="voice-panel__title">正在听，请说一个短公式</text>
        <text class="voice-panel__meta">{{ formattedTime }} / 00:15</text>
      </view>
      <button class="voice-panel__button voice-panel__button--primary" @tap="emit('stop')">停止</button>
      <button class="voice-panel__button" @tap="emit('cancel')">取消</button>
    </view>

    <view
      v-else-if="status === 'checking' || status === 'requestingPermission' || status === 'preparing' || status === 'transcribing' || status === 'converting'"
      class="voice-panel__progress"
    >
      <view class="voice-panel__spinner" />
      <text class="voice-panel__progress-copy">{{ progressText }}</text>
      <button class="voice-panel__button" @tap="emit('cancel')">取消</button>
    </view>

    <view v-else-if="status === 'preview' && resolution" class="voice-panel__preview">
      <text class="voice-panel__recognized">识别内容：{{ resolution.recognizedText }}</text>
      <text v-if="resolution.clarification" class="voice-panel__clarification">{{ resolution.clarification.question }}</text>

      <view v-if="resolution.candidates.length" class="voice-panel__candidates">
        <button
          v-for="(candidate, index) in resolution.candidates"
          :key="candidate.id"
          :class="['voice-panel__candidate', { 'voice-panel__candidate--active': index === selectedCandidateIndex }]"
          @tap="emit('select', index)"
        >
          <text class="voice-panel__latex">{{ candidate.latex }}</text>
          <text class="voice-panel__spoken">{{ candidate.spokenBack }}{{ candidate.matchKind === 'partial' ? '（公式片段）' : '' }}</text>
        </button>
      </view>

      <text v-for="warning in resolution.warnings" :key="warning" class="voice-panel__warning">{{ warning }}</text>

      <view v-if="recoveryOptions.length" class="voice-panel__actions">
        <button
          v-for="option in recoveryOptions"
          :key="option.id"
          class="voice-panel__button"
          @tap="emit('clarify', option)"
        >{{ option.label }}</button>
      </view>

      <view class="voice-panel__actions">
        <button class="voice-panel__button" @tap="emit('cancel')">取消</button>
        <button class="voice-panel__button" @tap="emit('relisten')">重新说</button>
        <button
          v-if="selectedLatex"
          class="voice-panel__button voice-panel__button--insert"
          @tap="emit('insert', selectedLatex)"
        >插入公式</button>
      </view>
    </view>

    <view v-else class="voice-panel__error">
      <text class="voice-panel__error-title">{{ errorMessage || '语音公式处理失败，请重试。' }}</text>
      <text v-if="transcript" class="voice-panel__recognized">本次识别：{{ transcript }}</text>
      <view class="voice-panel__actions">
        <button class="voice-panel__button" @tap="emit('cancel')">取消</button>
        <button class="voice-panel__button voice-panel__button--primary" @tap="emit('retry')">{{ permissionRecoveryRequired ? '去开启' : '重试' }}</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.voice-panel {
  margin: 16rpx 0 6rpx;
  padding: 18rpx;
  color: #394a60;
  border: 1rpx solid #d7e3f4;
  border-radius: 20rpx;
  background: #f6f9fe;
}

.voice-panel__listening,
.voice-panel__progress {
  display: flex;
  min-height: 62rpx;
  align-items: center;
}

.voice-panel__live {
  width: 18rpx;
  height: 18rpx;
  flex: 0 0 18rpx;
  margin-right: 14rpx;
  border: 5rpx solid #d8e8ff;
  border-radius: 50%;
  background: #3974e8;
  animation: formula-voice-pulse 780ms ease-in-out infinite alternate;
}

.voice-panel__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.voice-panel__title,
.voice-panel__error-title {
  font-size: 23rpx;
  font-weight: 700;
  line-height: 1.45;
}

.voice-panel__meta {
  margin-top: 3rpx;
  color: #7c8ca2;
  font-size: 19rpx;
}

.voice-panel__progress {
  gap: 14rpx;
  font-size: 23rpx;
}

.voice-panel__progress-copy {
  min-width: 0;
  flex: 1;
}

.voice-panel__spinner {
  width: 24rpx;
  height: 24rpx;
  flex: 0 0 24rpx;
  border: 4rpx solid #d9e5f6;
  border-top-color: #3974e8;
  border-radius: 50%;
  animation: formula-voice-spin 720ms linear infinite;
}

.voice-panel__preview,
.voice-panel__error {
  display: flex;
  flex-direction: column;
}

.voice-panel__recognized,
.voice-panel__clarification,
.voice-panel__warning {
  font-size: 22rpx;
  line-height: 1.55;
}

.voice-panel__clarification {
  margin-top: 10rpx;
  color: #285b9e;
  font-weight: 700;
}

.voice-panel__candidates {
  display: flex;
  margin-top: 14rpx;
  flex-direction: column;
  gap: 10rpx;
}

.voice-panel__candidate {
  display: flex;
  width: 100%;
  min-height: 80rpx;
  margin: 0;
  padding: 12rpx 16rpx;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  border: 1rpx solid #d7dfeb;
  border-radius: 14rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.voice-panel__candidate--active {
  border-color: #3974e8;
  box-shadow: 0 0 0 3rpx rgba(57, 116, 232, 0.1);
}

.voice-panel__latex {
  color: #1e5fb8;
  font-family: Cambria, Georgia, serif;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.45;
  word-break: break-all;
}

.voice-panel__spoken {
  margin-top: 4rpx;
  color: #7b8798;
  font-size: 19rpx;
  line-height: 1.45;
}

.voice-panel__warning {
  margin-top: 9rpx;
  color: #b25a33;
}

.voice-panel__actions {
  display: flex;
  margin-top: 16rpx;
  flex-wrap: wrap;
  gap: 10rpx;
}

.voice-panel__button {
  width: auto;
  height: 54rpx;
  min-height: 0;
  margin: 0;
  padding: 0 17rpx;
  color: #52647a;
  font-size: 20rpx;
  font-weight: 650;
  line-height: 54rpx;
  border: 1rpx solid #d8e0eb;
  border-radius: 999rpx;
  background: #ffffff;
}

.voice-panel__button--primary,
.voice-panel__button--insert {
  color: #ffffff;
  border-color: #3974e8;
  background: #3974e8;
}

.voice-panel__button::after,
.voice-panel__candidate::after {
  border: 0;
}

@keyframes formula-voice-spin {
  to { transform: rotate(360deg); }
}

@keyframes formula-voice-pulse {
  from { opacity: 0.62; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}
</style>
