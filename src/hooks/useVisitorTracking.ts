'use client'

import { useEffect } from 'react'

// ============================================
// DEVICE DETECTION UTILITIES
// ============================================

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  
  const ua = navigator.userAgent.toLowerCase()
  
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile'
  }
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return 'tablet'
  }
  return 'desktop'
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent.toLowerCase()
  
  if (ua.includes('edg/')) return 'edge'
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera'
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome'
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari'
  if (ua.includes('firefox/')) return 'firefox'
  
  return 'other'
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent.toLowerCase()
  
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/windows/i.test(ua)) return 'windows'
  if (/mac os/i.test(ua)) return 'macos'
  if (/linux/i.test(ua)) return 'linux'
  
  return 'other'
}

// ============================================
// PERSISTENT VISITOR ID (localStorage)
// This ID stays the same across browser sessions
// ============================================

const VISITOR_ID_KEY = 'ecomart_visitor_id'
const VISITOR_FIRST_SEEN_KEY = 'ecomart_visitor_first_seen'

function generateVisitorId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `V-${result}`
}

export function getVisitorId(): { visitorId: string; isNewVisitor: boolean; firstSeen: string } {
  if (typeof window === 'undefined') {
    return { visitorId: '', isNewVisitor: false, firstSeen: '' }
  }

  let visitorId = localStorage.getItem(VISITOR_ID_KEY)
  let firstSeen = localStorage.getItem(VISITOR_FIRST_SEEN_KEY)
  let isNewVisitor = false

  if (!visitorId) {
    // FIRST TIME VISITOR - Generate new persistent ID
    visitorId = generateVisitorId()
    firstSeen = new Date().toISOString()
    
    localStorage.setItem(VISITOR_ID_KEY, visitorId)
    localStorage.setItem(VISITOR_FIRST_SEEN_KEY, firstSeen)
    
    isNewVisitor = true
    console.log('🆕 [VISITOR] New visitor assigned ID:', visitorId)
  } else {
    // RETURNING VISITOR - Has persistent ID
    console.log('🔄 [VISITOR] Returning visitor:', visitorId)
  }

  return { 
    visitorId, 
    isNewVisitor,
    firstSeen: firstSeen || new Date().toISOString()
  }
}

// ============================================
// SESSION ID (sessionStorage)
// This ID resets when browser/tab closes
// ============================================

const SESSION_ID_KEY = 'ecomart_session_id'

function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `S-${result}`
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)

  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    console.log('📌 [SESSION] New session:', sessionId)
  }

  return sessionId
}

// ============================================
// TRACK VISITOR - Call on page load
// ============================================

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
    console.log('✅ [TRACKING] Response:', result)
    
    return { visitorId, sessionId, isNewVisitor }
  } catch (error) {
    console.error('❌ [TRACKING] Failed:', error)
    return { visitorId, sessionId, isNewVisitor }
  }
}

// ============================================
// HOOK - Use in components
// ============================================

export function useVisitorTracking() {
  useEffect(() => {
    trackVisitor()
  }, [])
}

export default useVisitorTracking
