/**
 * Visitor Tracking System
 * 
 * Architecture:
 * 1. VISITOR_ID (localStorage) - Persistent identifier for unique visitors
 *    - Generated once per device/browser
 *    - Persists across browser sessions (doesn't delete on browser close)
 *    - Format: V-XXXXXX (e.g., V-A1B2C3)
 * 
 * 2. SESSION_ID (sessionStorage) - Current browsing session
 *    - Resets when browser/tab closes
 *    - Used for session duration tracking
 * 
 * 3. Tracking Logic:
 *    - New Visitor: No visitor_id in localStorage
 *    - Returning Visitor: Has visitor_id in localStorage (from previous visit)
 */

const VISITOR_ID_KEY = 'ecomart_visitor_id'
const SESSION_ID_KEY = 'ecomart_session_id'
const VISITOR_FIRST_SEEN_KEY = 'ecomart_visitor_first_seen'

// Generate random ID with prefix
function generateId(prefix: string, length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${result}`
}

/**
 * Get or create PERSISTENT visitor ID
 * This ID stays the same across browser sessions
 * Returns: { visitorId, isNewVisitor }
 */
export function getVisitorId(): { visitorId: string; isNewVisitor: boolean; firstSeen: string } {
  if (typeof window === 'undefined') {
    return { visitorId: '', isNewVisitor: false, firstSeen: '' }
  }

  // Check if visitor already has an ID
  let visitorId = localStorage.getItem(VISITOR_ID_KEY)
  let firstSeen = localStorage.getItem(VISITOR_FIRST_SEEN_KEY)
  let isNewVisitor = false

  if (!visitorId) {
    // FIRST TIME VISITOR - Generate new ID
    visitorId = generateId('V', 6)
    firstSeen = new Date().toISOString()
    
    localStorage.setItem(VISITOR_ID_KEY, visitorId)
    localStorage.setItem(VISITOR_FIRST_SEEN_KEY, firstSeen)
    
    isNewVisitor = true
    console.log('🆕 [VISITOR] New visitor assigned ID:', visitorId)
  } else {
    // RETURNING VISITOR
    console.log('🔄 [VISITOR] Returning visitor:', visitorId)
  }

  return { 
    visitorId, 
    isNewVisitor,
    firstSeen: firstSeen || new Date().toISOString()
  }
}

/**
 * Get or create session ID (resets when browser closes)
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)

  if (!sessionId) {
    sessionId = generateId('S', 8)
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    console.log('📌 [SESSION] New session:', sessionId)
  }

  return sessionId
}

/**
 * Get device type
 */
export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent.toLowerCase()

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile'
  }
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return 'tablet'
  }
  return 'desktop'
}

/**
 * Get browser name
 */
export function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('edg/')) return 'edge'
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera'
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome'
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari'
  if (ua.includes('firefox/')) return 'firefox'

  return 'other'
}

/**
 * Get operating system
 */
export function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/windows/i.test(ua)) return 'windows'
  if (/mac os/i.test(ua)) return 'macos'
  if (/linux/i.test(ua)) return 'linux'

  return 'other'
}

/**
 * Track visitor - call this when user visits the site
 */
export async function trackVisitor(): Promise<{ 
  visitorId: string
  sessionId: string
  isNewVisitor: boolean 
}> {
  if (typeof window === 'undefined') {
    return { visitorId: '', sessionId: '', isNewVisitor: false }
  }

  const { visitorId, isNewVisitor } = getVisitorId()
  const sessionId = getSessionId()
  const deviceType = getDeviceType()
  const browser = getBrowser()
  const os = getOS()
  const today = new Date().toISOString().split('T')[0]

  console.log('📊 [TRACKING]', { 
    visitorId, 
    sessionId, 
    isNewVisitor, 
    deviceType, 
    browser, 
    os 
  })

  try {
    const response = await fetch('/api/visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        visitorId,
        sessionId, 
        deviceType, 
        browser, 
        os,
        isNewVisitor,
        date: today
      }),
    })

    const result = await response.json()
    
    return { visitorId, sessionId, isNewVisitor }
  } catch (error) {
    console.error('Failed to track visitor:', error)
    return { visitorId, sessionId, isNewVisitor }
  }
}

/**
 * Get visitor statistics
 */
export function getVisitorStats(): {
  visitorId: string | null
  sessionId: string | null
  firstSeen: string | null
  isReturning: boolean
} {
  if (typeof window === 'undefined') {
    return { visitorId: null, sessionId: null, firstSeen: null, isReturning: false }
  }

  const visitorId = localStorage.getItem(VISITOR_ID_KEY)
  const sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  const firstSeen = localStorage.getItem(VISITOR_FIRST_SEEN_KEY)

  return {
    visitorId,
    sessionId,
    firstSeen,
    isReturning: !!visitorId
  }
}
