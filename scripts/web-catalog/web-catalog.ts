import { PUBLIC_PROBLEMS } from '#/data/problem-library'
import { PHYSICS_PROBLEMS } from '#/features/whiteboard/physics-problems'
import { resolveGeometryProblem } from '#/features/geometry/solution-resolver'
import { createEthanolDocument } from '#/features/whiteboard/chemistry-ethanol'
import { resolveTopicExample, resolveTopicPresentation } from '#/data/topic-examples'
import { getWorksheetPresetSolution } from '#/features/worksheet/preset-solutions'
import { adaptGeometryScene, compileWhiteboardStep, resolveWhiteboardStep } from '@chat-tutor/shared'
import Whiteboard2D from '#/components/whiteboard/whiteboard-2d.vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { CANVAS_THEME, STATE_TOKENS, VISUAL_TONE_TOKENS, DRAWING_METRICS } from '#/components/whiteboard/tokens'

export { CANVAS_THEME, STATE_TOKENS, VISUAL_TONE_TOKENS, DRAWING_METRICS }

const aliases: Record<string, string> = {
  'geometry-prism-2023a': 'math-prism-section',
  'physics-rough-incline': 'physics-incline-force',
  'chemistry-ethanol': 'chemistry-ethanol-oxidation',
}

export async function buildCatalog() {
  const catalog: any[] = []
  for (const problem of PUBLIC_PROBLEMS) {
    const physics = PHYSICS_PROBLEMS.find((p) => `physics-${p.id}` === problem.id)
    const geometry = problem.subject === 'geometry' ? resolveGeometryProblem(problem.question!)?.solution : null
    const topic = resolveTopicExample(problem.id)
    const topicPresentation = resolveTopicPresentation(problem.id)
    const worksheet = problem.id.startsWith('worksheet-')
      ? getWorksheetPresetSolution(Number(problem.id.split('-')[1]) as 1 | 2 | 3 | 4) : null
    const document = physics?.document() ?? topic?.whiteboard?.document
      ?? (problem.id === 'chemistry-ethanol' ? createEthanolDocument() : null)
    const originalSteps: any[] = [...(geometry?.steps ?? worksheet?.presentation.steps ?? topicPresentation?.steps ?? document?.steps ?? [])]
    if (!originalSteps.length) throw new Error(`No solution for ${problem.id}`)
    const steps: any[] = []
    for (const [index, step] of originalSteps.entries()) {
      let doc = step.document ?? document
      let docStep = step.documentStep ?? index
      let geometryScene = step.scene
      let pageId = step.pageId
      if (worksheet) {
        const page = worksheet.pages.find((p) => p.id === step.pageId)
        if (!page) throw new Error(`Missing worksheet page ${problem.id}/${step.id}/${step.pageId}`)
        const action: any = page.steps.find((p) => p.type === 'geometry-scene-execute' || p.type === 'whiteboard-document-execute')
        geometryScene = action?.options?.scene
        if (action?.options?.document) { doc = action.options.document; docStep = action.options.stepIndex ?? 0 }
      }
      if (geometryScene && !doc) { doc = adaptGeometryScene(geometryScene); docStep = 0 }
      if (topic?.steps[index]?.whiteboardStepId && doc) {
        docStep = doc.steps.findIndex((s: any) => s.id === topic.steps[index]!.whiteboardStepId)
        if (docStep < 0) throw new Error(`Missing whiteboard step: ${problem.id}/${step.id}`)
      }
      if (!doc) throw new Error(`Missing scene: ${problem.id}/${step.id}`)
      const scene = compileWhiteboardStep(resolveWhiteboardStep(doc, docStep))
      if (!scene.primitives.length) throw new Error(`Empty scene: ${problem.id}/${step.id}`)
      const fitScene = doc.view?.dimension === 2
        ? compileWhiteboardStep(resolveWhiteboardStep(doc, doc.steps.length - 1)) : scene
      const summary = step.evidence ?? step.summary ?? step.caption ?? ''
      const detail = step.derivation ?? step.detail ?? ''
      const formula = step.conclusion ?? step.formula ?? ''
      const caption = document?.steps[docStep]?.caption ?? geometryScene?.description ?? summary
      steps.push({ id: step.id, title: step.title, summary, detail, formula, caption,
        pageId: pageId ?? step.whiteboardStepId ?? doc.steps[docStep]?.id ?? step.id,
        expect: doc.steps[docStep]?.expect ?? [],
        scene: { dimension: scene.dimension, center: scene.center, radius: scene.radius,
          primitives: scene.primitives, camera: doc.camera ?? geometryScene?.camera ?? { azimuth: -38, elevation: 22 } },
        svg: scene.dimension === 2 ? await renderToString(createSSRApp({render:()=>h(Whiteboard2D, {
          scene, fitScene, showGrid: false,
        })})) : undefined,
      })
    }
    const subject = problem.subject === 'geometry' ? 'math' : problem.subject === 'algebra' ? 'worksheet' : problem.subject
    catalog.push({ ...problem, id: aliases[problem.id] ?? problem.id, webId: problem.id, subject,
      statement: topicPresentation?.problem.question ?? problem.question,
      overview: geometry?.overview ?? worksheet?.presentation.overview ?? physics?.overview
        ?? (document && subject === 'chemistry' ? '先完成碳骨架与价键检查，再突出羟基，最后比较氧化前后的键级变化。' : topicPresentation ? '按题面条件逐步提取关系；每一步只对应右侧同编号的原始步骤图。' : ''),
      problemType: geometry?.problemType ?? worksheet?.presentation.problemType ?? physics?.problemType ?? problem.subjectLabel,
      target: geometry?.target ?? worksheet?.presentation.target ?? physics?.target
        ?? (subject === 'chemistry' ? ['结构式 · 官能团 · 氧化关系'] : []),
      givens: geometry?.givens ?? worksheet?.presentation.givens ?? [],
      equilibrium: physics?.equilibrium,
      answer: geometry?.answer ?? worksheet?.presentation.answer ?? physics?.answer ?? topicPresentation?.answer
        ?? (subject === 'chemistry' ? '乙醇含羟基 —OH；催化氧化后生成含醛基 —CHO 的乙醛。' : ''),
      figure: topic?.sourceFigure ?? topic?.questionFigure ?? (problem.thumbnailPath ? {imagePath:problem.thumbnailPath, alt:problem.title} : undefined),
      steps,
    })
  }
  return catalog
}

export { PUBLIC_PROBLEMS, PHYSICS_PROBLEMS, resolveGeometryProblem, createEthanolDocument,
  resolveTopicExample, getWorksheetPresetSolution, adaptGeometryScene, compileWhiteboardStep }
