export type PropertyData = {
  address: string
  city: string
  state: string
  zip: string
  propertyType: 'commercial'
  businessName: string
  amenityType: string
  website: string | null
  phone: string | null
  ownerName?: string | null // For B2B, this might just be "Business Owner"
  sqft?: number // Optional for B2B
}

export type ContactData = {
  email: string | null
  phone: string | null
  emailIsValid: boolean
}

export type ScoredLead = PropertyData & {
  score: number
  triggerReason: string
}

export type EnrichedLead = ScoredLead & ContactData & {
  outreachChannel: 'email' | 'mail' | 'both'
}
