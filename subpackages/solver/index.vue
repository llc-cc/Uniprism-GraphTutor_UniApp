<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  getLocalProblemDrafts,
  PUBLIC_PROBLEMS,
  resolveProblemArtwork,
  type ProblemSubject,
} from '../../data/problems'
import {
  loadPreferences,
  preferencesState,
  type BoardView,
} from '../../stores/preferences'
import { resolveCustomNavigationTop } from '../../utils/layout'
import PrismWorkspace from '../../components/geometry/PrismWorkspace.vue'
import IllustratedSolution from '../../components/solver/IllustratedSolution.vue'
import { PRISM_2023A_QUESTION, PRISM_2023A_STEPS } from '../../data/prism-2023a'

type PageMode = 'steps' | 'diagram'
type DiagramKind =
  | 'math-function'
  | 'math-prism'
  | 'math-ellipse'
  | 'math-generic'
  | 'physics-incline'
  | 'physics-projectile'
  | 'chemistry-molecule'
  | 'chemistry-equilibrium'
  | 'worksheet-graph'
  | 'worksheet-circuit'
  | 'worksheet-generic'

interface SolutionStep {
  title: string
  basis: string
  derivation: string
  briefDerivation: string
  conclusion: string
  detail: string
  diagramCaption: string
  focusObject: string
}

interface DiagramObject {
  id: string
  label: string
  symbol: string
  firstStep: number
  description: string
}

interface SolverTemplate {
  key: string
  subject: ProblemSubject
  kind: DiagramKind
  defaultTitle: string
  statement: string
  diagramTitle: string
  recommendedView: BoardView
  steps: SolutionStep[]
  objects: DiagramObject[]
}

interface PendingProblem {
  id?: string
  title?: string
  question?: string
  subject?: string
  imagePath?: string
  imageName?: string
  source?: string
}

interface PageQuery {
  id?: string
  source?: string
  title?: string
  subject?: string
}

interface FollowUpExchange {
  id: number
  question: string
  answer: string
  context: string
}

const step = (
  title: string,
  basis: string,
  derivation: string,
  briefDerivation: string,
  conclusion: string,
  detail: string,
  diagramCaption: string,
  focusObject: string,
): SolutionStep => ({
  title,
  basis,
  derivation,
  briefDerivation,
  conclusion,
  detail,
  diagramCaption,
  focusObject,
})

const object = (
  id: string,
  label: string,
  symbol: string,
  firstStep: number,
  description: string,
): DiagramObject => ({ id, label, symbol, firstStep, description })

const MATH_FUNCTION: SolverTemplate = {
  key: 'math-function',
  subject: 'math',
  kind: 'math-function',
  defaultTitle: '二次函数图像的平移与零点',
  statement: '已知 y = (x − 2)² − 1，求函数图像的顶点、对称轴和零点。',
  diagramTitle: '二次函数平移图',
  recommendedView: '正视',
  objects: [
    object('axes', '坐标系', 'x / y', 0, '坐标轴提供位置参照，便于读取平移方向和关键点。'),
    object('curve', '函数图像', 'y = (x−2)²−1', 0, '蓝色抛物线由基本图像 y=x² 向右、向下平移得到。'),
    object('vertex', '顶点', 'V(2,−1)', 1, '标准式 y=(x−h)²+k 的顶点为 (h,k)。'),
    object('roots', '两个零点', 'x=1, 3', 2, '零点是图像与 x 轴的交点。'),
    object('symmetry', '对称轴', 'x=2', 3, '顶点所在竖线是抛物线的对称轴。'),
  ],
  steps: [
    step('识别标准式', '二次函数已写成 y = (x − h)² + k。', '对照可得 h = 2、k = −1，图像由 y=x² 向右平移 2、再向下平移 1。', '对照标准式，读出 h=2、k=−1。', '平移方向是右 2、下 1。', '括号内的“−2”对应横向右移，括号外的“−1”对应纵向下移。', '先建立坐标系，并把基本抛物线移动到新位置。', 'curve'),
    step('确定顶点', '标准式的顶点坐标直接由 (h,k) 给出。', '代入 h=2、k=−1，顶点为 V(2,−1)，最小值为 −1。', '由 (h,k) 读出顶点。', '顶点 V(2,−1)。', '因为二次项系数为正，抛物线开口向上，顶点也是最低点。', '标出珊瑚色顶点，它控制整条曲线的位置。', 'vertex'),
    step('求出零点', '零点满足 y=0。', '令 (x−2)²−1=0，得到 (x−2)²=1，因此 x=1 或 x=3。', '令 y=0 并解方程。', '两个零点为 (1,0)、(3,0)。', '两个解关于 x=2 对称，与图像的轴对称性质一致。', '两个蓝色交点落在 x 轴上，并关于顶点对称。', 'roots'),
    step('补充对称轴并校验', '抛物线关于经过顶点的竖直直线对称。', '作直线 x=2；两个零点到它的距离均为 1，代回原式也都得到 0。', '作 x=2，并检查关键点。', '对称轴 x=2，关键量相互吻合。', '可再取 x=0 与 x=4，函数值相同，从数值上复核轴对称。', '虚线穿过顶点，完整呈现顶点、零点与对称关系。', 'symmetry'),
  ],
}

const MATH_PRISM: SolverTemplate = {
  key: 'math-prism',
  subject: 'math',
  kind: 'math-prism',
  defaultTitle: '正四棱柱中的截面与二面角',
  statement: PRISM_2023A_QUESTION,
  diagramTitle: '棱柱关键截面',
  recommendedView: '等轴测',
  objects: [
    object('prism', '正四棱柱', 'ABCD−A₁B₁C₁D₁', 0, '柱体骨架提供垂直和平行关系，四个分点落在侧棱上。'),
    object('section', '截面 A₂B₂C₂D₂', '▱', 1, '两组对边向量相等，因此截面是平行四边形。'),
    object('angle', '二面角', '150°', 2, '公共棱为 A₂C₂，两半平面夹角为 150° 时 B₂P=1。'),
  ],
  steps: PRISM_2023A_STEPS.map((item, index) => step(
    item.title,
    item.summary,
    item.detail,
    item.summary,
    item.formula,
    item.detail,
    item.scene.description,
    ['prism', 'section', 'angle'][index] || 'prism',
  )),
}

const MATH_ELLIPSE: SolverTemplate = {
  key: 'math-ellipse',
  subject: 'math',
  kind: 'math-ellipse',
  defaultTitle: '椭圆切线与焦点三角形',
  statement: '联动切点、两个焦点和切线方向，把焦点三角形的几何关系转为代数关系。',
  diagramTitle: '椭圆切点关系图',
  recommendedView: '正视',
  objects: [
    object('ellipse', '椭圆', 'E', 0, '椭圆上的点满足到两个焦点的距离和为常数。'),
    object('focus', '两个焦点', 'F₁ / F₂', 0, '焦点是构造焦点三角形的两个固定顶点。'),
    object('tangent', '切线', 'l', 1, '切线在切点处只有一个公共点，其斜率受导数或判别式约束。'),
    object('triangle', '焦点三角形', '△F₁PF₂', 2, '连接切点与焦点后，可使用距离和、余弦定理或面积关系。'),
    object('relation', '约束关系', 'Δ = 0', 3, '把切线方程与椭圆联立，相切条件对应判别式为零。'),
  ],
  steps: [
    step('标出焦点与切点', '椭圆的两个焦点固定，切点 P 位于椭圆上。', '连接 PF₁、PF₂，记录 PF₁+PF₂=2a，并把待求量放入焦点三角形。', '连接切点与两个焦点。', '得到焦点三角形 △F₁PF₂。', '焦距 F₁F₂=2c，且 a²=b²+c²，可补全三角形的固定边信息。', '先显示椭圆、焦点和切点的相对位置。', 'focus'),
    step('写出切线约束', '直线 l 与椭圆在 P 点相切。', '可用切线公式，或把直线代入椭圆并令所得一元二次方程判别式为零。', '联立后使用相切条件。', '切线斜率与切点坐标建立关系。', '若切线斜率不存在，应单独检查竖直切线，避免在设 y=kx+m 时遗漏。', '珊瑚色直线只在 P 点贴住椭圆。', 'tangent'),
    step('转化焦点三角形', 'PF₁+PF₂=2a，底边 F₁F₂=2c。', '根据题目所求选择余弦定理、面积公式或角平分性质，减少未知量数量。', '利用距离和与固定底边。', '把几何量转成 a、b、c 或切点坐标。', '同一个关系可从几何与代数两侧交叉核验。', '两条蓝色连线构成焦点三角形。', 'triangle'),
    step('联立并校验', '切线约束与焦点三角形关系必须同时成立。', '消去中间量，检查切点仍在椭圆上，并核对斜率、象限和长度取值。', '联立约束并检查取值。', '保留同时满足图形与方程的结果。', '若出现平方运算，还要把候选解代回原始距离关系排除增根。', '最终约束集中显示在图解右下角。', 'relation'),
  ],
}

const PHYSICS_INCLINE: SolverTemplate = {
  key: 'physics-incline',
  subject: 'physics',
  kind: 'physics-incline',
  defaultTitle: '粗糙斜面 · 静止',
  statement: '质量为 m 的物块静止在倾角 θ = 30° 的粗糙斜面上。画出受力图，并判断静摩擦力方向。',
  diagramTitle: '斜面受力图',
  recommendedView: '正视',
  objects: [
    object('plane', '粗糙斜面', 'θ=30°', 0, '斜面给出接触方向，也决定支持力和摩擦力的方向。'),
    object('block', '物块', 'm', 0, '当前研究对象，所有受力都应是其他物体对它的作用。'),
    object('gravity', '重力', 'G=mg', 1, '重力始终竖直向下，与斜面倾斜方向无关。'),
    object('normal', '支持力', 'N', 2, '支持力垂直斜面向外，静止时大小为 mg cosθ。'),
    object('friction', '静摩擦力', 'f', 3, '它沿斜面向上，阻碍物块向下滑动的趋势。'),
  ],
  steps: [
    step('明确研究对象', '物块静止在粗糙斜面上。', '把物块单独隔离，保留斜面的真实姿态与接触关系。', '隔离物块并保留接触面。', '物块处于静止状态，所受合力为零。', '“静止”同时意味着沿斜面和垂直斜面两个方向的加速度都为零。', '先建立斜面与物块场景。', 'block'),
    step('标出重力', '重力由地球施加，作用于物块重心。', '重力方向始终竖直向下，不会随斜面方向改变。', '从重心竖直向下画 G。', '画出 G=mg，并准备沿斜面分解。', '沿斜面分量为 mg sinθ，垂直斜面分量为 mg cosθ。', '红色重力箭头保持竖直向下。', 'gravity'),
    step('标出支持力', '斜面对物块有弹性支持作用。', '支持力垂直接触面，并指向离开斜面的一侧。', '垂直斜面向外画 N。', '垂直斜面平衡：N=mg cosθ。', '支持力不是重力的反作用力；两者施力物体不同。', '蓝色支持力与斜面垂直。', 'normal'),
    step('判断摩擦方向', '若没有摩擦，物块有沿斜面下滑的趋势。', '静摩擦力阻碍相对运动趋势，因此沿斜面向上。', '根据运动趋势反向画 f。', '沿斜面平衡：f=mg sinθ，方向向上。', '只有恰好达到临界静摩擦时才可写 f=μN，普通静止状态不能直接等号。', '补上绿色静摩擦力后，两个方向都满足平衡。', 'friction'),
  ],
}

const PHYSICS_PROJECTILE: SolverTemplate = {
  key: 'physics-projectile',
  subject: 'physics',
  kind: 'physics-projectile',
  defaultTitle: '平抛运动的轨迹与速度分解',
  statement: '小球以水平初速度 v₀ 从高处抛出，忽略空气阻力，分析分运动、轨迹和落地速度方向。',
  diagramTitle: '平抛分运动图',
  recommendedView: '正视',
  objects: [
    object('coordinate', '分运动坐标系', 'x / y', 0, '水平方向取 x，竖直向下取 y，可把运动拆成两个独立分运动。'),
    object('vx', '水平速度', 'vₓ=v₀', 1, '忽略阻力时，水平方向没有加速度，速度保持不变。'),
    object('vy', '竖直速度', 'vᵧ=gt', 2, '竖直方向做初速度为零的匀加速运动。'),
    object('trajectory', '抛物线轨迹', 'y=gx²/(2v₀²)', 3, '消去时间后得到二次关系，因此轨迹是抛物线。'),
  ],
  steps: [
    step('建立分运动', '小球离开抛出点后只受重力。', '取水平方向为 x、竖直向下为 y，把平抛拆成匀速与自由落体。', '按水平和竖直方向拆分。', 'aₓ=0，aᵧ=g。', '两个分运动共享同一个时间 t，这是重新合成轨迹的桥梁。', '先显示抛出点和分运动坐标系。', 'coordinate'),
    step('处理水平运动', '水平方向不受力。', '由 aₓ=0 得 vₓ=v₀、x=v₀t，水平位移随时间均匀增加。', '水平速度保持 v₀。', 'x=v₀t。', '相同时间间隔内，轨迹点的水平间距相等。', '蓝色箭头表示恒定的水平速度。', 'vx'),
    step('处理竖直运动', '竖直方向只受重力，初速度为零。', '由自由落体公式得 vᵧ=gt、y=gt²/2，竖直速度持续增大。', '使用自由落体公式。', 'vᵧ=gt，y=gt²/2。', '合速度方向由 tanα=vᵧ/vₓ 决定，随时间逐渐向下偏转。', '珊瑚色箭头表示不断增大的竖直速度。', 'vy'),
    step('合成轨迹与速度', '水平、竖直分运动发生在同一时刻。', '由 t=x/v₀ 消去时间，得 y=gx²/(2v₀²)，并用矢量合成末速度。', '消去 t 并合成速度。', '轨迹为抛物线，末速度沿切线方向。', '落地时间由高度决定，再代回 vₓ、vᵧ即可确定速度大小与方向。', '点列组成抛物线，末端箭头给出切线方向。', 'trajectory'),
  ],
}

const CHEMISTRY_MOLECULE: SolverTemplate = {
  key: 'chemistry-molecule',
  subject: 'chemistry',
  kind: 'chemistry-molecule',
  defaultTitle: '乙醇的结构与催化氧化',
  statement: '从 CH₃CH₂OH 的原子连接识别羟基，并追踪乙醇催化氧化时的成键变化。',
  diagramTitle: '乙醇结构变化图',
  recommendedView: '等轴测',
  objects: [
    object('carbon-chain', '碳链骨架', 'C−C', 0, '两个碳原子以单键相连，构成乙醇的碳链骨架。'),
    object('bonds', '共价键', 'σ', 1, '结构式中的短线表示原子间共享电子形成的共价键。'),
    object('hydroxyl', '羟基', '−OH', 2, '羟基是乙醇的特征官能团，决定许多典型化学性质。'),
    object('oxidation', '氧化变化', '−CH₂OH → −CHO', 3, '催化氧化可看作羟基所在碳上失去氢并形成羰基。'),
  ],
  steps: [
    step('读取碳链骨架', '分子式写作 CH₃CH₂OH。', '按 C−C−O−H 的顺序排列重原子，再补足各原子的价键。', '先连接 C−C−O−H。', '得到两碳链与末端含氧基团。', '碳通常形成 4 个价键，氧通常形成 2 个价键，可用于检查结构。', '先显示两个碳原子、氧原子和末端氢。', 'carbon-chain'),
    step('核对原子连接', '乙醇中所有重原子以单键连接。', '补入 C−C、C−O 和 O−H 键，并确认各原子的成键数合理。', '补全单键并检查价键。', '结构简式为 CH₃−CH₂−OH。', '这里的 OH 与碳相连，是羟基；不能把它拆成游离的 OH⁻。', '键线逐步连接各原子。', 'bonds'),
    step('识别羟基', '与饱和碳相连的 −OH 是醇羟基。', '把 C−O−H 作为一个官能团整体观察，羟基附近是反应活性位置。', '圈出末端 −OH。', '官能团是羟基，物质属于醇。', '羟基能形成氢键，也使乙醇可发生氧化、酯化等反应。', '淡黄色光圈突出羟基。', 'hydroxyl'),
    step('追踪催化氧化', '羟基所在碳上仍连有氢，可被氧化。', '该碳与氧形成更高键级，同时移去相邻氢，产物骨架对应乙醛。', '跟踪 −CH₂OH 到 −CHO。', '乙醇可催化氧化为乙醛。', '完整配平还需同时满足 C、H、O 原子守恒；图解只强调官能团变化。', '反应箭头连接反应物结构与官能团变化。', 'oxidation'),
  ],
}

const CHEMISTRY_EQUILIBRIUM: SolverTemplate = {
  key: 'chemistry-equilibrium',
  subject: 'chemistry',
  kind: 'chemistry-equilibrium',
  defaultTitle: '浓度变化与化学平衡移动',
  statement: '对可逆反应改变反应物浓度，观察正逆反应速率如何变化并达到新的平衡。',
  diagramTitle: '化学平衡微观图',
  recommendedView: '正视',
  objects: [
    object('particles', '反应物与生成物', 'A / B', 0, '两类粒子持续发生正、逆反应，平衡时组成保持宏观稳定。'),
    object('reversible', '可逆反应', '⇌', 0, '平衡不是反应停止，而是正逆反应速率相等。'),
    object('disturbance', '浓度扰动', '+A', 1, '加入反应物会立即提高正反应速率。'),
    object('shift', '平衡移动', '→', 2, '体系通过消耗部分新增反应物建立新的动态平衡。'),
    object('new-balance', '新平衡', 'v正=v逆', 3, '新平衡时速率再次相等，但各物质浓度与原平衡不同。'),
  ],
  steps: [
    step('识别原平衡', '恒定条件下，各组分浓度不再随时间改变。', '微观上正反应和逆反应仍在进行，只是两者速率相等。', '平衡时 v正=v逆。', '这是动态平衡，不是反应停止。', '判断平衡要看宏观量保持不变，不能仅凭某一时刻反应物与生成物浓度相等。', '两侧粒子持续转化，可逆箭头同时存在。', 'reversible'),
    step('施加浓度扰动', '向体系中加入反应物 A。', 'A 的浓度瞬间增大，正反应速率随即增大；逆反应速率不会同幅瞬间变化。', '加入 A，v正先增大。', '原有速率平衡被打破。', '“瞬间变化”与“随后移动”应分开描述，前者由操作直接造成。', '新增蓝色粒子与脉冲标记表示外界扰动。', 'disturbance'),
    step('判断移动方向', '扰动后 v正>v逆。', '正反应占优，体系消耗部分 A 并生成更多 B，直到速率差逐渐缩小。', '比较正逆反应速率。', '平衡向生成物方向移动。', '平衡移动只能减弱外界改变，不能把新增浓度完全抵消。', '青色方向箭头显示净反应方向。', 'shift'),
    step('建立新平衡', '随组成变化，正逆反应速率重新接近。', '当 v正再次等于 v逆，浓度稳定在一组新值，体系达到新平衡。', '等待 v正与 v逆再次相等。', '新平衡满足速率相等，组成已改变。', '若温度不变，平衡常数保持不变；浓度改变的是反应商和最终组成。', '两条速率柱重新等高，表示新动态平衡。', 'new-balance'),
  ],
}

const WORKSHEET_GRAPH: SolverTemplate = {
  key: 'worksheet-graph',
  subject: 'worksheet',
  kind: 'worksheet-graph',
  defaultTitle: '题图中的抛物线与面积最值',
  statement: '先从题图还原坐标、动点和边界条件，再把面积写成单变量函数寻找最值。',
  diagramTitle: '题图条件还原',
  recommendedView: '正视',
  objects: [
    object('source-image', '原题图区域', 'IMG', 0, '先保留原图整体，避免识别局部时丢失标注之间的关系。'),
    object('conditions', '识别条件', 'A / B / P', 1, '把坐标、点名和动点范围转成可核验的结构化条件。'),
    object('worksheet-curve', '还原曲线', 'y=f(x)', 2, '根据识别到的坐标与交点重建曲线。'),
    object('result-check', '图文核对', '✓', 3, '推导完成后要回到原图检查点位、范围和单位。'),
  ],
  steps: [
    step('框定题图信息', '原题由文字、坐标图和点位标注共同组成。', '先整体阅读，再分别框定题干、坐标轴、曲线和几何标注。', '先整体后局部读取题图。', '建立待识别区域清单。', '前端演示只展示处理流程；正式识别文字与坐标需由后端题图解析结果提供。', '纸张轮廓与扫描框表示原题图区域。', 'source-image'),
    step('整理可核验条件', '识别结果可能受清晰度和遮挡影响。', '把点名、坐标、动点范围逐项列出，并回看原图确认每一项。', '逐项核对坐标与范围。', '形成结构化已知条件。', '若字符存在歧义，应保留“不确定”状态，不能擅自补成确定数值。', '蓝色标签表示从图中提取的条件。', 'conditions'),
    step('重建数学关系', '坐标与曲线类型确定后才能建立表达式。', '根据可靠条件重建曲线，再把面积或长度写成动点参数的函数。', '用已核验条件建模。', '得到可用于求最值的单变量关系。', '本页未调用后端，图中曲线是交互结构示意，不是该题真实识别结果。', '坐标图在扫描框中逐步重建。', 'worksheet-curve'),
    step('回到原图校验', '代数结果必须满足题图给出的取值范围。', '检查候选点是否位于指定线段或曲线上，并核对面积单位与边界值。', '检查范围、点位和单位。', '只保留与原题图一致的候选结果。', '正式答案应等待后端返回完整识别与求解数据。', '绿色核对标记表示完成图文回查。', 'result-check'),
  ],
}

const WORKSHEET_CIRCUIT: SolverTemplate = {
  ...WORKSHEET_GRAPH,
  key: 'worksheet-circuit',
  kind: 'worksheet-circuit',
  defaultTitle: '电路题图中的动态电表示数',
  statement: '识别滑动变阻器接法与电表位置，沿电流路径判断阻值和电表示数如何变化。',
  diagramTitle: '电路题图还原',
  objects: [
    object('source-image', '原题图区域', 'IMG', 0, '先确认导线交点、元件符号和滑片位置。'),
    object('conditions', '电路连接', '串 / 并联', 1, '沿电流路径判断元件连接关系，不能只凭版面位置猜测。'),
    object('worksheet-circuit', '动态电路', 'R滑', 2, '滑片改变接入电阻后，总电阻、电流和分压会联动变化。'),
    object('result-check', '方向核对', 'I / U', 3, '用极端位置或欧姆定律复核电表示数变化方向。'),
  ],
  steps: [
    step('识别元件与节点', '题图包含电源、电表、定值电阻和滑动变阻器。', '沿导线逐段读取，特别区分交叉不相连与带实心点的连接节点。', '沿导线识别元件和节点。', '得到不依赖版面位置的连接关系。', '正式识别需要后端返回结构化电路；当前仅展示前端处理流程。', '扫描框定位电路图主体。', 'source-image'),
    step('确定电表测量对象', '电流表串联，电压表并联。', '根据接线位置确认电表实际测量的支路电流或元件两端电压。', '按串并联规则确认测量对象。', '把电表示数绑定到对应物理量。', '若电表跨接多个元件，应先合并该部分电路再判断。', '蓝色回路突出当前识别到的连接路径。', 'conditions'),
    step('跟随滑片变化', '滑片改变的是接入电路部分的电阻丝长度。', '先判断接入电阻增减，再由总电阻、电流和分压关系依次推导。', '先电阻，后电流与电压。', '建立滑片位置到电表示数的变化链。', '不要直接背“左移增大”；变化取决于使用了哪一个下接线柱。', '滑片和高亮电阻段表示动态变量。', 'worksheet-circuit'),
    step('用边界状态复核', '滑片位于两端时，接入电阻最小或最大。', '代入极端状态检查电流是否超量程、结论是否连续，并与欧姆定律一致。', '用两端状态检查方向。', '保留满足接线与量程的变化结论。', '本页图解不替代真实题图识别，正式答案以后端求解数据为准。', '绿色核对标记表示完成方向复核。', 'result-check'),
  ],
}

const CUSTOM_MATH: SolverTemplate = {
  key: 'custom-math',
  subject: 'math',
  kind: 'math-generic',
  defaultTitle: '自定义数学题',
  statement: '从本机草稿读取题面，并展示“理解—建模—推导—校验”的通用解题框架。',
  diagramTitle: '通用推理框架',
  recommendedView: '正视',
  objects: [
    object('question', '题意与目标', '?', 0, '保留原题措辞，区分已知条件、限制和待求目标。'),
    object('variables', '变量与对象', 'x / A / P', 1, '为题目中的数量或几何对象建立明确符号。'),
    object('relation', '关系模型', '⇒', 2, '选择适用的定义、公式或定理建立关系。'),
    object('verification', '结果校验', '✓', 3, '检查取值范围、单位、特殊情形与原题要求。'),
  ],
  steps: [
    step('确认题意与目标', '题面已从本机待处理草稿读取。', '逐句标记已知量、限制条件和真正需要回答的问题。', '区分已知、限制与待求。', '形成待求目标清单。', '这是通用方法演示，尚未调用后端解析题意，不能视为这道题的真实答案。', '题面卡片进入推理流程。', 'question'),
    step('定义变量与对象', '复杂题目需要把自然语言映射为数学对象。', '为数量、点线面或事件设置符号，并明确每个变量的取值范围。', '给关键对象设置符号。', '得到可计算、可画图的对象集合。', '符号必须与题面一一对应；无法确认的信息应等待正式解析。', '变量节点从题意卡片中提取出来。', 'variables'),
    step('选择关系并推导', '定义、公式和定理都有适用前提。', '先核对前提，再建立方程、函数或几何关系；正式推导需由后端解题结果填充。', '核对前提后建立关系。', '形成待求解的关系链。', '前端不会根据任意题面伪造数值结论，此处仅展示步骤结构。', '关系箭头连接变量与待求目标。', 'relation'),
    step('校验与表达结论', '候选结果必须回到原题约束中检查。', '代回原关系，检查范围、单位、增根和遗漏，再按题目要求组织答案。', '代回并检查约束。', '通过校验后才可形成正式结论。', '当前没有后端结果，因此本步只说明校验方法，不声称已经求得答案。', '绿色核对节点完成通用流程。', 'verification'),
  ],
}

const CUSTOM_WORKSHEET: SolverTemplate = {
  key: 'custom-worksheet',
  subject: 'worksheet',
  kind: 'worksheet-generic',
  defaultTitle: '自定义题图',
  statement: '从本机题图草稿开始，展示“框选—识别—建模—核验”的题图处理流程。',
  diagramTitle: '题图解析流程',
  recommendedView: '正视',
  objects: [
    object('source-image', '原始题图', 'IMG', 0, '完整保留用户提交的原图，后续识别都能回到原始像素核对。'),
    object('conditions', '候选条件', 'OCR', 1, '把文字、数值、符号和图形关系列为待核验条件，不把模糊内容当成确定事实。'),
    object('model', '学科模型', 'MODEL', 2, '确认题意后再选择方程、函数、受力图或其他匹配的学科模型。'),
    object('result-check', '回图核验', '✓', 3, '正式求解完成后回到原图检查范围、单位、标注和遗漏。'),
  ],
  steps: [
    step('保留原始题图', '题图已保存在本机草稿中。', '先完整展示原图并划分文字、图形和标注区域，不在前端猜测题目内容。', '保留原图并划分区域。', '建立可随时回看的原图基准。', '当前页面没有执行 OCR，任何模糊字符都应等待后端识别。', '原题缩略图与扫描遮罩共同标出待处理区域。', 'source-image'),
    step('识别并核对条件', '文字识别和图形识别都可能存在置信度差异。', '把候选文字、数值、符号和几何关系逐项列出，再与原图对应位置核对。', '逐项识别并回看原图。', '形成带置信状态的条件清单。', '不确定内容保持待确认，不能为了补全步骤而臆造数值。', '通用条件标签表示等待后端填充的识别结果。', 'conditions'),
    step('选择匹配模型', '不同学科和题型需要不同的表达方式。', '依据已确认条件选择方程、函数、几何构造、受力图或化学结构模型，再交由后端正式求解。', '按题型选择学科模型。', '得到与题意匹配的待求解模型。', '此处只展示模型选择流程，不声称已经识别题型或求出答案。', '条件节点流向通用模型卡，避免预设为抛物线或其他具体题型。', 'model'),
    step('回图核验结果', '模型输出必须与原图标注和题目要求一致。', '把后端候选结果映射回题图，检查范围、单位、选项、图形位置和是否遗漏小问。', '把候选结果映射回原图。', '通过核验后才可形成正式答案。', '当前尚无后端结果，本步仅说明将来的校验方式。', '绿色核对标记表示完整的回图检查闭环。', 'result-check'),
  ],
}

const TEMPLATE_BY_ID: Record<string, SolverTemplate> = {
  'math-function-translation': MATH_FUNCTION,
  'math-prism-section': MATH_PRISM,
  'math-ellipse-tangent': MATH_ELLIPSE,
  'physics-incline-force': PHYSICS_INCLINE,
  'physics-projectile-motion': PHYSICS_PROJECTILE,
  'chemistry-ethanol-oxidation': CHEMISTRY_MOLECULE,
  'chemistry-equilibrium-shift': CHEMISTRY_EQUILIBRIUM,
  'worksheet-quadratic-image': WORKSHEET_GRAPH,
  'worksheet-circuit-image': WORKSHEET_CIRCUIT,
}

const SUBJECT_META: Record<ProblemSubject, { label: string; eyebrow: string }> = {
  math: { label: '数学', eyebrow: '数学 · 可视化推理' },
  physics: { label: '物理', eyebrow: '物理 · 过程图解' },
  chemistry: { label: '化学', eyebrow: '化学 · 结构与变化' },
  worksheet: { label: '题图', eyebrow: '题图 · 分步解析' },
}

const ILLUSTRATED_ARTICLES = {
  'physics-incline-force': {
    overview: '先隔离研究对象，再按重力、支持力和静摩擦力的顺序作图；最后分别沿斜面和垂直斜面方向检查平衡条件。',
    answer: '物块受到竖直向下的重力、垂直斜面向外的支持力，以及沿斜面向上的静摩擦力。静止时满足 N = mg cosθ、f = mg sinθ。',
  },
  'chemistry-ethanol-oxidation': {
    overview: '先由碳、氧的价键数还原 C−C−O−H 骨架，再圈出羟基，最后追踪羟基所在碳在催化氧化过程中的成键变化。',
    answer: '乙醇的结构简式为 CH₃CH₂OH，官能团是羟基；催化氧化时羟基所在碳形成羰基，生成乙醛 CH₃CHO。',
  },
} as const

type IllustratedArticleId = keyof typeof ILLUSTRATED_ARTICLES

const isIllustratedArticleId = (id: string): id is IllustratedArticleId => (
  Object.prototype.hasOwnProperty.call(ILLUSTRATED_ARTICLES, id)
)

const pageMode = ref<PageMode>('steps')
const activeStep = ref(0)
const revealedThrough = ref(0)
const selectedObjectId = ref('question')
const activeTemplate = ref<SolverTemplate>(CUSTOM_MATH)
const problemId = ref('custom-problem')
const problemTitle = ref(CUSTOM_MATH.defaultTitle)
const problemStatement = ref(CUSTOM_MATH.statement)
const sourceLabel = ref('前端演示')
const problemArtwork = ref('')
const isDraft = ref(false)
const pendingImagePath = ref('')
const followUpText = ref('')
const followUpExchanges = ref<FollowUpExchange[]>([])
const scrollIntoViewId = ref('')
const navigationTop = resolveCustomNavigationTop()
const topBarStyle = { paddingTop: navigationTop }
const contentScrollStyle = { top: `calc(${navigationTop} + 89rpx)` }
let exchangeSequence = 0

const safeDecode = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}

const safeStoredText = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : ''
)

const isSubject = (value: unknown): value is ProblemSubject => (
  value === 'math' || value === 'physics' || value === 'chemistry' || value === 'worksheet'
)

const readPendingProblem = (id: string): PendingProblem | null => {
  try {
    const value = uni.getStorageSync('uniprism:pendingProblem') as unknown
    if (value && typeof value === 'object') {
      const pending = value as PendingProblem
      if (pending.id === id) return pending
    }
    return getLocalProblemDrafts().find((item) => item.id === id) ?? null
  } catch {
    return null
  }
}

const inferSubjectFromId = (id: string): ProblemSubject => {
  if (id.startsWith('physics-')) return 'physics'
  if (id.startsWith('chemistry-')) return 'chemistry'
  if (id.startsWith('worksheet-')) return 'worksheet'
  return 'math'
}

const fallbackTemplateFor = (subject: ProblemSubject, draft: boolean): SolverTemplate => {
  if (subject === 'worksheet') return draft ? CUSTOM_WORKSHEET : WORKSHEET_GRAPH
  if (subject === 'physics') return PHYSICS_INCLINE
  if (subject === 'chemistry') return CHEMISTRY_MOLECULE
  return draft ? CUSTOM_MATH : MATH_FUNCTION
}

const resolveProblem = (query: PageQuery) => {
  const nextId = safeDecode(query.id) || 'custom-problem'
  const nextSource = safeDecode(query.source) || 'local-demo'
  const legacyTitle = safeDecode(query.title)
  const querySubject = safeDecode(query.subject)
  const pending = readPendingProblem(nextId)
  const preview = PUBLIC_PROBLEMS.find((item) => item.id === nextId)
  const pendingRawSubject = pending?.subject
  const pendingSubject = isSubject(pendingRawSubject) ? pendingRawSubject : undefined
  const resolvedSubject = preview?.subject
    ?? pendingSubject
    ?? (isSubject(querySubject) ? querySubject : undefined)
    ?? inferSubjectFromId(nextId)
  const draftLike = Boolean(pending) || nextSource === 'home-demo' || nextId.startsWith('draft-')
  const template = TEMPLATE_BY_ID[nextId] ?? fallbackTemplateFor(resolvedSubject, draftLike)

  problemId.value = nextId
  activeTemplate.value = template
  isDraft.value = draftLike
  pendingImagePath.value = pending?.imagePath ?? ''
  problemArtwork.value = preview ? resolveProblemArtwork(preview) : ''
  sourceLabel.value = pending
    ? (pending.imagePath ? '本机题图草稿' : '本机文字草稿')
    : preview
      ? '题目广场预置'
      : nextSource === 'home-demo'
        ? '首页提交'
        : '前端演示'

  const pendingTitle = safeStoredText(pending?.title) || safeStoredText(pending?.question)
  problemTitle.value = pendingTitle || preview?.title || legacyTitle || template.defaultTitle

  const pendingQuestion = safeStoredText(pending?.question)
  problemStatement.value = pendingQuestion && pendingQuestion !== problemTitle.value
    ? pendingQuestion
    : pending
      ? (pending.imagePath
          ? `已读取题图草稿${pending.imageName ? `“${pending.imageName}”` : ''}；以下内容展示解析流程，不是后端生成答案。`
          : '题面已从本机草稿恢复；以下内容展示通用解题框架，不是后端生成答案。')
      : template.statement

  activeStep.value = 0
  const articleLayout = template.kind === 'math-prism' || isIllustratedArticleId(nextId)
  revealedThrough.value = articleLayout || !preferencesState.stepMode
    ? template.steps.length - 1
    : 0
  selectedObjectId.value = template.steps[0]?.focusObject ?? template.objects[0]?.id ?? ''
  pageMode.value = articleLayout
    ? 'steps'
    : preferencesState.autoOpenBoard ? 'diagram' : 'steps'
}

onLoad((query) => {
  loadPreferences()
  resolveProblem((query ?? {}) as PageQuery)
})

const isPrismWorkspace = computed(() => activeTemplate.value.kind === 'math-prism')
const isIllustratedWorkspace = computed(() => isIllustratedArticleId(problemId.value))
const isArticleWorkspace = computed(() => isPrismWorkspace.value || isIllustratedWorkspace.value)
const illustratedArticle = computed(() => (
  isIllustratedArticleId(problemId.value)
    ? ILLUSTRATED_ARTICLES[problemId.value]
    : { overview: '', answer: '' }
))
const illustratedSubject = computed<'physics' | 'chemistry'>(() => (
  activeTemplate.value.subject === 'chemistry' ? 'chemistry' : 'physics'
))
const subjectMeta = computed(() => SUBJECT_META[activeTemplate.value.subject])
const currentStep = computed(() => activeTemplate.value.steps[activeStep.value] ?? activeTemplate.value.steps[0])
const selectedObject = computed(() => (
  activeTemplate.value.objects.find((item) => item.id === selectedObjectId.value)
  ?? activeTemplate.value.objects[0]
))
const visibleObjects = computed(() => (
  activeTemplate.value.objects.filter((item) => item.firstStep <= activeStep.value)
))
const displayProblemId = computed(() => (
  problemId.value.length > 22 ? `${problemId.value.slice(0, 20)}…` : problemId.value
))
const effectiveBoardView = computed<BoardView>(() => (
  preferencesState.defaultView === '自动'
    ? activeTemplate.value.recommendedView
    : preferencesState.defaultView
))
const boardViewClass = computed(() => ({
  正视: 'diagram-canvas--front',
  俯视: 'diagram-canvas--top',
  等轴测: 'diagram-canvas--isometric',
  自动: 'diagram-canvas--front',
})[effectiveBoardView.value])
const rootClasses = computed(() => ({
  'solver-page--font-compact': preferencesState.fontSize === '紧凑',
  'solver-page--font-comfortable': preferencesState.fontSize === '舒适',
  'solver-page--reduced-motion': preferencesState.reducedMotion,
}))
const followUpContext = computed(() => (
  `第 ${activeStep.value + 1} 步 · ${selectedObject.value?.label ?? currentStep.value?.title ?? '当前内容'}`
))
const progressLabel = computed(() => (
  activeStep.value === activeTemplate.value.steps.length - 1
    ? '完整图解已显示'
    : `已显示至第 ${activeStep.value + 1} 步`
))
const nextStepLabel = computed(() => (
  activeStep.value < activeTemplate.value.steps.length - 1
    ? `下一步 · ${activeTemplate.value.steps[activeStep.value + 1]?.title ?? ''}`
    : '从第一步重看'
))
const demoNotice = computed(() => (
  isDraft.value
    ? '已恢复本机题面。当前步骤与图解是学科通用交互模板，尚未调用后端生成这道题的真实答案。'
    : '当前展示预置的前端例题讲解，用于确认小程序交互；本页没有临时调用后端模型。'
))
const presetQuestions = computed(() => [
  `${selectedObject.value?.label ?? '这个对象'}在本步起什么作用？`,
  `如何检查“${currentStep.value?.title ?? '当前步骤'}”？`,
])

const formatStepNumber = (index: number) => String(index + 1).padStart(2, '0')
const isSelected = (id: string) => selectedObjectId.value === id
const isStepLocked = (index: number) => (
  !isArticleWorkspace.value && preferencesState.stepMode && index > revealedThrough.value
)
const isStepExpanded = (index: number) => !preferencesState.stepMode || activeStep.value === index

const displayedDerivation = (solutionStep: SolutionStep): string => {
  if (preferencesState.answerDetail === '精简') return solutionStep.briefDerivation
  if (preferencesState.answerDetail === '详细') {
    return `${solutionStep.derivation} ${solutionStep.detail}`
  }
  return solutionStep.derivation
}

const setMode = (mode: PageMode) => {
  pageMode.value = mode
  scrollIntoViewId.value = ''
}

const selectStep = (index: number, openDiagram = false) => {
  if (isStepLocked(index)) {
    uni.showToast({ title: '逐步模式下请先完成前一步', icon: 'none' })
    return
  }
  const bounded = Math.max(0, Math.min(index, activeTemplate.value.steps.length - 1))
  activeStep.value = bounded
  selectedObjectId.value = activeTemplate.value.steps[bounded]?.focusObject ?? ''
  if (openDiagram) setMode('diagram')
}

const selectObject = (id: string) => {
  const target = activeTemplate.value.objects.find((item) => item.id === id)
  if (!target || target.firstStep > activeStep.value) return
  selectedObjectId.value = id
}

const showPreviousStep = () => {
  if (activeStep.value > 0) selectStep(activeStep.value - 1)
}

const showNextStep = () => {
  const lastIndex = activeTemplate.value.steps.length - 1
  if (activeStep.value >= lastIndex) {
    selectStep(0)
    return
  }
  const nextIndex = activeStep.value + 1
  revealedThrough.value = Math.max(revealedThrough.value, nextIndex)
  selectStep(nextIndex)
}

const buildDemoAnswer = (): string => {
  const objectDescription = selectedObject.value?.description ?? '当前对象用于组织这一步的图文关系。'
  const stepDetail = preferencesState.answerDetail === '详细'
    ? ` ${currentStep.value?.detail ?? ''}`
    : ''
  return `在“${currentStep.value?.title ?? '当前步骤'}”中，${objectDescription}${stepDetail} 这是前端模板的演示说明；正式题目答案以后端求解结果为准。`
}

const submitFollowUp = (preset?: string) => {
  const question = (preset ?? followUpText.value).trim()
  if (!question) {
    uni.showToast({ title: '先输入一个问题', icon: 'none' })
    return
  }
  const id = ++exchangeSequence
  followUpExchanges.value.push({
    id,
    question,
    answer: buildDemoAnswer(),
    context: followUpContext.value,
  })
  followUpText.value = ''
  void nextTick(() => {
    scrollIntoViewId.value = `follow-up-${id}`
  })
}

const goBack = () => {
  uni.navigateBack({
    delta: 1,
    fail: () => uni.reLaunch({ url: '/pages/home/index' }),
  })
}
</script>

<template>
  <view class="solver-page" :class="rootClasses">
    <view class="top-bar" :style="topBarStyle">
      <button class="top-bar__back" hover-class="top-bar__back--pressed" @tap="goBack">
        <text class="top-bar__arrow">←</text>
        <text>退出解题</text>
      </button>
      <view class="top-bar__title">
        <text class="top-bar__title-main">{{ isArticleWorkspace ? '解题过程' : '逐步解题' }}</text>
        <text class="top-bar__title-sub">{{ activeStep + 1 }} / {{ activeTemplate.steps.length }}</text>
      </view>
      <view class="top-bar__safe-space" />
    </view>

    <scroll-view
      class="content-scroll"
      :class="{ 'content-scroll--flush': isArticleWorkspace }"
      :style="contentScrollStyle"
      scroll-y
      :enhanced="!isPrismWorkspace"
      :scroll-into-view="scrollIntoViewId"
      :show-scrollbar="false"
    >
      <view class="screen-content">
        <view v-if="!isArticleWorkspace" class="problem-card">
          <view class="problem-card__meta">
            <view class="problem-card__chips">
              <text class="subject-chip" :class="`subject-chip--${activeTemplate.subject}`">
                {{ subjectMeta.label }}
              </text>
              <text class="source-chip">{{ sourceLabel }}</text>
            </view>
            <text class="problem-card__id">{{ displayProblemId }}</text>
          </view>
          <text class="problem-card__eyebrow">{{ subjectMeta.eyebrow }}</text>
          <text class="problem-card__title">{{ problemTitle }}</text>
          <text class="problem-card__statement">{{ problemStatement }}</text>
          <view
            v-if="isDraft && activeTemplate.subject === 'worksheet' && pendingImagePath"
            class="draft-image"
          >
            <image class="draft-image__preview" :src="pendingImagePath" mode="aspectFit" />
            <view class="draft-image__overlay">
              <text>本机题图</text>
              <text>解析流程演示</text>
            </view>
          </view>
          <view class="demo-notice" :class="{ 'demo-notice--draft': isDraft }">
            <text class="demo-notice__mark">i</text>
            <text>{{ demoNotice }}</text>
          </view>
        </view>

        <PrismWorkspace
          v-if="isPrismWorkspace"
          :step-index="activeStep"
          @update:step-index="selectStep($event)"
        />

        <IllustratedSolution
          v-else-if="isIllustratedWorkspace"
          :title="problemTitle"
          :statement="problemStatement"
          :artwork="problemArtwork"
          :overview="illustratedArticle.overview"
          :answer="illustratedArticle.answer"
          :subject="illustratedSubject"
          :steps="activeTemplate.steps"
          :step-index="activeStep"
          @update:step-index="selectStep($event)"
        />

        <view v-if="!isArticleWorkspace" class="preference-summary">
          <text>{{ preferencesState.stepMode ? '逐步解锁' : '自由浏览' }}</text>
          <text>{{ preferencesState.answerDetail }}讲解</text>
          <text>{{ preferencesState.fontSize }}字号</text>
          <text>视角 · {{ effectiveBoardView }}</text>
        </view>

        <view v-if="!isArticleWorkspace" class="mode-switch">
          <button
            class="mode-switch__item"
            :class="{ 'mode-switch__item--active': pageMode === 'steps' }"
            @tap="setMode('steps')"
          >
            <text class="mode-switch__icon">≡</text>
            <text>步骤</text>
          </button>
          <button
            class="mode-switch__item"
            :class="{ 'mode-switch__item--active': pageMode === 'diagram' }"
            @tap="setMode('diagram')"
          >
            <text class="mode-switch__icon">◇</text>
            <text>图解</text>
            <text class="mode-switch__badge">{{ activeStep + 1 }}</text>
          </button>
        </view>

        <view v-if="!isArticleWorkspace && pageMode === 'steps'" class="steps-panel">
          <view class="section-heading">
            <view>
              <text class="section-heading__eyebrow">SOLUTION</text>
              <text class="section-heading__title">解题过程</text>
            </view>
            <text class="section-heading__hint">
              {{ preferencesState.stepMode ? '按顺序逐步展开' : '点击任一步查看图解' }}
            </text>
          </view>

          <view class="step-timeline">
            <view
              v-for="(solutionStep, index) in activeTemplate.steps"
              :key="`${activeTemplate.key}-${index}`"
              class="step-card"
              :class="{
                'step-card--active': activeStep === index,
                'step-card--locked': isStepLocked(index),
              }"
              hover-class="step-card--pressed"
              @tap="selectStep(index, !isStepLocked(index))"
            >
              <view class="step-card__rail">
                <view class="step-card__number">
                  {{ isStepLocked(index) ? '·' : formatStepNumber(index) }}
                </view>
                <view v-if="index < activeTemplate.steps.length - 1" class="step-card__line" />
              </view>
              <view class="step-card__body">
                <view class="step-card__header">
                  <text class="step-card__title">{{ solutionStep.title }}</text>
                  <text v-if="isStepLocked(index)" class="step-card__lock">待解锁</text>
                  <text v-else class="step-card__link">查看图解 →</text>
                </view>

                <view v-if="isStepLocked(index)" class="step-card__locked-copy">
                  完成当前步骤后显示依据、推导和结论。
                </view>
                <template v-else-if="isStepExpanded(index)">
                  <view class="logic-row">
                    <text class="logic-row__label">依据</text>
                    <text class="logic-row__text">{{ solutionStep.basis }}</text>
                  </view>
                  <view class="logic-row">
                    <text class="logic-row__label logic-row__label--derive">推导</text>
                    <text class="logic-row__text">{{ displayedDerivation(solutionStep) }}</text>
                  </view>
                  <view class="logic-row logic-row--result">
                    <text class="logic-row__label logic-row__label--result">结论</text>
                    <text class="logic-row__text logic-row__text--strong">{{ solutionStep.conclusion }}</text>
                  </view>
                </template>
                <view v-else class="step-card__collapsed-copy">
                  <text>结论</text>
                  <text>{{ solutionStep.conclusion }}</text>
                </view>
              </view>
            </view>
          </view>

          <button
            v-if="preferencesState.stepMode && revealedThrough < activeTemplate.steps.length - 1"
            class="unlock-next"
            @tap="showNextStep"
          >
            展开下一步 · {{ activeTemplate.steps[activeStep + 1]?.title }}
          </button>
        </view>

        <view v-else-if="!isArticleWorkspace" class="diagram-panel">
          <view class="section-heading section-heading--diagram">
            <view>
              <text class="section-heading__eyebrow">DIAGRAM</text>
              <text class="section-heading__title">{{ activeTemplate.diagramTitle }}</text>
            </view>
            <view class="diagram-progress">
              <text>{{ progressLabel }}</text>
              <text class="diagram-progress__count">{{ activeStep + 1 }}/{{ activeTemplate.steps.length }}</text>
            </view>
          </view>

          <scroll-view class="step-strip" scroll-x :show-scrollbar="false">
            <view class="step-strip__inner">
              <button
                v-for="(solutionStep, index) in activeTemplate.steps"
                :key="`${activeTemplate.key}-tab-${index}`"
                class="step-strip__item"
                :class="{
                  'step-strip__item--active': activeStep === index,
                  'step-strip__item--complete': activeStep > index,
                  'step-strip__item--locked': isStepLocked(index),
                }"
                :disabled="isStepLocked(index)"
                @tap="selectStep(index)"
              >
                <text class="step-strip__number">{{ formatStepNumber(index) }}</text>
                <text class="step-strip__title">{{ solutionStep.title }}</text>
              </button>
            </view>
          </scroll-view>

          <view class="diagram-card">
            <view class="diagram-card__header">
              <view>
                <text class="diagram-card__step">第 {{ activeStep + 1 }} 步</text>
                <text class="diagram-card__title">{{ currentStep.title }}</text>
              </view>
              <view class="diagram-card__tools">
                <text>{{ effectiveBoardView }}</text>
                <text>点选对象</text>
              </view>
            </view>

            <view
              class="diagram-canvas"
              :class="[
                boardViewClass,
                { 'diagram-canvas--without-grid': !preferencesState.showGrid },
              ]"
            >
              <view v-if="preferencesState.showGrid" class="diagram-grid" />
              <view class="subject-diagram">
                <template v-if="activeTemplate.kind === 'physics-incline'">
                  <view
                    class="incline-plane pickable"
                    :class="{ 'is-selected': isSelected('plane') }"
                    @tap.stop="selectObject('plane')"
                  >
                    <view class="incline-plane__line" />
                    <view v-for="tick in 5" :key="tick" class="incline-plane__tick" :class="`incline-plane__tick--${tick}`" />
                  </view>
                  <view
                    class="incline-block pickable"
                    :class="{ 'is-selected': isSelected('block') }"
                    @tap.stop="selectObject('block')"
                  >m</view>
                  <view
                    v-if="activeStep >= 1"
                    class="force-arrow force-arrow--gravity pickable"
                    :class="{ 'is-selected': isSelected('gravity') }"
                    @tap.stop="selectObject('gravity')"
                  ><view class="force-arrow__shaft" /><view class="force-arrow__head" /></view>
                  <text v-if="activeStep >= 1" class="force-name force-name--gravity" @tap.stop="selectObject('gravity')">G=mg</text>
                  <view
                    v-if="activeStep >= 2"
                    class="force-arrow force-arrow--normal pickable"
                    :class="{ 'is-selected': isSelected('normal') }"
                    @tap.stop="selectObject('normal')"
                  ><view class="force-arrow__shaft" /><view class="force-arrow__head" /></view>
                  <text v-if="activeStep >= 2" class="force-name force-name--normal" @tap.stop="selectObject('normal')">N</text>
                  <view
                    v-if="activeStep >= 3"
                    class="force-arrow force-arrow--friction pickable"
                    :class="{ 'is-selected': isSelected('friction') }"
                    @tap.stop="selectObject('friction')"
                  ><view class="force-arrow__shaft" /><view class="force-arrow__head" /></view>
                  <text v-if="activeStep >= 3" class="force-name force-name--friction" @tap.stop="selectObject('friction')">f</text>
                  <text class="incline-angle" @tap.stop="selectObject('plane')">θ=30°</text>
                </template>

                <template v-else-if="activeTemplate.kind === 'physics-projectile'">
                  <view
                    class="projectile-axes pickable"
                    :class="{ 'is-selected': isSelected('coordinate') }"
                    @tap.stop="selectObject('coordinate')"
                  ><view class="projectile-axis projectile-axis--x" /><view class="projectile-axis projectile-axis--y" /><text>x</text><text>y</text></view>
                  <view class="projectile-ball">●</view>
                  <view
                    v-if="activeStep >= 1"
                    class="projectile-vector projectile-vector--x pickable"
                    :class="{ 'is-selected': isSelected('vx') }"
                    @tap.stop="selectObject('vx')"
                  ><view class="projectile-vector__line" /><text>vₓ</text></view>
                  <view
                    v-if="activeStep >= 2"
                    class="projectile-vector projectile-vector--y pickable"
                    :class="{ 'is-selected': isSelected('vy') }"
                    @tap.stop="selectObject('vy')"
                  ><view class="projectile-vector__line" /><text>vᵧ</text></view>
                  <view
                    v-if="activeStep >= 3"
                    class="trajectory pickable"
                    :class="{ 'is-selected': isSelected('trajectory') }"
                    @tap.stop="selectObject('trajectory')"
                  >
                    <view v-for="dot in 8" :key="dot" class="trajectory__dot" :class="`trajectory__dot--${dot}`" />
                    <text>y ∝ x²</text>
                  </view>
                </template>

                <template v-else-if="activeTemplate.kind === 'math-function'">
                  <view
                    class="graph-axes pickable"
                    :class="{ 'is-selected': isSelected('axes') }"
                    @tap.stop="selectObject('axes')"
                  ><view class="graph-axis graph-axis--x" /><view class="graph-axis graph-axis--y" /><text class="graph-axis__x">x</text><text class="graph-axis__y">y</text></view>
                  <view
                    class="parabola pickable"
                    :class="{ 'is-selected': isSelected('curve') }"
                    @tap.stop="selectObject('curve')"
                  ><view v-for="dot in 13" :key="dot" class="parabola__dot" :class="`parabola__dot--${dot}`" /></view>
                  <view
                    v-if="activeStep >= 1"
                    class="graph-point graph-point--vertex pickable"
                    :class="{ 'is-selected': isSelected('vertex') }"
                    @tap.stop="selectObject('vertex')"
                  ><text>V(2,−1)</text></view>
                  <view
                    v-if="activeStep >= 2"
                    class="roots-group pickable"
                    :class="{ 'is-selected': isSelected('roots') }"
                    @tap.stop="selectObject('roots')"
                  ><view class="graph-point graph-point--root-one" /><view class="graph-point graph-point--root-two" /><text>x=1</text><text>x=3</text></view>
                  <view
                    v-if="activeStep >= 3"
                    class="symmetry-line pickable"
                    :class="{ 'is-selected': isSelected('symmetry') }"
                    @tap.stop="selectObject('symmetry')"
                  ><text>x=2</text></view>
                </template>

                <template v-else-if="activeTemplate.kind === 'math-prism'">
                  <view
                    class="prism pickable"
                    :class="{ 'is-selected': isSelected('prism') }"
                    @tap.stop="selectObject('prism')"
                  ><view class="prism__face prism__face--back" /><view class="prism__face prism__face--front" /><view v-for="edge in 4" :key="edge" class="prism__edge" :class="`prism__edge--${edge}`" /><text>A</text><text>B</text><text>C₁</text></view>
                  <view
                    v-if="activeStep >= 1"
                    class="prism-section pickable"
                    :class="{ 'is-selected': isSelected('section') }"
                    @tap.stop="selectObject('section')"
                  ><text>截面 α</text></view>
                  <view
                    v-if="activeStep >= 2"
                    class="right-angle pickable"
                    :class="{ 'is-selected': isSelected('perpendicular') }"
                    @tap.stop="selectObject('perpendicular')"
                  >⊥</view>
                  <view
                    v-if="activeStep >= 3"
                    class="plane-angle pickable"
                    :class="{ 'is-selected': isSelected('angle') }"
                    @tap.stop="selectObject('angle')"
                  >∠θ</view>
                </template>

                <template v-else-if="activeTemplate.kind === 'math-ellipse'">
                  <view
                    class="ellipse pickable"
                    :class="{ 'is-selected': isSelected('ellipse') }"
                    @tap.stop="selectObject('ellipse')"
                  />
                  <view
                    class="ellipse-foci pickable"
                    :class="{ 'is-selected': isSelected('focus') }"
                    @tap.stop="selectObject('focus')"
                  ><view>F₁</view><view>F₂</view></view>
                  <view v-if="activeStep >= 1" class="ellipse-point">P</view>
                  <view
                    v-if="activeStep >= 1"
                    class="tangent pickable"
                    :class="{ 'is-selected': isSelected('tangent') }"
                    @tap.stop="selectObject('tangent')"
                  >l</view>
                  <view
                    v-if="activeStep >= 2"
                    class="focus-triangle pickable"
                    :class="{ 'is-selected': isSelected('triangle') }"
                    @tap.stop="selectObject('triangle')"
                  ><view /><view /><text>PF₁ + PF₂ = 2a</text></view>
                  <view
                    v-if="activeStep >= 3"
                    class="relation-tag pickable"
                    :class="{ 'is-selected': isSelected('relation') }"
                    @tap.stop="selectObject('relation')"
                  >联立 · Δ=0</view>
                </template>

                <template v-else-if="activeTemplate.kind === 'chemistry-molecule'">
                  <view
                    class="molecule-atoms pickable"
                    :class="{ 'is-selected': isSelected('carbon-chain') }"
                    @tap.stop="selectObject('carbon-chain')"
                  ><view class="atom atom--c1">C</view><view class="atom atom--c2">C</view><view class="atom atom--o">O</view><view class="atom atom--h">H</view></view>
                  <view
                    v-if="activeStep >= 1"
                    class="molecule-bonds pickable"
                    :class="{ 'is-selected': isSelected('bonds') }"
                    @tap.stop="selectObject('bonds')"
                  ><view class="bond bond--one" /><view class="bond bond--two" /><view class="bond bond--three" /></view>
                  <view
                    v-if="activeStep >= 2"
                    class="hydroxyl-halo pickable"
                    :class="{ 'is-selected': isSelected('hydroxyl') }"
                    @tap.stop="selectObject('hydroxyl')"
                  ><text>羟基 −OH</text></view>
                  <view
                    v-if="activeStep >= 3"
                    class="oxidation-flow pickable"
                    :class="{ 'is-selected': isSelected('oxidation') }"
                    @tap.stop="selectObject('oxidation')"
                  ><text>催化氧化</text><view>→</view><text>CH₃CHO</text></view>
                </template>

                <template v-else-if="activeTemplate.kind === 'chemistry-equilibrium'">
                  <view
                    class="particle-box pickable"
                    :class="{ 'is-selected': isSelected('particles') }"
                    @tap.stop="selectObject('particles')"
                  ><view v-for="dot in 8" :key="`a-${dot}`" class="particle particle--a" :class="`particle--a-${dot}`" /><view v-for="dot in 6" :key="`b-${dot}`" class="particle particle--b" :class="`particle--b-${dot}`" /></view>
                  <view
                    class="reaction-symbol pickable"
                    :class="{ 'is-selected': isSelected('reversible') }"
                    @tap.stop="selectObject('reversible')"
                  >A ⇌ B</view>
                  <view
                    v-if="activeStep >= 1"
                    class="disturbance-tag pickable"
                    :class="{ 'is-selected': isSelected('disturbance') }"
                    @tap.stop="selectObject('disturbance')"
                  >+ A</view>
                  <view
                    v-if="activeStep >= 2"
                    class="shift-arrow pickable"
                    :class="{ 'is-selected': isSelected('shift') }"
                    @tap.stop="selectObject('shift')"
                  >净反应 →</view>
                  <view
                    v-if="activeStep >= 3"
                    class="balance-bars pickable"
                    :class="{ 'is-selected': isSelected('new-balance') }"
                    @tap.stop="selectObject('new-balance')"
                  ><view><text>v正</text><view class="balance-bars__bar" /></view><view><text>v逆</text><view class="balance-bars__bar" /></view><text>=</text></view>
                </template>

                <template v-else-if="activeTemplate.kind === 'worksheet-graph' || activeTemplate.kind === 'worksheet-circuit' || activeTemplate.kind === 'worksheet-generic'">
                  <view
                    class="worksheet-paper pickable"
                    :class="{ 'is-selected': isSelected('source-image') }"
                    @tap.stop="selectObject('source-image')"
                  ><view class="worksheet-paper__line" /><view class="worksheet-paper__line worksheet-paper__line--short" /><view class="worksheet-scan">扫描区域</view></view>
                  <view
                    v-if="activeStep >= 1"
                    class="condition-tags pickable"
                    :class="{ 'is-selected': isSelected('conditions') }"
                    @tap.stop="selectObject('conditions')"
                  ><text>条件 1</text><text>标注 A</text><text>范围</text></view>
                  <view
                    v-if="activeStep >= 2 && activeTemplate.kind === 'worksheet-graph'"
                    class="worksheet-mini-graph pickable"
                    :class="{ 'is-selected': isSelected('worksheet-curve') }"
                    @tap.stop="selectObject('worksheet-curve')"
                  ><view class="worksheet-mini-graph__x" /><view class="worksheet-mini-graph__y" /><view v-for="dot in 7" :key="dot" class="worksheet-curve-dot" :class="`worksheet-curve-dot--${dot}`" /></view>
                  <view
                    v-if="activeStep >= 2 && activeTemplate.kind === 'worksheet-circuit'"
                    class="worksheet-circuit pickable"
                    :class="{ 'is-selected': isSelected('worksheet-circuit') }"
                    @tap.stop="selectObject('worksheet-circuit')"
                  ><view class="circuit-wire" /><view class="circuit-battery">＋ −</view><view class="circuit-meter">A</view><view class="circuit-slider">R ↔</view></view>
                  <view
                    v-if="activeStep >= 2 && activeTemplate.kind === 'worksheet-generic'"
                    class="worksheet-model pickable"
                    :class="{ 'is-selected': isSelected('model') }"
                    @tap.stop="selectObject('model')"
                  >
                    <text>已核验条件</text>
                    <view>→</view>
                    <text>选择学科模型</text>
                  </view>
                  <view
                    v-if="activeStep >= 3"
                    class="worksheet-check pickable"
                    :class="{ 'is-selected': isSelected('result-check') }"
                    @tap.stop="selectObject('result-check')"
                  >✓ 图文核对</view>
                </template>

                <template v-else>
                  <view class="reasoning-flow">
                    <view
                      v-for="(flowObject, index) in activeTemplate.objects"
                      v-show="flowObject.firstStep <= activeStep"
                      :key="flowObject.id"
                      class="reasoning-node pickable"
                      :class="[
                        `reasoning-node--${index + 1}`,
                        { 'is-selected': isSelected(flowObject.id) },
                      ]"
                      @tap.stop="selectObject(flowObject.id)"
                    >
                      <text>{{ flowObject.symbol }}</text>
                      <text>{{ flowObject.label }}</text>
                    </view>
                    <view v-if="activeStep >= 1" class="reasoning-arrow reasoning-arrow--one">→</view>
                    <view v-if="activeStep >= 2" class="reasoning-arrow reasoning-arrow--two">→</view>
                    <view v-if="activeStep >= 3" class="reasoning-arrow reasoning-arrow--three">→</view>
                  </view>
                </template>
              </view>
            </view>

            <view class="object-legend">
              <button
                v-for="diagramObject in visibleObjects"
                :key="diagramObject.id"
                class="object-legend__item"
                :class="{ 'object-legend__item--active': isSelected(diagramObject.id) }"
                @tap="selectObject(diagramObject.id)"
              >
                <text class="object-legend__symbol">{{ diagramObject.symbol }}</text>
                <text>{{ diagramObject.label }}</text>
              </button>
            </view>
          </view>

          <view class="object-inspector">
            <view class="object-inspector__icon">↗</view>
            <view class="object-inspector__copy">
              <text class="object-inspector__eyebrow">当前选中 · {{ selectedObject?.symbol }}</text>
              <text class="object-inspector__title">{{ selectedObject?.label }}</text>
              <text class="object-inspector__description">{{ selectedObject?.description }}</text>
            </view>
          </view>

          <view class="diagram-note">
            <text class="diagram-note__label">本步图解</text>
            <text class="diagram-note__text">{{ currentStep.diagramCaption }}</text>
          </view>

          <view class="diagram-actions">
            <button
              :class="[
                'diagram-actions__button',
                'diagram-actions__button--secondary',
                { 'diagram-actions__button--disabled': activeStep === 0 },
              ]"
              :disabled="activeStep === 0"
              @tap="showPreviousStep"
            >上一步</button>
            <button class="diagram-actions__button diagram-actions__button--primary" @tap="showNextStep">{{ nextStepLabel }}</button>
          </view>
        </view>

        <view v-if="!isArticleWorkspace" class="follow-up-section">
          <view class="section-heading section-heading--compact">
            <view>
              <text class="section-heading__eyebrow">FOLLOW UP</text>
              <text class="section-heading__title">针对这一步继续追问</text>
            </view>
            <text class="follow-up-section__context">{{ followUpContext }}</text>
          </view>
          <scroll-view class="preset-strip" scroll-x :show-scrollbar="false">
            <view class="preset-strip__inner">
              <button v-for="question in presetQuestions" :key="question" class="preset-question" @tap="submitFollowUp(question)">{{ question }}</button>
            </view>
          </scroll-view>
          <view v-if="followUpExchanges.length === 0" class="follow-up-empty">
            <view class="follow-up-empty__mark">?</view>
            <text>可以询问当前步骤或刚刚点选的对象。回复仅用于演示上下文联动。</text>
          </view>
          <view v-for="exchange in followUpExchanges" :id="`follow-up-${exchange.id}`" :key="exchange.id" class="exchange">
            <view class="exchange__question"><text class="exchange__role">你</text><text class="exchange__text">{{ exchange.question }}</text></view>
            <view class="exchange__answer">
              <view class="exchange__answer-header"><text class="exchange__role exchange__role--assistant">棱镜</text><text class="exchange__demo-badge">演示说明</text><text class="exchange__context">{{ exchange.context }}</text></view>
              <text class="exchange__text exchange__text--answer">{{ exchange.answer }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="!isArticleWorkspace" class="follow-up-dock">
      <view class="follow-up-dock__context"><view class="follow-up-dock__dot" /><text>正在追问：{{ followUpContext }}</text></view>
      <view class="composer">
        <input v-model="followUpText" class="composer__input" confirm-type="send" maxlength="120" placeholder="就这一步或图中对象提问…" placeholder-class="composer__placeholder" @confirm="submitFollowUp()">
        <button
          :class="['composer__send', { 'composer__send--disabled': !followUpText.trim() }]"
          :disabled="!followUpText.trim()"
          @tap="submitFollowUp()"
        >提问</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.solver-page {
  min-height: 100vh;
  color: #1f2937;
  background: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.top-bar {
  position: fixed;
  z-index: 40;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding-right: 24rpx;
  padding-bottom: 0;
  padding-left: 24rpx;
  border-bottom: 1rpx solid #e7ebf0;
  background: rgba(255, 255, 255, 0.97);
  box-sizing: content-box;
}

.top-bar__back {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 158rpx;
  height: 60rpx;
  margin: 0;
  padding: 0 20rpx;
  color: #26364b;
  font-size: 26rpx;
  font-weight: 650;
  line-height: 60rpx;
  border: 1rpx solid #dce2ea;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 5rpx 14rpx rgba(37, 54, 76, 0.05);
}

.top-bar__back--pressed {
  background: #f1f5fa;
  transform: scale(0.98);
}

.top-bar__arrow {
  margin-right: 10rpx;
  margin-top: -2rpx;
  font-size: 34rpx;
}

.top-bar__title {
  position: absolute;
  left: 50%;
  display: flex;
  align-items: baseline;
  transform: translateX(-50%);
}

.top-bar__title-main {
  color: #182638;
  font-size: 28rpx;
  font-weight: 750;
}

.top-bar__title-sub {
  margin-left: 10rpx;
  color: #8793a3;
  font-size: 20rpx;
  font-variant-numeric: tabular-nums;
}

.top-bar__safe-space {
  width: 168rpx;
}

.content-scroll {
  position: fixed;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 166rpx);
  left: 0;
}

.content-scroll--flush {
  bottom: env(safe-area-inset-bottom);
}

.screen-content {
  width: 100%;
  max-width: 820rpx;
  margin: 0 auto;
  padding: 24rpx 24rpx 72rpx;
  box-sizing: border-box;
}

.problem-card {
  padding: 26rpx;
  border: 1rpx solid #e1e6ed;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 32rpx rgba(32, 49, 70, 0.045);
}

.problem-card__meta,
.problem-card__chips,
.preference-summary,
.section-heading,
.step-card__header,
.diagram-card__header,
.diagram-card__tools,
.object-legend,
.object-inspector,
.exchange__answer-header,
.follow-up-dock__context,
.composer {
  display: flex;
  align-items: center;
}

.problem-card__meta,
.section-heading,
.step-card__header,
.diagram-card__header {
  justify-content: space-between;
}

.problem-card__meta {
  margin-bottom: 20rpx;
}

.problem-card__chips {
  min-width: 0;
}

.subject-chip,
.source-chip {
  display: inline-flex;
  align-items: center;
  height: 42rpx;
  padding: 0 16rpx;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 42rpx;
  border-radius: 999rpx;
}

.subject-chip {
  color: #2b65bc;
  background: #edf5ff;
}

.subject-chip--physics {
  color: #b9582f;
  background: #fff1e9;
}

.subject-chip--chemistry {
  color: #b4475d;
  background: #fff0f3;
}

.subject-chip--worksheet {
  color: #237866;
  background: #eaf8f4;
}

.source-chip {
  margin-left: 10rpx;
  color: #68778a;
  background: #f0f2f5;
}

.problem-card__id {
  max-width: 220rpx;
  overflow: hidden;
  color: #98a2b0;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.problem-card__eyebrow,
.section-heading__eyebrow,
.object-inspector__eyebrow {
  display: block;
  color: #3974e8;
  font-size: 19rpx;
  font-weight: 750;
  line-height: 1.4;
  letter-spacing: 1.5rpx;
}

.problem-card__title {
  display: block;
  margin-top: 8rpx;
  color: #182638;
  font-size: 38rpx;
  font-weight: 760;
  line-height: 1.35;
}

.problem-card__statement {
  display: block;
  margin-top: 18rpx;
  padding-top: 18rpx;
  color: #526176;
  font-size: 25rpx;
  line-height: 1.72;
  border-top: 1rpx solid #edf0f4;
}

.draft-image {
  position: relative;
  height: 280rpx;
  margin-top: 18rpx;
  border: 1rpx solid #dce3eb;
  border-radius: 18rpx;
  background: #f4f6f9;
  overflow: hidden;
}

.draft-image__preview {
  width: 100%;
  height: 100%;
}

.draft-image__overlay {
  position: absolute;
  right: 14rpx;
  bottom: 14rpx;
  display: flex;
  align-items: center;
  padding: 9rpx 12rpx;
  color: #fff;
  font-size: 18rpx;
  border-radius: 10rpx;
  background: rgba(31, 50, 75, 0.82);
}

.draft-image__overlay text + text {
  margin-left: 10rpx;
  padding-left: 10rpx;
  border-left: 1rpx solid rgba(255, 255, 255, 0.35);
}

.demo-notice {
  display: flex;
  align-items: flex-start;
  margin-top: 18rpx;
  padding: 15rpx 17rpx;
  color: #5e6e82;
  font-size: 20rpx;
  line-height: 1.55;
  border: 1rpx solid #dce7f7;
  border-radius: 15rpx;
  background: #f5f8fd;
}

.demo-notice--draft {
  color: #84613d;
  border-color: #f0dcc2;
  background: #fff9ef;
}

.demo-notice__mark {
  flex: 0 0 32rpx;
  width: 32rpx;
  height: 32rpx;
  margin-right: 11rpx;
  color: #3974e8;
  font-family: Georgia, serif;
  font-size: 19rpx;
  font-weight: 700;
  line-height: 32rpx;
  text-align: center;
  border-radius: 50%;
  background: #e6f0ff;
}

.demo-notice--draft .demo-notice__mark {
  color: #aa6a31;
  background: #ffedcf;
}

.preference-summary {
  flex-wrap: wrap;
  margin: 18rpx 4rpx 0;
}

.preference-summary text {
  margin: 0 10rpx 8rpx 0;
  padding: 7rpx 12rpx;
  color: #718096;
  font-size: 18rpx;
  line-height: 1.25;
  border-radius: 999rpx;
  background: #eceff3;
}

.mode-switch {
  display: flex;
  margin: 14rpx 0 30rpx;
  padding: 8rpx;
  border: 1rpx solid #e2e7ed;
  border-radius: 22rpx;
  background: #edf0f4;
}

.mode-switch__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  margin: 0;
  padding: 0 20rpx;
  color: #788596;
  font-size: 26rpx;
  font-weight: 680;
  line-height: 72rpx;
  border-radius: 16rpx;
  background: transparent;
}

.mode-switch__item--active {
  color: #245fbf;
  background: #fff;
  box-shadow: 0 5rpx 16rpx rgba(42, 62, 87, 0.08);
}

.mode-switch__icon {
  margin-right: 10rpx;
  font-size: 30rpx;
}

.mode-switch__badge {
  min-width: 31rpx;
  height: 31rpx;
  margin-left: 10rpx;
  color: #fff;
  font-size: 18rpx;
  line-height: 31rpx;
  text-align: center;
  border-radius: 50%;
  background: #3974e8;
}

.section-heading {
  align-items: flex-end;
  margin-bottom: 22rpx;
}

.section-heading__title {
  display: block;
  margin-top: 5rpx;
  color: #1d2c40;
  font-family: Georgia, "Songti SC", serif;
  font-size: 38rpx;
  font-weight: 650;
  line-height: 1.3;
}

.section-heading__hint {
  color: #8995a5;
  font-size: 21rpx;
  white-space: nowrap;
}

.step-card {
  display: flex;
  align-items: stretch;
  margin-bottom: 18rpx;
  border: 1rpx solid #e1e6ed;
  border-radius: 25rpx;
  background: #fff;
  box-shadow: 0 7rpx 22rpx rgba(35, 51, 72, 0.035);
  overflow: hidden;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.step-card--active {
  border-color: #9cc0f6;
  box-shadow: 0 9rpx 24rpx rgba(57, 116, 232, 0.09);
}

.step-card--pressed {
  transform: scale(0.992);
}

.step-card--locked {
  color: #9ba5b1;
  background: #f5f6f8;
  box-shadow: none;
}

.step-card__rail {
  position: relative;
  flex: 0 0 84rpx;
  display: flex;
  justify-content: center;
  padding-top: 28rpx;
  background: #fafbfd;
}

.step-card--active .step-card__rail {
  background: #f1f7ff;
}

.step-card__number {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  color: #73839a;
  font-size: 20rpx;
  font-weight: 750;
  border: 1rpx solid #dbe2eb;
  border-radius: 15rpx;
  background: #fff;
}

.step-card--active .step-card__number {
  color: #fff;
  border-color: #3974e8;
  background: #3974e8;
}

.step-card--locked .step-card__number {
  color: #aeb7c1;
  background: #f0f2f5;
}

.step-card__line {
  position: absolute;
  top: 78rpx;
  bottom: -30rpx;
  left: 41rpx;
  width: 2rpx;
  background: #e2e7ee;
}

.step-card__body {
  flex: 1;
  min-width: 0;
  padding: 28rpx 24rpx 26rpx 8rpx;
}

.step-card__header {
  margin-bottom: 18rpx;
}

.step-card__title {
  color: #1c2d43;
  font-size: 30rpx;
  font-weight: 750;
  line-height: 1.35;
}

.step-card--locked .step-card__title {
  color: #8d98a6;
}

.step-card__link,
.step-card__lock {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 20rpx;
  font-weight: 650;
}

.step-card__link { color: #3974e8; }
.step-card__lock { color: #9ba5b1; }

.logic-row {
  display: flex;
  align-items: flex-start;
  margin-top: 14rpx;
}

.logic-row--result {
  margin-top: 17rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #e3e8ef;
}

.logic-row__label {
  flex: 0 0 58rpx;
  width: 58rpx;
  height: 34rpx;
  margin-right: 14rpx;
  color: #53677f;
  font-size: 19rpx;
  font-weight: 700;
  line-height: 34rpx;
  text-align: center;
  border-radius: 9rpx;
  background: #eef2f7;
}

.logic-row__label--derive {
  color: #2866c7;
  background: #edf5ff;
}

.logic-row__label--result {
  color: #267461;
  background: #eaf8f3;
}

.logic-row__text {
  flex: 1;
  color: #59687a;
  font-size: 24rpx;
  line-height: 1.65;
}

.logic-row__text--strong {
  color: #2d4057;
  font-weight: 650;
}

.step-card__locked-copy,
.step-card__collapsed-copy {
  color: #8a96a5;
  font-size: 22rpx;
  line-height: 1.55;
}

.step-card__collapsed-copy {
  display: flex;
  padding: 14rpx 16rpx;
  border-radius: 14rpx;
  background: #f6f8fa;
}

.step-card__collapsed-copy text:first-child {
  flex-shrink: 0;
  margin-right: 12rpx;
  color: #3974e8;
  font-weight: 700;
}

.unlock-next {
  height: 76rpx;
  margin: 10rpx 0 0;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 76rpx;
  border-radius: 19rpx;
  background: #3974e8;
  box-shadow: 0 8rpx 18rpx rgba(57, 116, 232, 0.18);
}

.section-heading--diagram {
  align-items: center;
}

.diagram-progress {
  display: flex;
  align-items: center;
  color: #63758a;
  font-size: 20rpx;
}

.diagram-progress__count {
  min-width: 58rpx;
  height: 36rpx;
  margin-left: 10rpx;
  color: #2767cc;
  font-weight: 750;
  line-height: 36rpx;
  text-align: center;
  border-radius: 999rpx;
  background: #eaf3ff;
}

.step-strip,
.preset-strip {
  width: 100%;
  white-space: nowrap;
}

.step-strip { margin-bottom: 18rpx; }

.step-strip__inner,
.preset-strip__inner {
  display: inline-flex;
  align-items: center;
  padding-right: 24rpx;
}

.step-strip__item {
  display: inline-flex;
  align-items: center;
  height: 64rpx;
  margin: 0 12rpx 0 0;
  padding: 0 18rpx;
  color: #7a8798;
  font-size: 22rpx;
  line-height: 64rpx;
  border: 1rpx solid #e0e5eb;
  border-radius: 17rpx;
  background: #fff;
}

.step-strip__number { margin-right: 10rpx; font-size: 18rpx; font-weight: 750; }
.step-strip__item--complete { color: #3f7b67; border-color: #cae6dc; background: #f3fbf7; }
.step-strip__item--active { color: #245fbf; font-weight: 700; border-color: #8db7f2; background: #eef6ff; box-shadow: inset 0 -4rpx 0 #3974e8; }
.step-strip__item--locked { color: #a7b0bb; border-color: #e5e8ec; background: #f1f3f5; opacity: 1; }

.diagram-card {
  border: 1rpx solid #dfe5ec;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 34rpx rgba(32, 49, 70, 0.055);
  overflow: hidden;
}

.diagram-card__header {
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid #e8ecf1;
}

.diagram-card__step {
  display: block;
  color: #3974e8;
  font-size: 19rpx;
  font-weight: 750;
}

.diagram-card__title {
  display: block;
  margin-top: 3rpx;
  color: #1d2c40;
  font-size: 28rpx;
  font-weight: 730;
}

.diagram-card__tools { align-items: flex-end; flex-direction: column; }
.diagram-card__tools text { color: #7d8a9b; font-size: 18rpx; line-height: 1.55; }
.diagram-card__tools text:first-child { color: #3974e8; font-weight: 700; }

.diagram-canvas {
  position: relative;
  height: 570rpx;
  background: #fbfcfe;
  overflow: hidden;
}

.diagram-canvas--without-grid { background: #fff; }

.diagram-grid {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  opacity: 0.6;
  background-image: linear-gradient(#edf1f5 1rpx, transparent 1rpx), linear-gradient(90deg, #edf1f5 1rpx, transparent 1rpx);
  background-size: 44rpx 44rpx;
}

.subject-diagram {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform-origin: center;
  transition: transform 180ms ease;
}

.diagram-canvas--top .subject-diagram { transform: scale(0.92) translateY(-8rpx); }
.diagram-canvas--isometric .subject-diagram { transform: scale(0.94) skewY(-1.5deg); }

.pickable {
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
  animation: diagram-enter 190ms ease-out both;
}

.object-legend {
  flex-wrap: wrap;
  padding: 18rpx 20rpx 10rpx;
  border-top: 1rpx solid #e8ecf1;
}

.object-legend__item {
  display: inline-flex;
  align-items: center;
  height: 50rpx;
  margin: 0 10rpx 10rpx 0;
  padding: 0 14rpx;
  color: #68778a;
  font-size: 20rpx;
  line-height: 50rpx;
  border: 1rpx solid #dfe5ec;
  border-radius: 999rpx;
  background: #fafbfd;
}

.object-legend__item--active {
  color: #2765c3;
  font-weight: 650;
  border-color: #93baf0;
  background: #edf5ff;
}

.object-legend__symbol {
  margin-right: 8rpx;
  font-family: Georgia, serif;
  font-style: italic;
  font-weight: 700;
}

.object-inspector {
  align-items: flex-start;
  margin-top: 18rpx;
  padding: 22rpx;
  border: 1rpx solid #cfe0f7;
  border-radius: 22rpx;
  background: #f1f7ff;
}

.object-inspector__icon {
  flex: 0 0 50rpx;
  width: 50rpx;
  height: 50rpx;
  margin-right: 18rpx;
  color: #fff;
  font-size: 25rpx;
  line-height: 50rpx;
  text-align: center;
  border-radius: 50%;
  background: #3974e8;
}

.object-inspector__copy { flex: 1; min-width: 0; }
.object-inspector__title { display: block; margin-top: 3rpx; color: #1f3d68; font-size: 27rpx; font-weight: 720; }
.object-inspector__description { display: block; margin-top: 8rpx; color: #59708d; font-size: 23rpx; line-height: 1.6; }

.diagram-note {
  margin-top: 14rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid #e2e7ed;
  border-radius: 20rpx;
  background: #fff;
}

.diagram-note__label { display: block; color: #8a96a5; font-size: 19rpx; font-weight: 700; }
.diagram-note__text { display: block; margin-top: 7rpx; color: #4b5c71; font-size: 24rpx; line-height: 1.62; }

.diagram-actions { display: flex; margin-top: 16rpx; }
.diagram-actions__button { height: 74rpx; margin: 0; padding: 0 18rpx; font-size: 24rpx; font-weight: 680; line-height: 74rpx; border-radius: 18rpx; }
.diagram-actions__button--secondary { flex: 0 0 190rpx; margin-right: 14rpx; color: #5e6e81; border: 1rpx solid #dce2e9; background: #fff; }
.diagram-actions__button--disabled { color: #b5bdc7; background: #f1f3f6; opacity: 1; }
.diagram-actions__button--primary { flex: 1; color: #fff; background: #3974e8; box-shadow: 0 8rpx 18rpx rgba(57, 116, 232, 0.19); }

.follow-up-section { margin-top: 40rpx; padding-top: 30rpx; border-top: 1rpx solid #e1e6ec; }
.section-heading--compact { align-items: center; margin-bottom: 18rpx; }
.section-heading--compact .section-heading__title { font-family: inherit; font-size: 30rpx; font-weight: 740; }
.follow-up-section__context { max-width: 240rpx; padding: 8rpx 13rpx; overflow: hidden; color: #356dbf; font-size: 19rpx; text-overflow: ellipsis; white-space: nowrap; border-radius: 999rpx; background: #eaf3ff; }
.preset-strip { margin-bottom: 16rpx; }
.preset-question { display: inline-flex; align-items: center; height: 58rpx; margin: 0 12rpx 0 0; padding: 0 18rpx; color: #41658f; font-size: 21rpx; line-height: 58rpx; border: 1rpx solid #cfdff2; border-radius: 999rpx; background: #f4f8fd; }

.follow-up-empty {
  display: flex;
  align-items: center;
  padding: 20rpx;
  color: #778598;
  font-size: 22rpx;
  line-height: 1.5;
  border: 1rpx dashed #d9e0e9;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.7);
}

.follow-up-empty__mark { flex: 0 0 42rpx; width: 42rpx; height: 42rpx; margin-right: 16rpx; color: #3974e8; font-size: 23rpx; font-weight: 750; line-height: 42rpx; text-align: center; border-radius: 50%; background: #eaf3ff; }
.exchange { margin-top: 16rpx; }
.exchange__question, .exchange__answer { display: flex; align-items: flex-start; padding: 18rpx 20rpx; border-radius: 20rpx; }
.exchange__question { margin-left: 48rpx; color: #34536f; background: #eaf3ff; }
.exchange__answer { flex-direction: column; margin-top: 10rpx; color: #405267; border: 1rpx solid #dfe5ec; background: #fff; }
.exchange__answer-header { width: 100%; }
.exchange__role { flex-shrink: 0; min-width: 38rpx; margin-right: 12rpx; color: #2768cb; font-size: 20rpx; font-weight: 750; }
.exchange__role--assistant { color: #263b58; }
.exchange__demo-badge { padding: 4rpx 9rpx; color: #a75533; font-size: 17rpx; border-radius: 7rpx; background: #fff0e8; }
.exchange__context { flex: 1; margin-left: 10rpx; overflow: hidden; color: #909aaa; font-size: 18rpx; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.exchange__text { color: inherit; font-size: 23rpx; line-height: 1.62; }
.exchange__text--answer { color: #485b70; }

.follow-up-dock {
  position: fixed;
  z-index: 45;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12rpx 24rpx calc(14rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #dfe5ec;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10rpx 30rpx rgba(37, 51, 69, 0.07);
}

.follow-up-dock__context, .composer { max-width: 820rpx; margin-right: auto; margin-left: auto; }
.follow-up-dock__context { margin-bottom: 8rpx; color: #6d7b8c; font-size: 19rpx; }
.follow-up-dock__dot { width: 10rpx; height: 10rpx; margin-right: 9rpx; border-radius: 50%; background: #3974e8; box-shadow: 0 0 0 5rpx rgba(57, 116, 232, 0.12); }
.composer__input { flex: 1; min-width: 0; height: 72rpx; padding: 0 22rpx; color: #23344a; font-size: 24rpx; line-height: 72rpx; border: 1rpx solid #d8e0e9; border-radius: 18rpx; background: #f8fafc; box-sizing: border-box; }
.composer__placeholder { color: #a2acb9; }
.composer__send { flex: 0 0 116rpx; width: 116rpx; height: 72rpx; margin: 0 0 0 12rpx; padding: 0; color: #fff; font-size: 24rpx; font-weight: 700; line-height: 72rpx; border-radius: 18rpx; background: #3974e8; }
.composer__send--disabled { color: #fff; background: #a9c3e9; opacity: 1; }

.solver-page--font-compact .problem-card__title { font-size: 34rpx; }
.solver-page--font-compact .problem-card__statement,
.solver-page--font-compact .logic-row__text,
.solver-page--font-compact .diagram-note__text { font-size: 22rpx; }
.solver-page--font-compact .step-card__title { font-size: 27rpx; }
.solver-page--font-comfortable .problem-card__title { font-size: 42rpx; }
.solver-page--font-comfortable .problem-card__statement,
.solver-page--font-comfortable .logic-row__text,
.solver-page--font-comfortable .diagram-note__text { font-size: 27rpx; }
.solver-page--font-comfortable .step-card__title { font-size: 33rpx; }
.solver-page--font-comfortable .object-inspector__description,
.solver-page--font-comfortable .exchange__text { font-size: 25rpx; }

.solver-page--reduced-motion .pickable,
.solver-page--reduced-motion .step-card,
.solver-page--reduced-motion .subject-diagram,
.solver-page--reduced-motion .top-bar__back {
  transition: none !important;
  animation: none !important;
}

.top-bar__back::after,
.mode-switch__item::after,
.unlock-next::after,
.step-strip__item::after,
.object-legend__item::after,
.diagram-actions__button::after,
.preset-question::after,
.composer__send::after { border: 0; }

@keyframes diagram-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

<style scoped>
/* Physics · inclined plane */
.incline-plane {
  position: absolute;
  z-index: 3;
  top: 72%;
  left: 6%;
  width: 88%;
  height: 58rpx;
  color: #26364a;
  transform: rotate(-30deg);
  transform-origin: 0 50%;
}

.incline-plane__line {
  position: absolute;
  top: 25rpx;
  right: 0;
  left: 0;
  height: 6rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.incline-plane__tick {
  position: absolute;
  top: 29rpx;
  width: 3rpx;
  height: 24rpx;
  background: currentColor;
  transform: rotate(-18deg);
  transform-origin: top center;
}

.incline-plane__tick--1 { left: 17%; }
.incline-plane__tick--2 { left: 34%; }
.incline-plane__tick--3 { left: 51%; }
.incline-plane__tick--4 { left: 68%; }
.incline-plane__tick--5 { left: 85%; }
.incline-plane.is-selected { color: #3974e8; }
.incline-plane.is-selected .incline-plane__line { box-shadow: 0 0 0 9rpx rgba(57, 116, 232, 0.13); }

.incline-block {
  position: absolute;
  z-index: 7;
  top: 27%;
  left: 47%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 116rpx;
  height: 92rpx;
  color: #1f2937;
  font-family: Georgia, serif;
  font-size: 34rpx;
  font-style: italic;
  font-weight: 700;
  border: 5rpx solid #26364a;
  border-radius: 10rpx;
  background: #fff8e8;
  box-shadow: 0 10rpx 20rpx rgba(37, 52, 69, 0.1);
  transform: rotate(-30deg);
  box-sizing: border-box;
}

.incline-block.is-selected {
  color: #245fbf;
  border-color: #3974e8;
  background: #eef6ff;
  box-shadow: 0 0 0 9rpx rgba(57, 116, 232, 0.13);
}

.force-arrow {
  position: absolute;
  z-index: 9;
  width: 154rpx;
  height: 44rpx;
  color: #3974e8;
  transform-origin: 0 50%;
}

.force-arrow__shaft {
  position: absolute;
  top: 19rpx;
  right: 14rpx;
  left: 0;
  height: 6rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.force-arrow__head {
  position: absolute;
  top: 10rpx;
  right: 0;
  width: 0;
  height: 0;
  border-top: 12rpx solid transparent;
  border-bottom: 12rpx solid transparent;
  border-left: 19rpx solid currentColor;
}

.force-arrow.is-selected .force-arrow__shaft { box-shadow: 0 0 0 8rpx rgba(57, 116, 232, 0.16); }
.force-arrow--gravity { top: 39%; left: 56%; color: #df664e; transform: rotate(90deg); }
.force-arrow--normal { top: 39%; left: 53%; transform: rotate(-120deg); }
.force-arrow--friction { top: 42%; left: 58%; color: #2b9f88; transform: rotate(-30deg); }
.force-name { position: absolute; z-index: 12; padding: 4rpx 9rpx; font-family: Georgia, serif; font-size: 23rpx; font-style: italic; font-weight: 700; border-radius: 9rpx; background: rgba(255,255,255,.9); }
.force-name--gravity { top: 59%; left: 60%; color: #c4513c; }
.force-name--normal { top: 15%; left: 35%; color: #2867c8; }
.force-name--friction { top: 27%; left: 75%; color: #23836f; }
.incline-angle { position: absolute; bottom: 12%; left: 9%; color: #425268; font-size: 22rpx; font-weight: 700; }

/* Physics · projectile */
.projectile-axes {
  position: absolute;
  top: 14%;
  left: 13%;
  width: 72%;
  height: 70%;
  color: #53647a;
}

.projectile-axis { position: absolute; background: currentColor; }
.projectile-axis--x { top: 6%; left: 0; width: 100%; height: 4rpx; }
.projectile-axis--y { top: 0; left: 1%; width: 4rpx; height: 100%; }
.projectile-axes text:nth-of-type(1) { position: absolute; top: 0; right: -28rpx; }
.projectile-axes text:nth-of-type(2) { position: absolute; right: 100%; bottom: -20rpx; }
.projectile-axes.is-selected { color: #3974e8; }
.projectile-ball { position: absolute; z-index: 5; top: 15%; left: 14%; color: #23364e; font-size: 42rpx; line-height: 1; }

.projectile-vector {
  position: absolute;
  z-index: 8;
  width: 180rpx;
  height: 48rpx;
  color: #3974e8;
}

.projectile-vector__line { position: absolute; top: 20rpx; left: 0; width: 150rpx; height: 5rpx; background: currentColor; }
.projectile-vector__line::after { content: ''; position: absolute; top: -10rpx; right: -2rpx; width: 0; height: 0; border-top: 12rpx solid transparent; border-bottom: 12rpx solid transparent; border-left: 18rpx solid currentColor; }
.projectile-vector text { position: absolute; top: -10rpx; right: 0; font-family: Georgia, serif; font-size: 24rpx; font-style: italic; font-weight: 700; }
.projectile-vector--x { top: 13%; left: 18%; }
.projectile-vector--y { top: 20%; left: 13%; color: #df664e; transform: rotate(90deg); transform-origin: 0 50%; }
.projectile-vector--y text { transform: rotate(-90deg); }
.projectile-vector.is-selected .projectile-vector__line { box-shadow: 0 0 0 8rpx rgba(57,116,232,.15); }

.trajectory { position: absolute; top: 0; right: 0; bottom: 0; left: 0; color: #2b9f88; }
.trajectory__dot { position: absolute; width: 15rpx; height: 15rpx; border: 4rpx solid #fff; border-radius: 50%; background: currentColor; box-shadow: 0 2rpx 7rpx rgba(43,159,136,.25); }
.trajectory__dot--1 { top: 20%; left: 24%; }
.trajectory__dot--2 { top: 23%; left: 33%; }
.trajectory__dot--3 { top: 29%; left: 42%; }
.trajectory__dot--4 { top: 38%; left: 51%; }
.trajectory__dot--5 { top: 49%; left: 60%; }
.trajectory__dot--6 { top: 62%; left: 69%; }
.trajectory__dot--7 { top: 75%; left: 78%; }
.trajectory__dot--8 { top: 84%; left: 87%; }
.trajectory text { position: absolute; right: 9%; bottom: 6%; color: #237765; font-family: Georgia, serif; font-size: 23rpx; font-weight: 700; }
.trajectory.is-selected .trajectory__dot { background: #3974e8; box-shadow: 0 0 0 7rpx rgba(57,116,232,.13); }

/* Math · coordinate graph */
.graph-axes { position: absolute; top: 0; right: 0; bottom: 0; left: 0; color: #66758a; }
.graph-axis { position: absolute; background: currentColor; }
.graph-axis--x { top: 54%; left: 8%; width: 86%; height: 4rpx; }
.graph-axis--y { top: 9%; left: 18%; width: 4rpx; height: 81%; }
.graph-axis__x { position: absolute; top: 50%; right: 3%; }
.graph-axis__y { position: absolute; top: 4%; left: 15%; }
.graph-axes.is-selected { color: #3974e8; }

.parabola { position: absolute; top: 0; right: 0; bottom: 0; left: 0; color: #3974e8; }
.parabola__dot { position: absolute; width: 14rpx; height: 14rpx; border-radius: 50%; background: currentColor; transform: translate(-50%, -50%); }
.parabola__dot--1 { top: 18%; left: 20%; }
.parabola__dot--2 { top: 29%; left: 26%; }
.parabola__dot--3 { top: 39%; left: 32%; }
.parabola__dot--4 { top: 48%; left: 38%; }
.parabola__dot--5 { top: 56%; left: 44%; }
.parabola__dot--6 { top: 62%; left: 50%; }
.parabola__dot--7 { top: 65%; left: 56%; }
.parabola__dot--8 { top: 62%; left: 62%; }
.parabola__dot--9 { top: 56%; left: 68%; }
.parabola__dot--10 { top: 48%; left: 74%; }
.parabola__dot--11 { top: 39%; left: 80%; }
.parabola__dot--12 { top: 29%; left: 86%; }
.parabola__dot--13 { top: 18%; left: 92%; }
.parabola.is-selected .parabola__dot { box-shadow: 0 0 0 7rpx rgba(57,116,232,.14); }
.graph-point { position: absolute; z-index: 9; width: 20rpx; height: 20rpx; border: 5rpx solid #fff; border-radius: 50%; background: #e56f51; box-shadow: 0 0 0 3rpx #e56f51; }
.graph-point--vertex { top: 63%; left: 54.5%; }
.graph-point--vertex text { position: absolute; top: 25rpx; left: -38rpx; width: 110rpx; color: #b84f38; font-size: 20rpx; white-space: nowrap; }
.graph-point--vertex.is-selected { box-shadow: 0 0 0 10rpx rgba(229,111,81,.18); }
.roots-group { position: absolute; top: 0; right: 0; bottom: 0; left: 0; color: #3974e8; }
.graph-point--root-one { top: 52%; left: 42.5%; background: #3974e8; box-shadow: 0 0 0 3rpx #3974e8; }
.graph-point--root-two { top: 52%; left: 66.5%; background: #3974e8; box-shadow: 0 0 0 3rpx #3974e8; }
.roots-group text { position: absolute; top: 58%; font-size: 19rpx; }
.roots-group text:nth-of-type(1) { left: 39%; }
.roots-group text:nth-of-type(2) { left: 64%; }
.roots-group.is-selected .graph-point { box-shadow: 0 0 0 10rpx rgba(57,116,232,.18); }
.symmetry-line { position: absolute; z-index: 4; top: 9%; bottom: 10%; left: 56%; width: 3rpx; border-left: 3rpx dashed #2b9f88; }
.symmetry-line text { position: absolute; top: 4rpx; left: 9rpx; width: 70rpx; color: #237765; font-size: 20rpx; }
.symmetry-line.is-selected { border-left-width: 6rpx; }

/* Math · prism */
.prism { position: absolute; top: 8%; right: 8%; bottom: 8%; left: 8%; color: #33475f; }
.prism__face { position: absolute; width: 270rpx; height: 270rpx; border: 5rpx solid currentColor; border-radius: 8rpx; box-sizing: border-box; }
.prism__face--back { top: 36rpx; left: 45%; border-color: #8b9bb0; }
.prism__face--front { top: 180rpx; left: 18%; }
.prism__edge { position: absolute; width: 210rpx; height: 5rpx; background: currentColor; transform: rotate(-35deg); transform-origin: left center; }
.prism__edge--1 { top: 181rpx; left: 18%; }
.prism__edge--2 { top: 181rpx; left: calc(18% + 270rpx); }
.prism__edge--3 { top: 451rpx; left: 18%; }
.prism__edge--4 { top: 451rpx; left: calc(18% + 270rpx); }
.prism > text { position: absolute; font-size: 20rpx; font-weight: 700; }
.prism > text:nth-of-type(1) { top: 455rpx; left: 15%; }
.prism > text:nth-of-type(2) { top: 455rpx; left: 62%; }
.prism > text:nth-of-type(3) { top: 20rpx; right: 6%; }
.prism.is-selected { color: #3974e8; }
.prism.is-selected .prism__face { box-shadow: 0 0 0 7rpx rgba(57,116,232,.1); }
.prism-section { position: absolute; z-index: 9; top: 25%; left: 28%; width: 48%; height: 42%; border: 4rpx solid #2b9f88; border-radius: 8rpx; background: rgba(43,159,136,.16); transform: rotate(-12deg) skewX(-10deg); }
.prism-section text { position: absolute; top: 45%; left: 28%; color: #216e60; font-size: 22rpx; font-weight: 700; transform: skewX(10deg) rotate(12deg); }
.prism-section.is-selected { box-shadow: 0 0 0 9rpx rgba(43,159,136,.14); }
.right-angle { position: absolute; z-index: 12; top: 58%; left: 42%; width: 56rpx; height: 56rpx; color: #3974e8; font-size: 44rpx; font-weight: 700; }
.right-angle.is-selected { color: #e56f51; text-shadow: 0 0 16rpx rgba(229,111,81,.4); }
.plane-angle { position: absolute; z-index: 12; top: 42%; right: 14%; padding: 10rpx 16rpx; color: #b94f39; font-family: Georgia, serif; font-size: 25rpx; font-weight: 700; border: 2rpx solid #efad9e; border-radius: 50%; background: #fff2ed; }
.plane-angle.is-selected { box-shadow: 0 0 0 9rpx rgba(229,111,81,.15); }

/* Math · ellipse */
.ellipse { position: absolute; top: 25%; left: 14%; width: 72%; height: 45%; border: 7rpx solid #3974e8; border-radius: 50%; box-sizing: border-box; }
.ellipse.is-selected { border-color: #2b9f88; box-shadow: 0 0 0 10rpx rgba(43,159,136,.13); }
.ellipse-foci { position: absolute; top: 47%; right: 24%; left: 24%; display: flex; justify-content: space-between; color: #1f3959; }
.ellipse-foci view { position: relative; width: 20rpx; height: 20rpx; color: #1f3959; font-size: 20rpx; font-weight: 700; border-radius: 50%; background: currentColor; }
.ellipse-foci view::after { content: inherit; }
.ellipse-foci view:first-child { text-indent: -36rpx; }
.ellipse-foci view:last-child { text-indent: 25rpx; }
.ellipse-foci.is-selected view { color: #e56f51; box-shadow: 0 0 0 9rpx rgba(229,111,81,.13); }
.ellipse-point { position: absolute; z-index: 9; top: 23%; left: 65%; width: 24rpx; height: 24rpx; color: #b84f38; font-size: 21rpx; font-weight: 700; border: 5rpx solid #fff; border-radius: 50%; background: #e56f51; box-shadow: 0 0 0 3rpx #e56f51; text-indent: 28rpx; }
.tangent { position: absolute; z-index: 6; top: 22%; left: 43%; width: 47%; height: 5rpx; color: #e56f51; font-size: 24rpx; font-style: italic; font-weight: 700; background: currentColor; transform: rotate(-22deg); }
.tangent.is-selected { height: 8rpx; box-shadow: 0 0 0 8rpx rgba(229,111,81,.12); }
.focus-triangle { position: absolute; z-index: 5; top: 0; right: 0; bottom: 0; left: 0; color: #2b9f88; }
.focus-triangle view { position: absolute; top: 49%; left: 25%; width: 43%; height: 4rpx; background: currentColor; transform-origin: left center; }
.focus-triangle view:first-child { transform: rotate(-29deg); }
.focus-triangle view:nth-child(2) { left: 51%; width: 25%; transform: rotate(-55deg); }
.focus-triangle text { position: absolute; bottom: 15%; left: 31%; color: #237765; font-family: Georgia, serif; font-size: 22rpx; font-weight: 700; }
.focus-triangle.is-selected view { height: 7rpx; box-shadow: 0 0 0 7rpx rgba(43,159,136,.12); }
.relation-tag { position: absolute; right: 8%; bottom: 7%; padding: 12rpx 18rpx; color: #2764bd; font-size: 21rpx; font-weight: 700; border: 1rpx solid #a9c8f2; border-radius: 13rpx; background: #edf5ff; }
.relation-tag.is-selected { box-shadow: 0 0 0 9rpx rgba(57,116,232,.14); }

/* Chemistry · molecule */
.molecule-atoms { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }
.atom { position: absolute; z-index: 7; display: flex; align-items: center; justify-content: center; width: 82rpx; height: 82rpx; color: #fff; font-family: Georgia, serif; font-size: 28rpx; font-weight: 700; border: 6rpx solid #fff; border-radius: 50%; background: #53657a; box-shadow: 0 7rpx 16rpx rgba(34,50,70,.16); box-sizing: border-box; }
.atom--c1 { top: 39%; left: 13%; }
.atom--c2 { top: 31%; left: 36%; }
.atom--o { top: 39%; left: 60%; background: #dd6654; }
.atom--h { top: 29%; left: 80%; width: 60rpx; height: 60rpx; color: #46566b; background: #eef1f5; }
.molecule-atoms.is-selected .atom--c1,
.molecule-atoms.is-selected .atom--c2 { background: #3974e8; box-shadow: 0 0 0 9rpx rgba(57,116,232,.13); }
.molecule-bonds { position: absolute; top: 0; right: 0; bottom: 0; left: 0; color: #67778a; }
.bond { position: absolute; z-index: 4; height: 8rpx; border-radius: 999rpx; background: currentColor; transform-origin: left center; }
.bond--one { top: 45%; left: 22%; width: 135rpx; transform: rotate(-12deg); }
.bond--two { top: 40%; left: 46%; width: 135rpx; transform: rotate(13deg); }
.bond--three { top: 44%; left: 70%; width: 105rpx; transform: rotate(-17deg); }
.molecule-bonds.is-selected .bond { color: #3974e8; box-shadow: 0 0 0 7rpx rgba(57,116,232,.12); }
.hydroxyl-halo { position: absolute; z-index: 10; top: 23%; right: 4%; width: 270rpx; height: 170rpx; border: 5rpx solid #e7ad43; border-radius: 50%; background: rgba(255,232,168,.18); }
.hydroxyl-halo text { position: absolute; right: 25rpx; bottom: -42rpx; color: #9c6819; font-size: 21rpx; font-weight: 700; }
.hydroxyl-halo.is-selected { box-shadow: 0 0 0 10rpx rgba(231,173,67,.16); }
.oxidation-flow { position: absolute; right: 8%; bottom: 9%; left: 8%; display: flex; align-items: center; justify-content: center; padding: 16rpx; color: #a44a39; font-size: 23rpx; font-weight: 700; border: 1rpx solid #efc4ba; border-radius: 16rpx; background: #fff4f0; }
.oxidation-flow view { margin: 0 22rpx; color: #e56f51; font-size: 34rpx; }
.oxidation-flow.is-selected { box-shadow: 0 0 0 9rpx rgba(229,111,81,.14); }

/* Chemistry · equilibrium */
.particle-box { position: absolute; top: 10%; right: 8%; bottom: 22%; left: 8%; border: 4rpx solid #cfd8e4; border-radius: 24rpx; background: rgba(255,255,255,.7); }
.particle { position: absolute; width: 27rpx; height: 27rpx; border: 4rpx solid #fff; border-radius: 50%; box-shadow: 0 3rpx 8rpx rgba(34,50,70,.12); }
.particle--a { background: #3974e8; }
.particle--b { background: #e56f51; }
.particle--a-1 { top: 18%; left: 10%; } .particle--a-2 { top: 48%; left: 18%; } .particle--a-3 { top: 70%; left: 8%; } .particle--a-4 { top: 29%; left: 30%; }
.particle--a-5 { top: 63%; left: 37%; } .particle--a-6 { top: 11%; left: 42%; } .particle--a-7 { top: 76%; left: 52%; } .particle--a-8 { top: 41%; left: 48%; }
.particle--b-1 { top: 18%; left: 67%; } .particle--b-2 { top: 51%; left: 61%; } .particle--b-3 { top: 72%; left: 78%; }
.particle--b-4 { top: 30%; left: 83%; } .particle--b-5 { top: 10%; left: 91%; } .particle--b-6 { top: 60%; left: 94%; }
.particle-box.is-selected { border-color: #3974e8; box-shadow: 0 0 0 9rpx rgba(57,116,232,.1); }
.reaction-symbol { position: absolute; z-index: 8; top: 38%; left: 42%; padding: 10rpx 14rpx; color: #2b536e; font-family: Georgia, serif; font-size: 28rpx; font-weight: 700; border-radius: 10rpx; background: rgba(255,255,255,.92); }
.reaction-symbol.is-selected { color: #3974e8; box-shadow: 0 0 0 8rpx rgba(57,116,232,.12); }
.disturbance-tag { position: absolute; z-index: 10; top: 6%; left: 14%; padding: 12rpx 18rpx; color: #2765c3; font-size: 23rpx; font-weight: 800; border: 2rpx solid #9ac0f2; border-radius: 50%; background: #edf5ff; }
.disturbance-tag.is-selected { box-shadow: 0 0 0 10rpx rgba(57,116,232,.15); }
.shift-arrow { position: absolute; z-index: 10; top: 52%; left: 39%; padding: 9rpx 14rpx; color: #267863; font-size: 22rpx; font-weight: 750; border-radius: 10rpx; background: #eaf8f3; }
.shift-arrow.is-selected { box-shadow: 0 0 0 9rpx rgba(43,159,136,.14); }
.balance-bars { position: absolute; z-index: 12; right: 10%; bottom: 6%; display: flex; align-items: flex-end; color: #52657a; }
.balance-bars > view { display: flex; flex-direction: column; align-items: center; margin-left: 20rpx; font-size: 18rpx; }
.balance-bars__bar { width: 42rpx; height: 68rpx; margin-top: 5rpx; border-radius: 7rpx 7rpx 0 0; background: #3974e8; }
.balance-bars > view:nth-child(2) .balance-bars__bar { background: #e56f51; }
.balance-bars > text { order: -1; margin-bottom: 20rpx; font-size: 27rpx; font-weight: 800; }
.balance-bars.is-selected .balance-bars__bar { box-shadow: 0 0 0 7rpx rgba(57,116,232,.12); }

/* Worksheet */
.worksheet-paper { position: absolute; top: 8%; left: 8%; width: 84%; height: 76%; border: 4rpx solid #cbd4df; border-radius: 16rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(35,51,72,.08); box-sizing: border-box; }
.worksheet-paper__line { position: absolute; top: 12%; left: 8%; width: 56%; height: 5rpx; border-radius: 999rpx; background: #d8dee7; }
.worksheet-paper__line--short { top: 21%; width: 34%; }
.worksheet-scan { position: absolute; top: 29%; right: 7%; bottom: 8%; left: 7%; display: flex; align-items: center; justify-content: center; color: #8b98a7; font-size: 20rpx; font-weight: 700; border: 3rpx dashed #9eb4d2; border-radius: 13rpx; background: #f5f8fc; }
.worksheet-paper.is-selected { border-color: #3974e8; box-shadow: 0 0 0 9rpx rgba(57,116,232,.12); }
.condition-tags { position: absolute; z-index: 9; top: 15%; right: 11%; display: flex; flex-direction: column; align-items: flex-end; }
.condition-tags text { margin-bottom: 9rpx; padding: 8rpx 13rpx; color: #2763b9; font-size: 18rpx; font-weight: 700; border: 1rpx solid #b8d0ef; border-radius: 999rpx; background: #edf5ff; }
.condition-tags.is-selected text { box-shadow: 0 0 0 6rpx rgba(57,116,232,.12); }
.worksheet-mini-graph { position: absolute; z-index: 8; top: 37%; right: 15%; width: 56%; height: 39%; color: #3974e8; }
.worksheet-mini-graph__x { position: absolute; top: 72%; left: 3%; width: 92%; height: 4rpx; background: #68788b; }
.worksheet-mini-graph__y { position: absolute; top: 4%; left: 15%; width: 4rpx; height: 88%; background: #68788b; }
.worksheet-curve-dot { position: absolute; width: 12rpx; height: 12rpx; border-radius: 50%; background: currentColor; }
.worksheet-curve-dot--1 { top: 12%; left: 25%; } .worksheet-curve-dot--2 { top: 36%; left: 34%; } .worksheet-curve-dot--3 { top: 57%; left: 43%; }
.worksheet-curve-dot--4 { top: 68%; left: 52%; } .worksheet-curve-dot--5 { top: 57%; left: 61%; } .worksheet-curve-dot--6 { top: 36%; left: 70%; } .worksheet-curve-dot--7 { top: 12%; left: 79%; }
.worksheet-mini-graph.is-selected .worksheet-curve-dot { box-shadow: 0 0 0 7rpx rgba(57,116,232,.14); }
.worksheet-circuit { position: absolute; z-index: 9; top: 39%; right: 14%; width: 61%; height: 34%; color: #2f485f; }
.circuit-wire { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border: 5rpx solid currentColor; border-radius: 8rpx; }
.circuit-battery, .circuit-meter, .circuit-slider { position: absolute; z-index: 2; display: flex; align-items: center; justify-content: center; color: #36516c; border: 4rpx solid currentColor; background: #fff; }
.circuit-battery { top: 35%; left: -15rpx; width: 90rpx; height: 48rpx; font-size: 20rpx; }
.circuit-meter { top: -34rpx; left: 43%; width: 64rpx; height: 64rpx; font-size: 24rpx; font-weight: 800; border-radius: 50%; }
.circuit-slider { right: 12%; bottom: -28rpx; width: 120rpx; height: 54rpx; color: #e06a50; font-size: 20rpx; border-radius: 8rpx; }
.worksheet-circuit.is-selected { color: #3974e8; }
.worksheet-circuit.is-selected .circuit-wire { box-shadow: 0 0 0 8rpx rgba(57,116,232,.13); }
.worksheet-model { position: absolute; z-index: 9; top: 43%; right: 12%; left: 12%; display: flex; align-items: center; justify-content: center; }
.worksheet-model text { padding: 17rpx 20rpx; color: #30577e; font-size: 20rpx; font-weight: 700; border: 2rpx solid #a9c5e8; border-radius: 13rpx; background: #edf5ff; }
.worksheet-model view { margin: 0 16rpx; color: #3974e8; font-size: 30rpx; }
.worksheet-model.is-selected text:last-child { color: #237765; border-color: #9fd4c7; background: #eaf8f3; box-shadow: 0 0 0 8rpx rgba(43,159,136,.13); }
.worksheet-check { position: absolute; z-index: 12; right: 10%; bottom: 7%; padding: 12rpx 17rpx; color: #267761; font-size: 20rpx; font-weight: 750; border: 1rpx solid #a9d8cb; border-radius: 12rpx; background: #eaf8f3; }
.worksheet-check.is-selected { box-shadow: 0 0 0 9rpx rgba(43,159,136,.14); }

/* Generic math reasoning flow */
.reasoning-flow { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }
.reasoning-node { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 210rpx; min-height: 112rpx; padding: 14rpx; color: #4a5f78; border: 2rpx solid #cfd9e6; border-radius: 20rpx; background: #fff; box-shadow: 0 8rpx 18rpx rgba(35,51,72,.06); box-sizing: border-box; }
.reasoning-node text:first-child { color: #3974e8; font-family: Georgia, serif; font-size: 28rpx; font-weight: 750; }
.reasoning-node text:last-child { margin-top: 8rpx; font-size: 20rpx; font-weight: 700; }
.reasoning-node--1 { top: 13%; left: 8%; }
.reasoning-node--2 { top: 13%; right: 8%; }
.reasoning-node--3 { right: 8%; bottom: 13%; }
.reasoning-node--4 { bottom: 13%; left: 8%; }
.reasoning-node.is-selected { color: #245fbf; border-color: #78a7e8; background: #edf5ff; box-shadow: 0 0 0 9rpx rgba(57,116,232,.13); }
.reasoning-arrow { position: absolute; color: #8ca3bf; font-size: 34rpx; font-weight: 700; }
.reasoning-arrow--one { top: 22%; left: 48%; }
.reasoning-arrow--two { top: 48%; right: 20%; transform: rotate(90deg); }
.reasoning-arrow--three { bottom: 22%; left: 48%; transform: rotate(180deg); }
</style>
