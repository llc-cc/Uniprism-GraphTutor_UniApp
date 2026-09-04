/**
 * Returns a top inset below Weixin's native capsule for custom-navigation pages.
 * The CSS fallback keeps other uni-app targets usable as well.
 */
export const resolveCustomNavigationTop = (gapPx = 8): string => {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton?.bottom) return `${menuButton.bottom + gapPx}px`
  } catch {
    // Some non-Weixin targets do not expose capsule geometry.
  }

  return 'calc(var(--status-bar-height) + 72rpx)'
}
