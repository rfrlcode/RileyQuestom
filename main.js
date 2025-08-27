import express from 'express';
import crypto from 'crypto';
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

// Environment variables you'll need to set
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;
const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;

console.log('API Key length:', process.env.ATTIO_API_KEY?.length || 'undefined')

// Verify VAPI webhook signature
function verifyWebhookSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', VAPI_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Function to send email notification for Questom inbound leads
async function sendEmailNotification(callerData) {
  const resend = new Resend(RESEND_API_KEY);

  try {
    // Determine lead priority based on qualification score
    const priority = callerData.qualificationScore >= 8 ? 'HIGH' : 
                    callerData.qualificationScore >= 6 ? 'MEDIUM' : 'LOW';
    
    const priorityColor = priority === 'HIGH' ? '#ff4444' : 
                         priority === 'MEDIUM' ? '#ff8800' : '#44ff44';

    const { data, error } = await resend.emails.send({
      from: 'Riley AI Assistant <riley@waitlist.software-use.com>',
      to: [NOTIFICATION_EMAIL],
      subject: `🔥 ${priority} PRIORITY Inbound Lead - ${callerData.company || callerData.firstName} (Score: ${callerData.qualificationScore || 'N/A'})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Inbound Lead via Riley AI</h1>
            <div style="background: ${priorityColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: bold;">
              ${priority} PRIORITY (Score: ${callerData.qualificationScore || 'N/A'}/10)
            </div>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Contact Information</h2>
            <table style="width: 100%; margin-bottom: 20px;">
              <tr><td style="font-weight: bold; padding: 5px 0;">Name:</td><td>${callerData.firstName || ''} ${callerData.lastName || ''}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Phone:</td><td>${callerData.phoneNumber}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Email:</td><td>${callerData.email || 'Not provided'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Company:</td><td>${callerData.company || 'Not provided'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Industry:</td><td>${callerData.industry || 'Not specified'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Company Size:</td><td>${callerData.employeeCount || 'Not specified'}</td></tr>
            </table>

            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Lead Intelligence</h2>
            <table style="width: 100%; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px;">
              <tr><td style="font-weight: bold; padding: 5px 0;">Pain Point:</td><td>${callerData.painPoint || 'Not identified'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Timeline:</td><td>${callerData.timeline || 'Not specified'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Budget Range:</td><td>${callerData.budget || 'Not discussed'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Call Outcome:</td><td>${callerData.callOutcome || 'Information gathering'}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Next Steps:</td><td>${callerData.nextSteps || 'Follow-up required'}</td></tr>
            </table>

            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Call Details</h2>
            <table style="width: 100%; margin-bottom: 20px;">
              <tr><td style="font-weight: bold; padding: 5px 0;">Call Duration:</td><td>${Math.round(callerData.duration || 0)} seconds (${Math.round((callerData.duration || 0) / 60)} minutes)</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Call Date:</td><td>${new Date().toLocaleString()}</td></tr>
              <tr><td style="font-weight: bold; padding: 5px 0;">Lead Source:</td><td>Inbound Call - Riley AI</td></tr>
            </table>

            ${callerData.notes ? `
            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Riley's Notes</h2>
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p style="margin: 0;">${callerData.notes}</p>
            </div>
            ` : ''}

           
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center;">
            <p style="margin: 0;">Generated by Riley AI Assistant | Questom Inbound Lead System</p>
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log('Lead notification email sent successfully:', data);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Main webhook endpoint for Riley Questom Agent
app.post('/webhook/vapi', async (req, res) => {
  try {
    // Verify webhook signature (optional - set your webhook secret)
    if (VAPI_WEBHOOK_SECRET) {
      const signature = req.headers['x-vapi-signature'];
      const payload = JSON.stringify(req.body);

      if (!verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { message } = req.body;

    switch (message.type) {
      case 'call-started':
        console.log(`Call started: ${message.call.id} from ${message.call.customer.number}`);
        break;

      case 'call-ended':
        // Process the completed call
        await handleCallEnded(message);
        break;

      case 'function-call':
        // Handle function calls during the conversation
        return await handleFunctionCall(message, res);

      case 'transcript':
        // Log conversation for debugging
        console.log(`${message.role}: ${message.transcript}`);
        break;
      
      case 'conversation-update':
        // Log conversation updates for debugging
        handleConversationUpdate(message);
        break;

      default:
        console.log(`Unhandled message type: ${message.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle completed calls for Riley Questom Agent
async function handleCallEnded(message) {
  try {
    const call = message.call;
    
    // Extract caller information from the call
    const callerData = {
      phoneNumber: call.customer.number,
      duration: call.duration,
      callId: call.id,
      // These would be populated during the call via function calls or conversation analysis
      firstName: call.analysis?.extractedInfo?.firstName,
      lastName: call.analysis?.extractedInfo?.lastName,
      email: call.analysis?.extractedInfo?.email,
      company: call.analysis?.extractedInfo?.company,
      industry: call.analysis?.extractedInfo?.industry,
      employeeCount: call.analysis?.extractedInfo?.employeeCount,
      painPoint: call.analysis?.extractedInfo?.painPoint,
      timeline: call.analysis?.extractedInfo?.timeline,
      budget: call.analysis?.extractedInfo?.budget,
      qualificationScore: call.analysis?.extractedInfo?.qualificationScore,
      callOutcome: call.analysis?.extractedInfo?.callOutcome,
      nextSteps: call.analysis?.extractedInfo?.nextSteps,
      notes: call.analysis?.summary || 'Inbound sales call via Riley AI assistant'
    };

    // Send email notification
    await sendEmailNotification(callerData);

    console.log('Call processing completed successfully');
  } catch (error) {
    console.error('Error handling call ended:', error);
    // Re-throw the error to be caught by the main error handler
    throw error;
  }
}

// Handle function calls during the conversation
async function handleFunctionCall(message, res) {
  const { functionCall } = message;

  switch (functionCall.name) {
    case 'capture_lead_info':
      // Enhanced lead capture for Questom sales process
      const leadData = {
        firstName: functionCall.parameters.firstName,
        lastName: functionCall.parameters.lastName,
        email: functionCall.parameters.email,
        company: functionCall.parameters.company,
        phoneNumber: functionCall.parameters.phoneNumber,
        industry: functionCall.parameters.industry,
        employeeCount: functionCall.parameters.employeeCount,
        painPoint: functionCall.parameters.painPoint,
        timeline: functionCall.parameters.timeline,
        budget: functionCall.parameters.budget,
        qualificationScore: functionCall.parameters.qualificationScore,
        callOutcome: functionCall.parameters.callOutcome,
        nextSteps: functionCall.parameters.nextSteps
      };
      
      console.log('Captured lead info for Questom:', leadData);
      
      return res.json({
        result: `Thank you ${leadData.firstName}! I've captured your information and noted that you're interested in AI solutions for ${leadData.company}.`
      });


    case 'schedule_demo':
      // Handle demo scheduling requests
      const demoRequest = {
        name: `${functionCall.parameters.firstName} ${functionCall.parameters.lastName}`,
        email: functionCall.parameters.email,
        company: functionCall.parameters.company,
        requestedTime: functionCall.parameters.requestedTime,
        timezone: functionCall.parameters.timezone,
        specificNeeds: functionCall.parameters.specificNeeds
      };

      console.log('Demo scheduling request:', demoRequest);

      return res.json({
        result: `Excellent! I've noted your request for a demo ${functionCall.parameters.requestedTime}. Our specialist will send you a calendar invite shortly.`
      });

    default:
      return res.status(400).json({ error: `Unknown function: ${functionCall.name}` });
  }
}

// Handle conversation updates for Riley Questom Agent
function handleConversationUpdate(message) {
  if (message.transcript) {
    console.log(`Conversation Update: ${message.role}: ${message.transcript}`);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VAPI-Attio webhook server running on port ${PORT}`);
  console.log('Endpoints:');
  console.log(`- POST /webhook/vapi - Main webhook endpoint`);
  console.log(`- GET /health - Health check`);
});
