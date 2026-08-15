import { PropertyData, ScoredLead } from './types'

/**
 * Executes the Lead Scoring Formula for Commercial (B2B) Leads
 */
export function scoreProperty(property: PropertyData): ScoredLead | null {
  let score = 0
  let triggerReason = ''

  // Score based on how "dirty" the business typically gets (need for power washing)
  switch (property.amenityType) {
    case 'fuel':
    case 'car_wash':
      score += 50
      triggerReason = 'High-traffic automotive/fuel (Heavy grease & oil)'
      break
    case 'fast_food':
      score += 40
      triggerReason = 'Fast food restaurant (Grease traps, high foot traffic)'
      break
    case 'restaurant':
      score += 30
      triggerReason = 'Restaurant (Patio & dumpster pad cleaning needed)'
      break
    case 'cafe':
      score += 20
      triggerReason = 'Cafe (Sidewalk & entrance cleaning)'
      break
    default:
      score += 10
      triggerReason = 'General commercial building maintenance'
  }

  // Bonus points if they have a website (indicates an established business that cares about image)
  if (property.website) {
    score += 10
  }

  // If score is below 20, discard it
  if (score < 20) {
    return null
  }

  return {
    ...property,
    score,
    triggerReason
  }
}
