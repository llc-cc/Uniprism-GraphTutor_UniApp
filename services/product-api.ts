import type {
  FollowUpReceipt,
  FollowUpRequest,
  ProblemIntakeReceipt,
  ProblemIntakeRequest,
} from '@/types/product'
import { request } from './http'

export const productApi = {
  submitIntake(input: ProblemIntakeRequest) {
    return request<ProblemIntakeReceipt>({
      path: '/product/intakes',
      method: 'POST',
      data: input,
    })
  },

  submitFollowUp(input: FollowUpRequest) {
    return request<FollowUpReceipt>({
      path: '/product/follow-ups',
      method: 'POST',
      data: input,
    })
  },
}
