export interface TenantConfig {
  id: string
  name: string
  crmTitle: string
  dashboardTitle: string
  clientDirectoryTitle: string
  messagingTitle: string
  invoicesTitle: string
  billingCompany: string
  billingAddress: string
  billingPhone: string
  email: string
  logoUrl: string
  storagePrefix: string
}

export const TENANTS: Record<string, TenantConfig> = {
  wizardwash: {
    id: 'wizardwash',
    name: 'Wizard Wash',
    crmTitle: 'Wizard Wash CRM',
    dashboardTitle: 'Wizard Wash Operations Dashboard',
    clientDirectoryTitle: 'Wizard Wash Client Directory',
    messagingTitle: 'Wizard Wash Messaging Center',
    invoicesTitle: 'Wizard Wash Billing & Invoices',
    billingCompany: 'Wizard Wash Exterior Cleaning',
    billingAddress: 'Virginia Beach & Hampton Roads • VA',
    billingPhone: '(757) 555-0199',
    email: 'omar@wizardwashva.com',
    logoUrl: '/CRM/Wizard Wash Logo.png',
    storagePrefix: 'wizardwash_',
  },
  viracis: {
    id: 'viracis',
    name: 'Viracis Enterprise',
    crmTitle: 'Viracis Enterprise CRM',
    dashboardTitle: 'Viracis Operations Dashboard',
    clientDirectoryTitle: 'Viracis Client Directory',
    messagingTitle: 'Viracis Client Messaging Center',
    invoicesTitle: 'Viracis Billing & Invoices',
    billingCompany: 'Viracis Enterprise Technology Consulting',
    billingAddress: '100 West Broad Street • Richmond, VA 23220',
    billingPhone: '(804) 503-3954',
    email: 'admin@viracis.com',
    logoUrl: '/viracis-logo.png',
    storagePrefix: 'viracis_',
  },
}

export function getTenantConfig(email?: string | null): TenantConfig {
  if (!email) return TENANTS.wizardwash
  const normalized = email.trim().toLowerCase()
  if (normalized.includes('viracis.com') && !normalized.includes('wizardwash')) {
    return TENANTS.viracis
  }
  return TENANTS.wizardwash
}

export function getActiveTenantEmailFromCookie(): string {
  if (typeof document === 'undefined') return 'omar@wizardwashva.com'
  const match = document.cookie.match(/(?:^|; )viracis_user_email=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : 'omar@wizardwashva.com'
}
