import toast from 'react-hot-toast'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastCheck: Date
  error?: string
}

interface SystemMetrics {
  uptime: number
  memoryUsage: number
  activeConnections: number
  errorRate: number
  averageResponseTime: number
}

interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  threshold?: number
}

class MonitoringService {
  private static instance: MonitoringService
  private healthChecks: Map<string, HealthCheck> = new Map()
  private metrics: PerformanceMetric[] = []
  private errorLog: Array<{ timestamp: Date, error: string, context: string }> = []
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  // Start monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Run health checks every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.runHealthChecks()
      this.collectMetrics()
      this.cleanupOldData()
    }, 30000)

    // Initial health check
    this.runHealthChecks()
    
    console.log('🔍 Monitoring service started')
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    console.log('🔍 Monitoring service stopped')
  }

  // Health checks
  private async runHealthChecks(): Promise<void> {
    const checks = [
      { name: 'Database', url: '/api/health/database' },
      { name: 'TW2GEM Server', url: 'https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev/health' },
      { name: 'Supabase', url: 'https://wllyticlzvtsimgefsti.supabase.co/rest/v1/' },
      { name: 'Authentication', url: '/api/health/auth' }
    ]

    for (const check of checks) {
      await this.performHealthCheck(check.name, check.url)
    }
  }

  private async performHealthCheck(name: string, url: string): Promise<void> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      })

      const responseTime = Date.now() - startTime
      const status = response.ok ? 'healthy' : 'degraded'

      this.healthChecks.set(name, {
        name,
        status,
        responseTime,
        lastCheck: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}`
      })

      // Record performance metric
      this.recordMetric(`${name}_response_time`, responseTime)

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.healthChecks.set(name, {
        name,
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      this.logError(`Health check failed for ${name}`, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Metrics collection
  private collectMetrics(): void {
    // Browser performance metrics
    if (performance && performance.memory) {
      this.recordMetric('memory_used', (performance.memory as any).usedJSHeapSize)
      this.recordMetric('memory_total', (performance.memory as any).totalJSHeapSize)
    }

    // Connection metrics
    if (navigator.connection) {
      const connection = navigator.connection as any
      this.recordMetric('connection_downlink', connection.downlink || 0)
      this.recordMetric('connection_rtt', connection.rtt || 0)
    }

    // Error rate calculation
    const recentErrors = this.errorLog.filter(
      log => Date.now() - log.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    )
    this.recordMetric('error_rate', recentErrors.length)

    // Page load performance
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart)
      this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart)
    }
  }

  recordMetric(name: string, value: number, threshold?: number): void {
    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      threshold
    })

    // Alert if threshold exceeded
    if (threshold && value > threshold) {
      this.alertThresholdExceeded(name, value, threshold)
    }
  }

  // Error logging
  logError(context: string, error: string): void {
    this.errorLog.push({
      timestamp: new Date(),
      error,
      context
    })

    // Alert on critical errors
    if (this.isCriticalError(error)) {
      toast.error(`Critical error in ${context}: ${error}`)
    }

    console.error(`[${context}] ${error}`)
  }

  private isCriticalError(error: string): boolean {
    const criticalPatterns = [
      'database',
      'authentication',
      'payment',
      'security',
      'unauthorized',
      'forbidden'
    ]

    return criticalPatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    )
  }

  // Alerts
  private alertThresholdExceeded(metric: string, value: number, threshold: number): void {
    const message = `Performance alert: ${metric} (${value}) exceeded threshold (${threshold})`
    console.warn(message)
    
    // Only show toast for critical metrics
    if (this.isCriticalMetric(metric)) {
      toast.error(message)
    }
  }

  private isCriticalMetric(metric: string): boolean {
    const criticalMetrics = [
      'error_rate',
      'memory_used',
      'response_time'
    ]

    return criticalMetrics.some(critical => metric.includes(critical))
  }

  // Data cleanup
  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    // Clean old metrics (keep last hour)
    this.metrics = this.metrics.filter(
      metric => metric.timestamp.getTime() > oneHourAgo
    )

    // Clean old error logs (keep last hour)
    this.errorLog = this.errorLog.filter(
      log => log.timestamp.getTime() > oneHourAgo
    )
  }

  // Public getters
  getHealthStatus(): { overall: string, checks: HealthCheck[] } {
    const checks = Array.from(this.healthChecks.values())
    
    let overall = 'healthy'
    if (checks.some(check => check.status === 'unhealthy')) {
      overall = 'unhealthy'
    } else if (checks.some(check => check.status === 'degraded')) {
      overall = 'degraded'
    }

    return { overall, checks }
  }

  getSystemMetrics(): SystemMetrics {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    const recentMetrics = this.metrics.filter(
      metric => metric.timestamp.getTime() > fiveMinutesAgo
    )

    const memoryMetrics = recentMetrics.filter(m => m.name === 'memory_used')
    const responseTimeMetrics = recentMetrics.filter(m => m.name.includes('response_time'))
    const errorMetrics = recentMetrics.filter(m => m.name === 'error_rate')

    return {
      uptime: performance.now() / 1000, // Seconds since page load
      memoryUsage: memoryMetrics.length > 0 
        ? memoryMetrics[memoryMetrics.length - 1].value 
        : 0,
      activeConnections: this.healthChecks.size,
      errorRate: errorMetrics.length > 0 
        ? errorMetrics.reduce((sum, m) => sum + m.value, 0) / errorMetrics.length 
        : 0,
      averageResponseTime: responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
        : 0
    }
  }

  getRecentMetrics(metricName: string, minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - minutes * 60 * 1000
    return this.metrics.filter(
      metric => metric.name === metricName && metric.timestamp.getTime() > cutoff
    )
  }

  getRecentErrors(minutes: number = 5): Array<{ timestamp: Date, error: string, context: string }> {
    const cutoff = Date.now() - minutes * 60 * 1000
    return this.errorLog.filter(
      log => log.timestamp.getTime() > cutoff
    )
  }

  // Performance monitoring
  measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    return fn().then(
      result => {
        const duration = Date.now() - startTime
        this.recordMetric(`${name}_duration`, duration)
        return result
      },
      error => {
        const duration = Date.now() - startTime
        this.recordMetric(`${name}_duration`, duration)
        this.logError(name, error instanceof Error ? error.message : 'Unknown error')
        throw error
      }
    )
  }

  // Network monitoring
  monitorNetworkStatus(): void {
    const updateOnlineStatus = () => {
      this.recordMetric('network_online', navigator.onLine ? 1 : 0)
      
      if (!navigator.onLine) {
        toast.error('Network connection lost')
        this.logError('Network', 'Connection lost')
      } else {
        toast.success('Network connection restored')
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  }

  // Export data for debugging
  exportDiagnostics(): string {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      healthChecks: Array.from(this.healthChecks.values()),
      systemMetrics: this.getSystemMetrics(),
      recentErrors: this.getRecentErrors(30), // Last 30 minutes
      recentMetrics: this.metrics.slice(-100), // Last 100 metrics
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
    }

    return JSON.stringify(diagnostics, null, 2)
  }
}

export default MonitoringService.getInstance()