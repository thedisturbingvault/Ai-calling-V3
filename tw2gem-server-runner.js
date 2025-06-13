import { Tw2GemServer } from './packages/tw2gem-server/dist/index.js';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT || 12001;

// Initialize Supabase client for call logging
const supabase = createClient(
  'https://wllyticlzvtsimgefsti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTA0MTYsImV4cCI6MjA2NTE4NjQxNn0.V2pQNPbCBCjw9WecUFE45dIswma0DjB6ikLi9Kdgcnk'
);

const server = new Tw2GemServer({
    serverOptions: {
        port: PORT
    },
    geminiOptions: {
        server: {
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        },
        setup: {
            model: 'models/gemini-2.0-flash-live-001',
            generationConfig: {
                responseModalities: ['audio'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Puck'
                        }
                    },
                    languageCode: 'en-US'
                },
            },
            systemInstruction: {
                parts: [{ text: 'You are a professional AI assistant for customer service calls. Be helpful, polite, and efficient.' }]
            },
            tools: []
        }
    }
});

server.onNewCall = async (socket) => {
    console.log('New call from Twilio:', socket.twilioStreamSid);
    
    // Log call to database
    try {
        const { error } = await supabase
            .from('call_logs')
            .insert({
                call_sid: socket.twilioStreamSid,
                stream_sid: socket.twilioStreamSid,
                phone_number_from: socket.from || 'unknown',
                phone_number_to: socket.to || process.env.TWILIO_PHONE_NUMBER,
                direction: 'inbound',
                status: 'in_progress',
                started_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Failed to log call to database:', error);
        } else {
            console.log('Call logged to database');
        }
    } catch (err) {
        console.error('Database logging error:', err);
    }
};

server.geminiLive.onReady = (socket) => {
    console.log('Gemini Live connection is ready for call:', socket.twilioStreamSid);
};

server.geminiLive.onClose = (socket) => {
    console.log('Gemini Live connection closed for call:', socket.twilioStreamSid);
};

server.onError = (socket, event) => {
    console.error('Server error:', event);
};

server.onClose = async (socket, event) => {
    console.log('Call ended:', socket.twilioStreamSid);
    
    // Update call status in database
    try {
        const { error } = await supabase
            .from('call_logs')
            .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                duration_seconds: Math.floor((Date.now() - (socket.startTime || Date.now())) / 1000)
            })
            .eq('stream_sid', socket.twilioStreamSid);
        
        if (error) {
            console.error('Failed to update call status:', error);
        } else {
            console.log('Call status updated in database');
        }
    } catch (err) {
        console.error('Database update error:', err);
    }
};

console.log(`🚀 TW2GEM Server running on port ${PORT}`);
console.log(`📞 Twilio webhook URL: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev/webhook`);
console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
console.log(`💾 Database: ${supabase ? 'Connected to Supabase' : 'Not connected'}`);