<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { ensureVisitorSession } from '@/stores/session'
import { loadPreferences } from '@/stores/preferences'

onLaunch(() => {
  ensureVisitorSession()
  loadPreferences()
})

onShow(() => {
  ensureVisitorSession()
})
</script>

<style>
page {
  min-height: 100%;
  color: #1f2937;
  background: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}

view,
text,
image,
button,
input,
textarea,
scroll-view,
switch,
picker {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  line-height: inherit;
  background: transparent;
}

button::after {
  border: 0;
}

.safe-page {
  min-height: 100vh;
  padding-top: var(--status-bar-height);
  background: #f7f8fa;
}

.tap-feedback {
  transition: opacity 120ms ease, transform 120ms ease;
}

.tap-feedback:active {
  opacity: .78;
  transform: scale(.985);
}
</style>
