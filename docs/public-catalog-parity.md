# Web 公开例题与小程序对照

本次以 Web `PUBLIC_PROBLEMS` 中的 51 题为准，共 117 步：空间几何 5 题、物理 36 题、乙醇 1 题、题图题 4 题、专题数学 5 题。物理中 28 道标准图素材在 Web 本身只有一步，未人为添加解题步骤。

## 数据与页面

- `data/web-problems.json`：广场、首页、收藏和记录共同使用的 51 题入口。
- `subpackages/catalog/data/problems.json`：每题独立的题干、已知条件、目标、思路、步骤、公式、结论、图解。
- `solution-payload.ts` / `vector-styles.json`：同一份数据的紧凑运行时入口和共享样式。避免调试模式把 JSON 展开成大对象，导致 HBuilderX 运行时分包超限；不要把页面入口改回直接导入 `problems.json`。
- `subpackages/catalog/data/source-manifest.json`：Web ID、步骤 ID、图页 ID 的逐项对照。
- `subpackages/catalog/index.vue`：统一移动端解题页、逐步展开、查看插图、全屏、步骤答疑、公式键盘和既有语音入口。
- `subpackages/catalog/components/CatalogCanvas.vue`：一个持续挂载的原生 Canvas；换步骤立即清屏重画。手势事件合并到动画帧，并为开发者工具离屏暂停动画帧提供定时兜底。

二维图使用 Web 白板组件输出的真实 SVG 几何和计算后样式，导出为原生 Canvas 指令，保留楔形键、虚线、箭头、曲线和标签。三维图使用 Web 编译后的原始空间坐标、图元、镜头和状态色，在小程序中进行空间投影，支持旋转、平移和双指缩放；并非静态截图。

原题图片和 237 处去重数学公式全部本地打包，不依赖外部 SVG 或视频地址。公式由 Web 使用的 KaTeX 排版输出；题图第 4 题原始数据中未展开的 `${bs}` 仅在公式显示时按反斜杠处理，题源文本保留用于对照。

首页原有三道题的 miniapp ID 保留以兼容历史记录；Web ID 单独保存。公开题统一进入 catalog 分包，旧 solver 地址自动重定向。用户自行输入/上传的草稿仍走原 solver，不冒充已补齐的公开题。

步骤答疑发送真实的题目、步骤、图页和选中对象上下文，服务失败时保留输入并显示错误，不生成假的答疑成功消息。录音授权与后端服务可用性仍需项目已有配置。

## 检查

在小程序根目录执行：

```powershell
node scripts/verify-public-catalog.cjs
```

校验 51 个唯一题目、117 个对应步骤、96 张二维图、21 张三维图、全部原题图片和公式本地资源，以及公开题导航路由。编译可继续使用 HBuilderX 的“运行到微信开发者工具”，无需安装运行时绘图库。

## 随 Web 更新重新生成

Web 仓库需已安装其依赖；本机需 Chrome。以下命令在小程序根目录运行：

```powershell
$env:GRAPHTUTOR_WEB_ROOT='D:\ywkeji\Uniprism\UniPrism_GraphTutor'
node scripts/web-catalog/audit-web.cjs
node scripts/web-catalog/capture-vectors.mjs
node scripts/web-catalog/package-catalog.cjs
node scripts/web-catalog/capture-formulas.mjs
node scripts/verify-public-catalog.cjs
```

生成器直接读取 Web 的几何 resolver、物理 DSL、乙醇 DSL、worksheet preset、topic example，以及白板的 SVG 组件和样式。不要手工把新题指向另一道题的通用解题模板。若题库数量变动，核对源清单后相应更新检查脚本中的基准数量。
