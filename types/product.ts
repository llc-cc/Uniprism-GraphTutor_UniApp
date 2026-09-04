export type ProductSubject = 'math' | 'physics' | 'chemistry' | 'worksheet'

export interface ProblemIntakeRequest {
  question: string
  subject?: ProductSubject
  imageUrl?: string
  imageName?: string
  clientRequestId?: string
}

export interface ProblemIntakeReceipt {
  intakeId: string
  subject: ProductSubject
  status: 'accepted'
  solvePath: string
  createdAt: string
}

export interface FollowUpContext {
  problemId?: string
  solutionId?: string
  stepId: string
  stepTitle: string
  stepSummary?: string
  whiteboardPageId?: string
  objectId?: string
  objectTitle?: string
}

export interface FollowUpRequest {
  question: string
  context: FollowUpContext
}

export interface FollowUpReceipt {
  followUpId: string
  status: 'accepted'
  answer: string
  stepAppendix: string
  createdAt: string
}
