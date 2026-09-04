<script setup lang="ts">
import { computed, ref } from 'vue'

interface FormulaKey {
  id: string
  label: string
  value: string
  name?: string
  cursorBack?: number
}

interface FormulaCategory {
  id: string
  label: string
  description: string
  keys: FormulaKey[]
}

interface FormulaKeySeed {
  label: string
  value?: string
  name?: string
  cursorBack?: number
}

const emit = defineEmits<{
  insert: [key: { value: string; cursorBack?: number }]
  move: [offset: number]
  backspace: []
  done: []
}>()

const keys = (prefix: string, seeds: Array<string | FormulaKeySeed>): FormulaKey[] => (
  seeds.map((seed, index) => {
    const item = typeof seed === 'string' ? { label: seed, value: seed } : seed
    return {
      id: `${prefix}-${index}`,
      label: item.label,
      value: item.value ?? item.label,
      name: item.name,
      cursorBack: item.cursorBack,
    }
  })
)

const functionKeys = (prefix: string, names: string[]): FormulaKey[] => keys(
  prefix,
  names.map((name) => ({ label: name, value: `${name}()`, name: '函数', cursorBack: 1 })),
)

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    id: 'common',
    label: '常用',
    description: '数字与基础运算',
    keys: keys('common', [
      '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+',
      '≠', '≈', '<', '>', '≤', '≥', '%', ':',
    ]),
  },
  {
    id: 'templates',
    label: '模板',
    description: '分式、幂与常用结构',
    keys: keys('templates', [
      { label: '( )', value: '()', name: '圆括号', cursorBack: 1 },
      { label: '[ ]', value: '[]', name: '方括号', cursorBack: 1 },
      { label: '{ }', value: '{}', name: '花括号', cursorBack: 1 },
      { label: '|x|', value: '||', name: '绝对值', cursorBack: 1 },
      { label: 'a/b', value: '()/()', name: '分式', cursorBack: 4 },
      { label: 'x²', value: '()²', name: '平方', cursorBack: 2 },
      { label: 'xⁿ', value: '^()', name: '幂', cursorBack: 1 },
      { label: '√x', value: '√()', name: '平方根', cursorBack: 1 },
      { label: 'ⁿ√x', value: '√[]()', name: 'n 次根', cursorBack: 3 },
      { label: 'Σ', value: 'Σ()', name: '求和', cursorBack: 1 },
      { label: '∫', value: '∫()d', name: '积分', cursorBack: 2 },
      { label: 'lim', value: 'lim()', name: '极限', cursorBack: 1 },
      { label: 'f(x)', value: 'f()', name: '函数', cursorBack: 1 },
      { label: '(x,y)', value: '(,)', name: '坐标', cursorBack: 2 },
      { label: 'P(A)', value: 'P()', name: '概率', cursorBack: 1 },
      { label: 'Cₙᵐ', value: 'C()', name: '组合数', cursorBack: 1 },
      { label: 'Aₙᵐ', value: 'A()', name: '排列数', cursorBack: 1 },
      { label: '⌊x⌋', value: '⌊⌋', name: '向下取整', cursorBack: 1 },
      { label: '⌈x⌉', value: '⌈⌉', name: '向上取整', cursorBack: 1 },
      '±',
    ]),
  },
  {
    id: 'functions',
    label: '函数',
    description: '三角、对数与统计函数',
    keys: functionKeys('functions', [
      'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'log',
      'ln', 'lg', 'exp', 'max', 'min', 'gcd', 'lcm', 'mod',
    ]),
  },
  {
    id: 'geometry',
    label: '几何',
    description: '平面与立体几何符号',
    keys: keys('geometry', [
      '∠', '△', '⊥', '∥', '≌', '∽', '°', 'π', '⊙', '⌒', '→', '↔',
      { label: '向量', value: '向量()', name: '向量', cursorBack: 1 },
      { label: '平面', value: '平面()', name: '平面', cursorBack: 1 },
      'α', 'β', 'θ', 'φ', '∵', '∴',
    ]),
  },
  {
    id: 'sets',
    label: '集合',
    description: '集合与逻辑关系',
    keys: keys('sets', [
      '∈', '∉', '∋', '⊂', '⊆', '⊄', '⊃', '⊇', '∪', '∩', '∅', 'N', 'Z', 'Q', 'R',
      'C', '∀', '∃', '⇒', '⇔', '¬', '∧', '∨',
    ]),
  },
  {
    id: 'greek',
    label: '希腊',
    description: '常用希腊字母',
    keys: keys('greek', [
      'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο',
      'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω',
    ]),
  },
  {
    id: 'letters',
    label: '字母',
    description: '大小写拉丁字母',
    keys: keys('letters', [
      ...'abcdefghijklmnopqrstuvwxyz'.split(''),
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    ]),
  },
  {
    id: 'physics',
    label: '物理',
    description: '物理量、常量与单位',
    keys: keys('physics', [
      'v', 'a', 't', 's', 'F', 'm', 'g', 'N', 'Eₖ', 'Eₚ', 'W', 'P', 'p', 'ρ', 'T',
      'Q', 'U', 'I', 'R', 'm', 's', 'kg', 'N', 'J', 'W', 'Pa', 'V', 'A', 'Ω', 'm/s', 'm/s²',
    ]),
  },
]

const PAGE_SIZE = 15
const activeCategoryId = ref(FORMULA_CATEGORIES[0]?.id ?? 'common')
const pageIndex = ref(0)

const activeCategory = computed(() => (
  FORMULA_CATEGORIES.find((item) => item.id === activeCategoryId.value) ?? FORMULA_CATEGORIES[0]!
))
const pageCount = computed(() => Math.max(1, Math.ceil(activeCategory.value.keys.length / PAGE_SIZE)))
const visibleKeys = computed(() => {
  const start = pageIndex.value * PAGE_SIZE
  return activeCategory.value.keys.slice(start, start + PAGE_SIZE)
})

const selectCategory = (id: string) => {
  activeCategoryId.value = id
  pageIndex.value = 0
}

const changePage = (offset: number) => {
  pageIndex.value = Math.max(0, Math.min(pageIndex.value + offset, pageCount.value - 1))
}

const insertKey = (key: FormulaKey) => {
  emit('insert', { value: key.value, cursorBack: key.cursorBack })
}
</script>

<template>
  <view class="formula-panel">
    <view class="formula-panel__header">
      <view class="formula-panel__heading">
        <text class="formula-panel__title">公式与符号</text>
        <text class="formula-panel__subtitle">点按插入到光标位置</text>
      </view>
      <button class="formula-panel__close" aria-label="关闭公式键盘" @tap="emit('done')">完成</button>
    </view>

    <scroll-view class="formula-panel__tabs" scroll-x :show-scrollbar="false">
      <view class="formula-panel__tabs-inner">
        <button
          v-for="category in FORMULA_CATEGORIES"
          :key="category.id"
          :class="['formula-panel__tab', { 'formula-panel__tab--active': category.id === activeCategoryId }]"
          @tap="selectCategory(category.id)"
        >{{ category.label }}</button>
      </view>
    </scroll-view>

    <view class="formula-panel__section-head">
      <text class="formula-panel__section-name">{{ activeCategory.label }}</text>
      <text class="formula-panel__description">{{ activeCategory.description }}</text>
      <view v-if="pageCount > 1" class="formula-panel__pager">
        <button
          :disabled="pageIndex === 0"
          :class="['formula-panel__page-button', { 'formula-panel__page-button--disabled': pageIndex === 0 }]"
          @tap="changePage(-1)"
        >‹</button>
        <text class="formula-panel__page-text">{{ pageIndex + 1 }}/{{ pageCount }}</text>
        <button
          :disabled="pageIndex + 1 >= pageCount"
          :class="['formula-panel__page-button', { 'formula-panel__page-button--disabled': pageIndex + 1 >= pageCount }]"
          @tap="changePage(1)"
        >›</button>
      </view>
    </view>

    <view class="formula-panel__grid">
      <button
        v-for="key in visibleKeys"
        :key="key.id"
        class="formula-panel__key"
        hover-class="formula-panel__key--pressed"
        :aria-label="key.name || key.label"
        @tap="insertKey(key)"
      >
        <text class="formula-panel__key-label">{{ key.label }}</text>
        <text v-if="key.name" class="formula-panel__key-name">{{ key.name }}</text>
      </button>
    </view>

    <view class="formula-panel__actions">
      <button class="formula-panel__action" aria-label="光标左移" @tap="emit('move', -1)">←</button>
      <button class="formula-panel__action" aria-label="光标右移" @tap="emit('move', 1)">→</button>
      <button class="formula-panel__action formula-panel__action--space" @tap="emit('insert', { value: ' ' })">空格</button>
      <button class="formula-panel__action" aria-label="退格" @tap="emit('backspace')">⌫</button>
      <button class="formula-panel__action formula-panel__action--done" @tap="emit('done')">确认</button>
    </view>
  </view>
</template>

<style scoped>
.formula-panel {
  overflow: hidden;
  width: 100%;
  margin-top: 16rpx;
  border: 1rpx solid #d8dfeb;
  border-radius: 24rpx;
  box-sizing: border-box;
  background: #f2f5fa;
  box-shadow: 0 12rpx 30rpx rgba(34, 52, 78, 0.09);
}

.formula-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 18rpx 14rpx 22rpx;
  background: #ffffff;
}

.formula-panel__heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.formula-panel__title {
  color: #25344a;
  font-size: 25rpx;
  font-weight: 750;
  line-height: 34rpx;
}

.formula-panel__subtitle {
  margin-top: 2rpx;
  color: #8a96a8;
  font-size: 19rpx;
  line-height: 28rpx;
}

.formula-panel__close {
  min-width: 88rpx;
  height: 50rpx;
  margin: 0;
  padding: 0 20rpx;
  color: #315fcf;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 50rpx;
  border: 0;
  border-radius: 999rpx;
  background: #edf3ff;
}

.formula-panel__tabs {
  width: 100%;
  white-space: nowrap;
  border-top: 1rpx solid #edf0f5;
  border-bottom: 1rpx solid #dce3ee;
  background: #ffffff;
}

.formula-panel__tabs-inner {
  display: inline-flex;
  padding: 11rpx 16rpx;
}

.formula-panel__tab {
  min-width: 84rpx;
  height: 52rpx;
  margin: 0 8rpx 0 0;
  padding: 0 18rpx;
  color: #67758a;
  font-size: 21rpx;
  font-weight: 650;
  line-height: 52rpx;
  border: 0;
  border-radius: 14rpx;
  background: transparent;
}

.formula-panel__tab--active {
  color: #ffffff;
  background: #315fcf;
  box-shadow: 0 5rpx 12rpx rgba(49, 95, 207, 0.22);
}

.formula-panel__section-head {
  display: flex;
  align-items: center;
  min-height: 62rpx;
  padding: 10rpx 18rpx 2rpx;
}

.formula-panel__section-name {
  color: #314158;
  font-size: 22rpx;
  font-weight: 750;
}

.formula-panel__description {
  min-width: 0;
  margin-left: 10rpx;
  overflow: hidden;
  flex: 1;
  color: #8a96a8;
  font-size: 18rpx;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.formula-panel__pager {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  margin-left: 8rpx;
}

.formula-panel__page-button {
  width: 45rpx;
  height: 43rpx;
  margin: 0;
  padding: 0;
  color: #53647a;
  font-size: 29rpx;
  line-height: 41rpx;
  border: 0;
  border-radius: 10rpx;
  background: #e2e7ef;
}

.formula-panel__page-button--disabled {
  color: #b6bfcb;
  opacity: 1;
}

.formula-panel__page-text {
  min-width: 58rpx;
  color: #718096;
  font-size: 18rpx;
  font-weight: 700;
  text-align: center;
}

.formula-panel__grid {
  display: flex;
  min-height: 240rpx;
  padding: 5rpx 13rpx 13rpx;
  flex-wrap: wrap;
  align-content: flex-start;
}

.formula-panel__key {
  display: flex;
  width: calc(20% - 10rpx);
  height: 72rpx;
  min-height: 0;
  margin: 5rpx;
  padding: 4rpx 2rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #26374f;
  line-height: 1;
  border: 1rpx solid #cdd6e3;
  border-radius: 13rpx;
  box-sizing: border-box;
  background: #ffffff;
  box-shadow: 0 3rpx 7rpx rgba(37, 52, 73, 0.06);
}

.formula-panel__key--pressed {
  color: #214fbd;
  background: #e6edff;
  transform: translateY(1rpx);
}

.formula-panel__key-label {
  max-width: 100%;
  overflow: hidden;
  font-family: Georgia, "Times New Roman", "PingFang SC", serif;
  font-size: 27rpx;
  font-weight: 650;
  line-height: 31rpx;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.formula-panel__key-name {
  max-width: 100%;
  margin-top: 2rpx;
  overflow: hidden;
  color: #8a96a8;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  font-size: 14rpx;
  font-weight: 500;
  line-height: 18rpx;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.formula-panel__actions {
  display: flex;
  padding: 13rpx;
  border-top: 1rpx solid #dbe2ed;
  background: #e9edf4;
}

.formula-panel__action {
  min-width: 0;
  height: 62rpx;
  min-height: 0;
  margin: 0 8rpx 0 0;
  padding: 0;
  flex: 1;
  color: #43536a;
  font-size: 25rpx;
  font-weight: 700;
  line-height: 62rpx;
  border: 1rpx solid #cbd4e0;
  border-radius: 13rpx;
  background: #ffffff;
}

.formula-panel__action--space {
  flex: 1.35;
  font-size: 20rpx;
}

.formula-panel__action--done {
  margin-right: 0;
  flex: 1.45;
  color: #ffffff;
  font-size: 21rpx;
  background: #27364b;
  border-color: #27364b;
}

.formula-panel__close::after,
.formula-panel__tab::after,
.formula-panel__page-button::after,
.formula-panel__key::after,
.formula-panel__action::after {
  border: 0;
}
</style>
