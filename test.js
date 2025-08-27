import fetch from 'node-fetch';

async function testWebhook() {
  // Wait for the server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  const url = 'http://localhost:3000/webhook/vapi';
  const payload = {
    message: {
      type: 'call-ended',
      call: {
        id: 'call_12345',
        customer: {
          number: '+1234567890'
        },
        duration: 120,
        analysis: {
          summary: 'This is a test call summary.',
          extractedInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            company: 'Test Inc.',
            industry: 'Technology',
            employeeCount: '10-50',
            painPoint: 'Testing email functionality',
            timeline: 'ASAP',
            budget: '$10,000',
            qualificationScore: 9,
            callOutcome: 'Demo scheduled',
            nextSteps: 'Send follow-up email'
          }
        }
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Webhook test successful!');
    } else {
      const errorText = await response.text();
      console.error(`Webhook test failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error sending webhook test:', error);
  }
}

testWebhook();
