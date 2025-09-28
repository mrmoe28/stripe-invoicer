import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.RESEND_API_KEY || 're_YY2sVKBS_Ct2KYD6Kg24XWYDQLY1fh2Bo';
const resend = new Resend(apiKey);

async function listDomains() {
  try {
    console.log('Fetching domains...\n');
    const { data, error } = await resend.domains.list();
    
    if (error) {
      console.error('Error listing domains:', error);
      return;
    }
    
    if (data && data.data) {
      if (data.data.length === 0) {
        console.log('No domains found. You need to add a domain in the Resend dashboard first.');
        console.log('\nSteps to add a domain:');
        console.log('1. Go to https://resend.com/domains');
        console.log('2. Click "Add Domain"');
        console.log('3. Enter your domain name');
        console.log('4. Add the DNS records to your domain provider');
        console.log('5. Run this script again to verify');
      } else {
        console.log('Found domains:');
        data.data.forEach(domain => {
          console.log(`\n- Name: ${domain.name}`);
          console.log(`  ID: ${domain.id}`);
          console.log(`  Status: ${domain.status}`);
          console.log(`  Region: ${domain.region}`);
          console.log(`  Created: ${domain.created_at}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function createDomain(domainName: string) {
  try {
    console.log(`Creating domain: ${domainName}\n`);
    const { data, error } = await resend.domains.create({
      name: domainName,
      region: 'us-east-1' // You can change this to your preferred region
    });
    
    if (error) {
      console.error('Error creating domain:', error);
      return;
    }
    
    if (data) {
      console.log('✅ Domain created successfully!');
      console.log(`Domain ID: ${data.id}`);
      console.log(`Status: ${data.status}`);
      console.log('\nDNS Records to add:');
      if (data.records) {
        data.records.forEach(record => {
          console.log(`\n${record.type} Record:`);
          console.log(`  Name: ${record.name}`);
          console.log(`  Value: ${record.value}`);
          if (record.priority) {
            console.log(`  Priority: ${record.priority}`);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check command line arguments
const command = process.argv[2];
const domainName = process.argv[3];

if (command === 'create' && domainName) {
  createDomain(domainName);
} else if (command === 'list' || !command) {
  listDomains();
} else {
  console.log('Usage:');
  console.log('  List domains: npx tsx scripts/manage-resend-domains.ts list');
  console.log('  Create domain: npx tsx scripts/manage-resend-domains.ts create yourdomain.com');
}