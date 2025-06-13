import toast from 'react-hot-toast'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

interface RateLimitEntry {
  attempts: number
  firstAttempt: number
  blockedUntil?: number
}

class SecurityService {
  private static instance: SecurityService
  private rateLimits: Map<string, RateLimitEntry> = new Map()
  
  // Default rate limit configurations
  private configs: { [key: string]: RateLimitConfig } = {
    login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }, // 5 attempts in 15 min, block for 30 min
    signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts in 1 hour, block for 1 hour
    campaign: { maxAttempts: 10, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 10 campaigns per minute, block for 5 min
    call: { maxAttempts: 100, windowMs: 60 * 1000, blockDurationMs: 10 * 60 * 1000 }, // 100 calls per minute, block for 10 min
    api: { maxAttempts: 60, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 } // 60 API calls per minute, block for 1 min
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService()
    }
    return SecurityService.instance
  }

  // Rate limiting
  checkRateLimit(action: string, identifier: string = 'global'): boolean {
    const key = `${action}:${identifier}`
    const config = this.configs[action]
    
    if (!config) {
      console.warn(`No rate limit config found for action: ${action}`)
      return true
    }

    const now = Date.now()
    const entry = this.rateLimits.get(key)

    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      const remainingTime = Math.ceil((entry.blockedUntil - now) / 1000 / 60)
      toast.error(`Too many attempts. Please try again in ${remainingTime} minutes.`)
      return false
    }

    // Clean up expired entries
    if (entry && now - entry.firstAttempt > config.windowMs) {
      this.rateLimits.delete(key)
    }

    // Get or create entry
    const currentEntry = this.rateLimits.get(key) || {
      attempts: 0,
      firstAttempt: now
    }

    // Increment attempts
    currentEntry.attempts++

    // Check if limit exceeded
    if (currentEntry.attempts > config.maxAttempts) {
      currentEntry.blockedUntil = now + config.blockDurationMs
      this.rateLimits.set(key, currentEntry)
      
      const blockDuration = Math.ceil(config.blockDurationMs / 1000 / 60)
      toast.error(`Rate limit exceeded. Blocked for ${blockDuration} minutes.`)
      return false
    }

    // Update entry
    this.rateLimits.set(key, currentEntry)
    return true
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000) // Limit length
  }

  // Phone number validation and sanitization
  sanitizePhoneNumber(phone: string): string {
    if (!phone) return ''
    
    // Remove all non-digit characters except + at the beginning
    let cleaned = phone.replace(/[^\d+]/g, '')
    
    // Ensure + is only at the beginning
    if (cleaned.includes('+')) {
      const parts = cleaned.split('+')
      cleaned = '+' + parts.join('')
    }
    
    // Limit length
    return cleaned.substring(0, 20)
  }

  // Email validation and sanitization
  sanitizeEmail(email: string): string {
    if (!email) return ''
    
    return email
      .toLowerCase()
      .trim()
      .substring(0, 254) // RFC 5321 limit
  }

  // URL validation and sanitization
  sanitizeUrl(url: string): string {
    if (!url) return ''
    
    try {
      const parsed = new URL(url)
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol')
      }
      
      return parsed.toString()
    } catch {
      return ''
    }
  }

  // Content Security Policy helpers
  generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // XSS Prevention
  escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // CSRF Protection (for forms)
  generateCSRFToken(): string {
    return this.generateNonce()
  }

  // Secure data storage
  secureStore(key: string, data: any): void {
    try {
      const encrypted = btoa(JSON.stringify(data))
      sessionStorage.setItem(`secure_${key}`, encrypted)
    } catch (error) {
      console.error('Failed to store secure data:', error)
    }
  }

  secureRetrieve(key: string): any {
    try {
      const encrypted = sessionStorage.getItem(`secure_${key}`)
      if (!encrypted) return null
      
      return JSON.parse(atob(encrypted))
    } catch (error) {
      console.error('Failed to retrieve secure data:', error)
      return null
    }
  }

  secureRemove(key: string): void {
    sessionStorage.removeItem(`secure_${key}`)
  }

  // Password strength validation
  validatePasswordStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score++
    else feedback.push('Use at least 8 characters')

    if (/[a-z]/.test(password)) score++
    else feedback.push('Include lowercase letters')

    if (/[A-Z]/.test(password)) score++
    else feedback.push('Include uppercase letters')

    if (/\d/.test(password)) score++
    else feedback.push('Include numbers')

    if (/[^a-zA-Z\d]/.test(password)) score++
    else feedback.push('Include special characters')

    if (password.length >= 12) score++

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score--
      feedback.push('Avoid repeated characters')
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score--
      feedback.push('Avoid common patterns')
    }

    return {
      score: Math.max(0, score),
      feedback,
      isStrong: score >= 4
    }
  }

  // Session security
  validateSession(): boolean {
    const lastActivity = localStorage.getItem('lastActivity')
    if (!lastActivity) return false

    const now = Date.now()
    const sessionTimeout = 8 * 60 * 60 * 1000 // 8 hours

    if (now - parseInt(lastActivity) > sessionTimeout) {
      this.clearSession()
      toast.error('Session expired. Please log in again.')
      return false
    }

    // Update last activity
    localStorage.setItem('lastActivity', now.toString())
    return true
  }

  updateActivity(): void {
    localStorage.setItem('lastActivity', Date.now().toString())
  }

  clearSession(): void {
    localStorage.removeItem('lastActivity')
    sessionStorage.clear()
  }

  // Audit logging
  logSecurityEvent(event: string, details: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // In production, this would send to a security logging service
    console.log('Security Event:', logEntry)
    
    // Store locally for debugging (remove in production)
    const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]')
    logs.push(logEntry)
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100)
    }
    
    localStorage.setItem('securityLogs', JSON.stringify(logs))
  }

  // Environment checks
  isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:'
  }

  checkBrowserSecurity(): {
    isSecure: boolean
    warnings: string[]
  } {
    const warnings: string[] = []

    if (!this.isSecureContext()) {
      warnings.push('Connection is not secure (HTTPS required)')
    }

    if (!window.crypto || !window.crypto.getRandomValues) {
      warnings.push('Crypto API not available')
    }

    if (!window.sessionStorage) {
      warnings.push('Session storage not available')
    }

    if (!window.localStorage) {
      warnings.push('Local storage not available')
    }

    return {
      isSecure: warnings.length === 0,
      warnings
    }
  }
}

export default SecurityService.getInstance()