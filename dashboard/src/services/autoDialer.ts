import { DatabaseService } from './database'
import type { Campaign, CampaignLead, CallLog } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface DialerConfig {
  maxConcurrentCalls: number
  callTimeoutSeconds: number
  retryAttempts: number
  retryDelayMinutes: number
  respectBusinessHours: boolean
  respectDNC: boolean
  callsPerMinute: number
}

export interface DialerStatus {
  isRunning: boolean
  activeCalls: number
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  currentCampaignId: string | null
  lastCallTime: Date | null
  nextCallTime: Date | null
}

class AutoDialerService {
  private static instance: AutoDialerService
  private dialerStatus: DialerStatus = {
    isRunning: false,
    activeCalls: 0,
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    currentCampaignId: null,
    lastCallTime: null,
    nextCallTime: null
  }
  
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map()
  private activeCalls: Map<string, any> = new Map()

  static getInstance(): AutoDialerService {
    if (!AutoDialerService.instance) {
      AutoDialerService.instance = new AutoDialerService()
    }
    return AutoDialerService.instance
  }

  async startCampaign(campaignId: string, config: DialerConfig): Promise<boolean> {
    try {
      // Validate campaign exists and has leads
      const campaign = await DatabaseService.getCampaign(campaignId)
      if (!campaign) {
        toast.error('Campaign not found')
        return false
      }

      if (campaign.status !== 'draft' && campaign.status !== 'paused') {
        toast.error('Campaign must be in draft or paused status to start')
        return false
      }

      // Get pending leads
      const leads = await DatabaseService.getCampaignLeads(campaignId)
      const pendingLeads = leads.filter(lead => 
        lead.status === 'pending' && 
        !lead.do_not_call &&
        lead.call_attempts < config.retryAttempts
      )

      if (pendingLeads.length === 0) {
        toast.error('No available leads to call')
        return false
      }

      // Update campaign status
      await DatabaseService.updateCampaign(campaignId, { 
        status: 'active',
        scheduled_start_date: new Date().toISOString()
      })

      // Start dialer
      this.dialerStatus.isRunning = true
      this.dialerStatus.currentCampaignId = campaignId
      this.dialerStatus.totalCalls = 0
      this.dialerStatus.successfulCalls = 0
      this.dialerStatus.failedCalls = 0

      // Start dialing process
      this.startDialingProcess(campaignId, config)
      
      toast.success(`Campaign started with ${pendingLeads.length} leads`)
      return true

    } catch (error) {
      console.error('Error starting campaign:', error)
      toast.error('Failed to start campaign')
      return false
    }
  }

  async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      // Stop dialing process
      this.stopDialingProcess(campaignId)
      
      // Update campaign status
      await DatabaseService.updateCampaign(campaignId, { status: 'paused' })
      
      this.dialerStatus.isRunning = false
      this.dialerStatus.currentCampaignId = null
      
      toast.success('Campaign paused')
      return true

    } catch (error) {
      console.error('Error pausing campaign:', error)
      toast.error('Failed to pause campaign')
      return false
    }
  }

  async stopCampaign(campaignId: string): Promise<boolean> {
    try {
      // Stop dialing process
      this.stopDialingProcess(campaignId)
      
      // Update campaign status
      await DatabaseService.updateCampaign(campaignId, { 
        status: 'completed',
        scheduled_end_date: new Date().toISOString()
      })
      
      this.dialerStatus.isRunning = false
      this.dialerStatus.currentCampaignId = null
      
      toast.success('Campaign stopped')
      return true

    } catch (error) {
      console.error('Error stopping campaign:', error)
      toast.error('Failed to stop campaign')
      return false
    }
  }

  private async startDialingProcess(campaignId: string, config: DialerConfig) {
    const dialInterval = 60000 / config.callsPerMinute // Convert calls per minute to milliseconds

    const dialerInterval = setInterval(async () => {
      try {
        // Check if we should continue dialing
        if (!this.dialerStatus.isRunning || this.dialerStatus.currentCampaignId !== campaignId) {
          clearInterval(dialerInterval)
          return
        }

        // Check concurrent call limit
        if (this.dialerStatus.activeCalls >= config.maxConcurrentCalls) {
          return
        }

        // Check business hours if enabled
        if (config.respectBusinessHours && !this.isBusinessHours()) {
          return
        }

        // Get next lead to call
        const nextLead = await this.getNextLead(campaignId, config)
        if (!nextLead) {
          // No more leads, stop campaign
          await this.stopCampaign(campaignId)
          return
        }

        // Make the call
        await this.makeCall(campaignId, nextLead, config)

      } catch (error) {
        console.error('Error in dialing process:', error)
      }
    }, dialInterval)

    this.activeIntervals.set(campaignId, dialerInterval)
  }

  private stopDialingProcess(campaignId: string) {
    const interval = this.activeIntervals.get(campaignId)
    if (interval) {
      clearInterval(interval)
      this.activeIntervals.delete(campaignId)
    }
  }

  private async getNextLead(campaignId: string, config: DialerConfig): Promise<CampaignLead | null> {
    try {
      const leads = await DatabaseService.getCampaignLeads(campaignId)
      
      // Filter available leads
      const availableLeads = leads.filter(lead => {
        // Skip if already completed or do not call
        if (lead.status === 'completed' || lead.do_not_call) {
          return false
        }

        // Skip if max attempts reached
        if (lead.call_attempts >= config.retryAttempts) {
          return false
        }

        // Skip if retry delay not met
        if (lead.last_call_at && lead.call_attempts > 0) {
          const lastCallTime = new Date(lead.last_call_at)
          const nextCallTime = new Date(lastCallTime.getTime() + (config.retryDelayMinutes * 60000))
          if (new Date() < nextCallTime) {
            return false
          }
        }

        // Check DNC if enabled
        if (config.respectDNC) {
          // This would check against DNC list - implement based on your DNC logic
          return true
        }

        return true
      })

      // Sort by priority and next call time
      availableLeads.sort((a, b) => {
        const priorityOrder = { 'urgent': 0, 'high': 1, 'normal': 2, 'low': 3 }
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }

        // Then by next call time
        const aNextCall = a.next_call_at ? new Date(a.next_call_at) : new Date(0)
        const bNextCall = b.next_call_at ? new Date(b.next_call_at) : new Date(0)
        return aNextCall.getTime() - bNextCall.getTime()
      })

      return availableLeads[0] || null

    } catch (error) {
      console.error('Error getting next lead:', error)
      return null
    }
  }

  private async makeCall(campaignId: string, lead: CampaignLead, config: DialerConfig): Promise<void> {
    try {
      this.dialerStatus.activeCalls++
      this.dialerStatus.totalCalls++
      this.dialerStatus.lastCallTime = new Date()

      // Update lead status
      await DatabaseService.updateCampaignLead(lead.id, {
        status: 'called',
        call_attempts: lead.call_attempts + 1,
        last_call_at: new Date().toISOString(),
        next_call_at: new Date(Date.now() + (config.retryDelayMinutes * 60000)).toISOString()
      })

      // Make actual call via Twilio
      const callResult = await this.initiateOutboundCall(lead.phone_number, campaignId)
      
      if (callResult.success) {
        this.dialerStatus.successfulCalls++
        
        // Log successful call
        await DatabaseService.createCallLog({
          call_sid: callResult.callSid,
          campaign_id: campaignId,
          lead_id: lead.id,
          phone_number_from: process.env.TWILIO_PHONE_NUMBER || '+18553947135',
          phone_number_to: lead.phone_number,
          direction: 'outbound',
          status: 'in_progress',
          started_at: new Date().toISOString()
        })

        // Update lead status based on call outcome
        setTimeout(async () => {
          try {
            // Check call status after timeout
            const callStatus = await this.checkCallStatus(callResult.callSid)
            await this.updateLeadFromCallResult(lead.id, callStatus)
            this.dialerStatus.activeCalls--
          } catch (error) {
            console.error('Error checking call status:', error)
            this.dialerStatus.activeCalls--
          }
        }, config.callTimeoutSeconds * 1000)

      } else {
        this.dialerStatus.failedCalls++
        this.dialerStatus.activeCalls--
        
        // Update lead with failed status
        await DatabaseService.updateCampaignLead(lead.id, {
          status: 'failed',
          outcome: callResult.error || 'Call failed to connect'
        })
      }

    } catch (error) {
      console.error('Error making call:', error)
      this.dialerStatus.activeCalls--
      this.dialerStatus.failedCalls++
    }
  }

  private async initiateOutboundCall(phoneNumber: string, campaignId: string): Promise<{ success: boolean, callSid?: string, error?: string }> {
    try {
      // This would integrate with Twilio to make actual outbound calls
      // For now, we'll simulate the call
      
      // In production, this would be:
      // const call = await twilioClient.calls.create({
      //   to: phoneNumber,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   url: `${process.env.TW2GEM_SERVER_URL}/webhook?campaign_id=${campaignId}`
      // })
      
      // Simulate call for now
      const callSid = `CA${Date.now()}${Math.random().toString(36).substr(2, 9)}`
      
      return {
        success: true,
        callSid: callSid
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async checkCallStatus(callSid: string): Promise<string> {
    // This would check the actual call status via Twilio
    // For now, simulate different outcomes
    const outcomes = ['completed', 'no-answer', 'busy', 'failed']
    return outcomes[Math.floor(Math.random() * outcomes.length)]
  }

  private async updateLeadFromCallResult(leadId: string, callStatus: string) {
    let leadStatus: CampaignLead['status'] = 'called'
    let outcome = ''

    switch (callStatus) {
      case 'completed':
        leadStatus = 'answered'
        outcome = 'Call completed successfully'
        break
      case 'no-answer':
        leadStatus = 'no_answer'
        outcome = 'No answer'
        break
      case 'busy':
        leadStatus = 'busy'
        outcome = 'Line busy'
        break
      case 'failed':
        leadStatus = 'failed'
        outcome = 'Call failed'
        break
    }

    await DatabaseService.updateCampaignLead(leadId, {
      status: leadStatus,
      outcome: outcome
    })
  }

  private isBusinessHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay() // 0 = Sunday, 6 = Saturday
    
    // Business hours: Monday-Friday, 9 AM - 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17
  }

  getStatus(): DialerStatus {
    return { ...this.dialerStatus }
  }

  isRunning(): boolean {
    return this.dialerStatus.isRunning
  }

  getCurrentCampaignId(): string | null {
    return this.dialerStatus.currentCampaignId
  }
}

export default AutoDialerService.getInstance()