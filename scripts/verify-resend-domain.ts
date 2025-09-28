import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyDomain() {
  const apiKey = process.env.RESEND_API_KEY || 're_YY2sVKBS_Ct2KYD6Kg24XWYDQLY1fh2Bo';
  const resend = new Resend(apiKey);
  
  try {
    // Replace with your actual domain ID from Resend dashboard
    const domainId = 'd91cd9bd-1176-453e-8fc1-35364d380206';
    
    console.log('Verifying domain with ID:', domainId);
    
    const result = await resend.domains.verify(domainId);
    
    console.log('Domain verification result:', result);
    
    if (result.data) {
      console.log('✅ Domain verification initiated successfully');
      console.log('Status:', result.data);
    } else if (result.error) {
      console.error('❌ Domain verification failed:', result.error);
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
  }
}

// Run the verification
verifyDomain();