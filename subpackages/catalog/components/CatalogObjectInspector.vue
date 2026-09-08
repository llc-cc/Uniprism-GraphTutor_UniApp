<script setup lang="ts">
import type {CatalogObjectInspection} from '../inspection'

defineProps<{inspection:CatalogObjectInspection}>()
defineEmits<{close:[]}>()
</script>

<template>
  <view class="object-inspector">
    <view class="inspector-identity">
      <view class="inspector-icon" :class="`inspector-icon--${inspection.objectType}`"><view class="inspector-icon-mark" /></view>
      <view class="inspector-title-wrap"><text class="inspector-title">{{ inspection.title }}</text></view>
      <button class="inspector-close" aria-label="关闭属性面板" @tap.stop="$emit('close')">×</button>
    </view>
    <view class="inspector-fields">
      <view v-for="field in inspection.fields" :key="field.label" class="inspector-field" :class="{'inspector-field--status':field.label==='当前状态'}">
        <text class="inspector-field-label">{{ field.label }}</text>
        <text class="inspector-field-value" :class="{'inspector-field-value--code':field.code}">{{ field.value }}</text>
      </view>
    </view>
    <view class="inspector-tip">
      <text class="inspector-tip-label">学习提示</text>
      <text class="inspector-tip-text">{{ inspection.learningTip }}</text>
    </view>
  </view>
</template>

<style scoped>
.object-inspector{box-sizing:border-box;width:100%;height:100%;max-height:100%;padding:24rpx;overflow-y:auto;color:#22304a;border:1px solid #dbe3ed;border-radius:24rpx;background:#fffffff7;box-shadow:0 22rpx 54rpx #19263c2e}
.inspector-identity{display:flex;align-items:flex-start;gap:18rpx;min-width:0}
.inspector-icon{position:relative;width:68rpx;height:68rpx;display:flex;align-items:center;justify-content:center;box-sizing:border-box;flex-shrink:0;border:1px solid #bfd5ea;border-radius:20rpx;background:#edf4fb}
.inspector-icon-mark{width:15rpx;height:15rpx;box-sizing:border-box;border:4rpx solid #fff;border-radius:50%;background:#2f72bd;box-shadow:0 0 0 4rpx #2f72bd}
.inspector-icon--segment .inspector-icon-mark,.inspector-icon--vector .inspector-icon-mark,.inspector-icon--curve .inspector-icon-mark{width:40rpx;height:5rpx;border:0;border-radius:4rpx;background:#2f72bd;box-shadow:none;transform:rotate(-32deg)}
.inspector-icon--angle .inspector-icon-mark{width:32rpx;height:32rpx;border:0;border-left:4rpx solid #2f72bd;border-bottom:4rpx solid #2f72bd;border-radius:0;background:transparent;box-shadow:none;transform:rotate(-18deg)}
.inspector-icon--polygon .inspector-icon-mark,.inspector-icon--solid .inspector-icon-mark{width:34rpx;height:30rpx;border:4rpx solid #2f72bd;border-radius:5rpx;background:#2f72bd1f;box-shadow:none}
.inspector-title-wrap{min-width:0;flex:1;padding-top:8rpx}.inspector-title{display:block;font-size:34rpx;font-weight:760;line-height:1.25;word-break:break-all}
.inspector-close{width:52rpx;height:52rpx;line-height:48rpx;min-width:52rpx;margin:0;padding:0;color:#64748b;font-size:34rpx;border:1px solid #dbe2eb;border-radius:14rpx;background:#fff}.inspector-close::after{border:0}
.inspector-fields{display:flex;flex-wrap:wrap;margin-top:20rpx}
.inspector-field{box-sizing:border-box;width:50%;min-width:0;padding:16rpx 12rpx 16rpx 0;border-bottom:1px solid #e5eaf1}
.inspector-field--status{border-bottom-color:#d6e8df}.inspector-field--status .inspector-field-value{color:#24714f;font-weight:750}
.inspector-field-label{display:block;color:#5b687c;font-size:21rpx;font-weight:800;letter-spacing:1rpx}.inspector-field-value{display:block;margin-top:8rpx;color:#334155;font-size:27rpx;line-height:1.35;word-break:break-all}.inspector-field-value--code{font-weight:700}
.inspector-tip{margin-top:20rpx;padding-top:20rpx;border-top:1px solid #dfe6ee}.inspector-tip-label{display:block;color:#175da8;font-size:19rpx;font-weight:800;letter-spacing:2rpx}.inspector-tip-text{display:block;margin-top:12rpx;color:#5f6877;font-size:24rpx;line-height:1.65}
</style>
