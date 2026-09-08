<script setup lang="ts">
import {computed} from 'vue'
import formulaImages from '../data/formulas.json'
const props=withDefaults(defineProps<{value?:string;size?:number}>(),{value:'',size:28})
const images=formulaImages as Record<string,{src:string;width:number;height:number}>
const runs=computed(()=>{
  const result:Array<{text:string;src?:string;width?:number;height?:number}>=[]
  const pattern=/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g
  let cursor=0
  for(const match of props.value.matchAll(pattern)){
    if(match.index!>cursor)result.push({text:props.value.slice(cursor,match.index)})
    const image=images[match[0]]
    result.push(image?{text:match[0],...image}:{text:match[1]??match[2]??match[3]??match[4]??match[0]})
    cursor=match.index!+match[0].length
  }
  if(cursor<props.value.length)result.push({text:props.value.slice(cursor)})
  return result
})
</script>
<template>
  <view class="catalog-text" :style="{fontSize:size+'rpx'}">
    <template v-for="(run,i) in runs" :key="i">
      <image v-if="run.src" class="math-image" :src="run.src" :style="{width:run.width!*size/32+'rpx',height:run.height!*size/32+'rpx'}" mode="aspectFit" :aria-label="run.text" />
      <text v-else user-select>{{ run.text }}</text>
    </template>
  </view>
</template>
<style scoped>
.catalog-text{color:inherit;line-height:1.9;white-space:pre-wrap;overflow-wrap:break-word;overflow-x:auto}
.math-image{display:inline-block;vertical-align:middle;flex-shrink:0;margin:0 2rpx}
</style>
