#!/usr/bin/env node

/**
 * Twilio Webhook Configuration Script
 * 
 * This script configures your Twilio phone number to send webhooks to the TW2GEM server
 * for real-time call handling with Gemini AI.
 */

import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error('❌ Missing required Twilio environment variables:');
  console.error('   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// The webhook URL that Twilio will call when a call comes in
const WEBHOOK_URL = 'https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev/webhook';

async function configureWebhook() {
  try {
    console.log('🔧 Configuring Twilio webhook...');
    console.log(`📞 Phone Number: ${phoneNumber}`);
    console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
    
    // Get the phone number resource
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    });
    
    if (phoneNumbers.length === 0) {
      console.error(`❌ Phone number ${phoneNumber} not found in your Twilio account`);
      process.exit(1);
    }
    
    const phoneNumberSid = phoneNumbers[0].sid;
    console.log(`📱 Phone Number SID: ${phoneNumberSid}`);
    
    // Update the phone number configuration
    const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid)
      .update({
        voiceUrl: WEBHOOK_URL,
        voiceMethod: 'POST',
        statusCallback: `${WEBHOOK_URL}/status`,
        statusCallbackMethod: 'POST'
      });
    
    console.log('✅ Twilio webhook configured successfully!');
    console.log('📋 Configuration:');
    console.log(`   Voice URL: ${updatedNumber.voiceUrl}`);
    console.log(`   Voice Method: ${updatedNumber.voiceMethod}`);
    console.log(`   Status Callback: ${updatedNumber.statusCallback}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Make sure your TW2GEM server is running on port 12001');
    console.log('2. Test by calling your Twilio number: ' + phoneNumber);
    console.log('3. The call should be handled by Gemini AI');
    
  } catch (error) {
    console.error('❌ Error configuring webhook:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

// Test webhook connectivity
async function testWebhook() {
  try {
    console.log('\n🧪 Testing webhook connectivity...');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is reachable');
    } else {
      console.log(`⚠️ Webhook endpoint returned status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Webhook endpoint is not reachable: ${error.message}`);
    console.log('   Make sure your TW2GEM server is running');
  }
}

// Main execution
async function main() {
  console.log('🚀 Twilio Webhook Configuration Tool');
  console.log('=====================================\n');
  
  await testWebhook();
  await configureWebhook();
}

main().catch(console.error);