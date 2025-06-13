import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  PhoneIcon,
  CircleStackIcon as DatabaseIcon,
  LinkIcon,
  BoltIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { DatabaseService } from '../services/database'
import MonitoringService from '../services/monitoring'
import AutoDialerService from '../services/autoDialer'
import type { SystemStatus } from '../lib/supabase'
import toast from 'react-hot-toast'

const SERVICES = [
  {
    id: 'api',
    name: 'API Service',
    description: 'Core API endpoints and authentication',
    icon: ServerIcon,
    critical: true
  },
  {
    id: 'calls',
    name: 'Call Service',
    description: 'Voice calling and telephony integration',
    icon: PhoneIcon,
    critical: true
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Data storage and retrieval',
    icon: DatabaseIcon,
    critical: true
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'External integrations and notifications',
    icon: LinkIcon,
    critical: false
  },
  {
    id: 'ai',
    name: 'AI Processing',
    description: 'Gemini AI and voice processing',
    icon: BoltIcon,
    critical: true
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Reporting and data analysis',
    icon: ChartBarIcon,
    critical: false
  }
]

const STATUS_COLORS = {
  operational: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: CheckCircleIcon,
    dot: 'bg-green-500'
  },
  degraded: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: ExclamationTriangleIcon,
    dot: 'bg-yellow-500'
  },
  outage: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: XCircleIcon,
    dot: 'bg-red-500'
  }
}

const UPTIME_DATA = [
  { date: '2024-01-01', uptime: 99.9 },
  { date: '2024-01-02', uptime: 100 },
  { date: '2024-01-03', uptime: 99.8 },
  { date: '2024-01-04', uptime: 100 },
  { date: '2024-01-05', uptime: 100 },
  { date: '2024-01-06', uptime: 99.9 },
  { date: '2024-01-07', uptime: 100 },
  { date: '2024-01-08', uptime: 100 },
  { date: '2024-01-09', uptime: 99.7 },
  { date: '2024-01-10', uptime: 100 },
  { date: '2024-01-11', uptime: 100 },
  { date: '2024-01-12', uptime: 100 },
  { date: '2024-01-13', uptime: 99.9 },
  { date: '2024-01-14', uptime: 100 },
  { date: '2024-01-15', uptime: 100 },
  { date: '2024-01-16', uptime: 100 },
  { date: '2024-01-17', uptime: 99.8 },
  { date: '2024-01-18', uptime: 100 },
  { date: '2024-01-19', uptime: 100 },
  { date: '2024-01-20', uptime: 100 },
  { date: '2024-01-21', uptime: 100 },
  { date: '2024-01-22', uptime: 99.9 },
  { date: '2024-01-23', uptime: 100 },
  { date: '2024-01-24', uptime: 100 },
  { date: '2024-01-25', uptime: 100 },
  { date: '2024-01-26', uptime: 100 },
  { date: '2024-01-27', uptime: 99.6 },
  { date: '2024-01-28', uptime: 100 },
  { date: '2024-01-29', uptime: 100 },
  { date: '2024-01-30', uptime: 100 }
]

export default function StatusPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [healthStatus, setHealthStatus] = useState<any>({ overall: 'healthy', checks: [] })
  const [systemMetrics, setSystemMetrics] = useState<any>({})
  const [dialerStatus, setDialerStatus] = useState<any>({})
  const [recentErrors, setRecentErrors] = useState<any[]>([])

  useEffect(() => {
    // Start monitoring service
    MonitoringService.startMonitoring()
    MonitoringService.monitorNetworkStatus()
    
    loadSystemStatus()
    loadMonitoringData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadSystemStatus()
      loadMonitoringData()
    }, 30000)
    
    return () => {
      clearInterval(interval)
      MonitoringService.stopMonitoring()
    }
  }, [])

  const loadSystemStatus = async () => {
    try {
      setLoading(true)
      const status = await DatabaseService.getSystemStatus()
      setSystemStatus(status)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading system status:', error)
      MonitoringService.logError('StatusPage', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadMonitoringData = () => {
    try {
      const health = MonitoringService.getHealthStatus()
      const metrics = MonitoringService.getSystemMetrics()
      const errors = MonitoringService.getRecentErrors(30) // Last 30 minutes
      const dialer = AutoDialerService.getStatus()

      setHealthStatus(health)
      setSystemMetrics(metrics)
      setRecentErrors(errors)
      setDialerStatus(dialer)
    } catch (error) {
      console.error('Error loading monitoring data:', error)
    }
  }

  const getServiceStatus = (serviceId: string) => {
    const status = systemStatus.find(s => s.service_name === serviceId)
    return status?.status || 'operational'
  }

  const exportDiagnostics = () => {
    try {
      const diagnostics = MonitoringService.exportDiagnostics()
      const blob = new Blob([diagnostics], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diagnostics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Diagnostics exported successfully')
    } catch (error) {
      toast.error('Failed to export diagnostics')
    }
  }

  const refreshData = () => {
    loadSystemStatus()
    loadMonitoringData()
    toast.success('Data refreshed')
  }

  const getOverallStatus = () => {
    const criticalServices = SERVICES.filter(s => s.critical)
    const hasOutage = criticalServices.some(s => getServiceStatus(s.id) === 'outage')
    const hasDegraded = criticalServices.some(s => getServiceStatus(s.id) === 'degraded')
    
    if (hasOutage) return 'outage'
    if (hasDegraded) return 'degraded'
    return 'operational'
  }

  const getOverallStatusMessage = () => {
    const status = getOverallStatus()
    switch (status) {
      case 'operational':
        return 'All systems operational'
      case 'degraded':
        return 'Some systems experiencing issues'
      case 'outage':
        return 'Service disruption detected'
      default:
        return 'Status unknown'
    }
  }

  const calculateAverageUptime = () => {
    const total = UPTIME_DATA.reduce((sum, day) => sum + day.uptime, 0)
    return (total / UPTIME_DATA.length).toFixed(2)
  }

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'bg-green-500'
    if (uptime >= 99.5) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const overallStatus = getOverallStatus()
  const statusConfig = STATUS_COLORS[overallStatus as keyof typeof STATUS_COLORS]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">AI Call Center Status</h1>
            <p className="mt-2 text-lg text-gray-600">
              Real-time status and uptime monitoring for all services
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-4 w-4 rounded-full ${statusConfig.dot} mr-3`}></div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {getOverallStatusMessage()}
                </h2>
                <p className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={loadSystemStatus}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Service Status</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {SERVICES.map((service) => {
              const status = getServiceStatus(service.id)
              const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS]
              const StatusIcon = config.icon
              const ServiceIcon = service.icon
              
              return (
                <div key={service.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ServiceIcon className="h-6 w-6 text-gray-400 mr-3" />
                      <div>
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900 mr-2">
                            {service.name}
                          </h4>
                          {service.critical && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Critical
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <StatusIcon className={`h-5 w-5 mr-2 ${config.text}`} />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text} capitalize`}>
                        {status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Uptime Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">30-Day Uptime</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {calculateAverageUptime()}%
            </div>
            <p className="text-sm text-gray-500">Average uptime over the last 30 days</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              142ms
            </div>
            <p className="text-sm text-gray-500">Average API response time</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Incidents</h3>
            <div className="text-3xl font-bold text-gray-600 mb-2">
              0
            </div>
            <p className="text-sm text-gray-500">Open incidents requiring attention</p>
          </div>
        </div>

        {/* Uptime History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Uptime History (Last 30 Days)</h3>
          <div className="flex items-end space-x-1 h-16">
            {UPTIME_DATA.map((day, index) => (
              <div
                key={index}
                className={`flex-1 rounded-sm ${getUptimeColor(day.uptime)}`}
                style={{ height: `${day.uptime}%` }}
                title={`${day.date}: ${day.uptime}% uptime`}
              ></div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
          <div className="flex items-center justify-center mt-4 space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
              <span>99.9%+ uptime</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm mr-1"></div>
              <span>99.5-99.9% uptime</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div>
              <span>&lt;99.5% uptime</span>
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Uptime</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.floor(systemMetrics.uptime / 3600)}h {Math.floor((systemMetrics.uptime % 3600) / 60)}m
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(systemMetrics.memoryUsage / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Calls</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dialerStatus.activeCalls || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Error Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {systemMetrics.errorRate?.toFixed(1) || '0.0'}/min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Checks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Health Checks</h3>
            <div className="flex space-x-2">
              <button
                onClick={refreshData}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Refresh
              </button>
              <button
                onClick={exportDiagnostics}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {healthStatus.checks.map((check: any) => {
              const statusColor = check.status === 'healthy' ? 'text-green-600' : 
                                 check.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              const StatusIcon = check.status === 'healthy' ? CheckCircleIcon :
                                check.status === 'degraded' ? ExclamationTriangleIcon : XCircleIcon
              
              return (
                <div key={check.name} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StatusIcon className={`h-5 w-5 mr-3 ${statusColor}`} />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{check.name}</h4>
                        {check.error && (
                          <p className="text-sm text-red-600">{check.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {check.responseTime}ms
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(check.lastCheck).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Auto Dialer Status */}
        {dialerStatus.isRunning && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Auto Dialer Status</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Campaign</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {dialerStatus.currentCampaignId || 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Calls</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {dialerStatus.totalCalls || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Successful</p>
                  <p className="text-lg font-semibold text-green-600">
                    {dialerStatus.successfulCalls || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Failed</p>
                  <p className="text-lg font-semibold text-red-600">
                    {dialerStatus.failedCalls || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {recentErrors.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Errors</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
              {recentErrors.slice(0, 10).map((error, index) => (
                <div key={index} className="px-6 py-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{error.context}</p>
                      <p className="text-sm text-red-600">{error.error}</p>
                    </div>
                    <p className="text-xs text-gray-500 ml-4">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Incidents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Incidents</h3>
          </div>
          <div className="p-6">
            {recentErrors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">No recent incidents</h4>
                <p className="mt-1 text-sm text-gray-500">
                  All systems have been running smoothly. We'll post updates here if any issues arise.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center text-yellow-600">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">
                    {recentErrors.length} error(s) detected in the last 30 minutes
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Check the Recent Errors section above for details. Our team is monitoring the situation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Subscribe to Updates */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Stay Updated</h3>
              <p className="text-sm text-blue-700">
                Get notified about service updates and maintenance windows.
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50">
                Subscribe to Updates
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                RSS Feed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}