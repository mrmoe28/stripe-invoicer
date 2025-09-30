// Simple script to create a Stripe payment link using the service directly
const { PrismaClient } = require('@prisma/client');
const { maybeCreateStripePaymentLink } = require('../lib/services/payment-link-service.ts');

async function createTestStripeLink() {
  console.log('🔗 Creating test Stripe payment link...');
  
  const prisma = new PrismaClient();
  
  try {
    // Find or create a test customer
    let customer = await prisma.customer.findFirst({
      where: { email: 'test@example.com' }
    });
    
    if (!customer) {
      console.log('👤 Creating test customer...');
      customer = await prisma.customer.create({
        data: {
          businessName: 'Test Customer',
          email: 'test@example.com',
          customerType: 'BUSINESS',
          workspaceId: 'your-workspace-id' // You'll need to update this
        }
      });
    }
    
    // Create a test invoice
    console.log('📄 Creating test invoice...');
    const invoice = await prisma.invoice.create({
      data: {
        number: `TEST-${Date.now()}`,
        status: 'DRAFT',
        currency: 'USD',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        subtotal: 99.99,
        total: 99.99,
        customerId: customer.id,
        workspaceId: customer.workspaceId,
        lineItems: {
          create: [
            {
              description: 'Test Payment Service',
              quantity: 1,
              unitPrice: 99.99,
              amount: 99.99,
              sortOrder: 0
            }
          ]
        }
      },
      include: {
        lineItems: true,
        customer: true
      }
    });
    
    console.log('✅ Test invoice created:', invoice.number);
    
    // Generate Stripe payment link
    console.log('🔗 Generating Stripe payment link...');
    const paymentLink = await maybeCreateStripePaymentLink(invoice);
    
    if (paymentLink) {
      // Update invoice with payment link
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentLinkUrl: paymentLink }
      });
      
      console.log('🎉 Stripe payment link created!');
      console.log('🔗 Payment URL:', paymentLink);
      console.log('');
      console.log('🌐 Opening in browser...');
      
      // Open in default browser
      const { exec } = require('child_process');
      const platform = process.platform;
      
      let command;
      if (platform === 'darwin') {
        command = `open "${paymentLink}"`;
      } else if (platform === 'win32') {
        command = `start "${paymentLink}"`;
      } else {
        command = `xdg-open "${paymentLink}"`;
      }
      
      exec(command, (error) => {
        if (error) {
          console.log('❌ Could not open browser automatically');
          console.log('📋 Please copy and paste this URL into your browser:');
          console.log(paymentLink);
        } else {
          console.log('✅ Opened payment page in browser!');
        }
      });
      
    } else {
      console.log('❌ Failed to create Stripe payment link');
      console.log('Please check your Stripe configuration');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('workspace')) {
      console.log('💡 Tip: You need to update the workspaceId in this script');
      console.log('   Find your workspace ID in the database or app');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative: Direct Stripe API approach
async function createDirectStripeLink() {
  console.log('🔗 Creating Stripe payment link directly...');
  
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Invoice Payment',
            },
            unit_amount: 9999, // $99.99 in cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'http://localhost:3001/payment-success',
        },
      },
    });
    
    console.log('🎉 Direct Stripe payment link created!');
    console.log('🔗 Payment URL:', paymentLink.url);
    
    // Open in browser
    const { exec } = require('child_process');
    const platform = process.platform;
    
    let command;
    if (platform === 'darwin') {
      command = `open "${paymentLink.url}"`;
    } else if (platform === 'win32') {
      command = `start "${paymentLink.url}"`;
    } else {
      command = `xdg-open "${paymentLink.url}"`;
    }
    
    exec(command, (error) => {
      if (error) {
        console.log('❌ Could not open browser automatically');
        console.log('📋 Please copy and paste this URL into your browser:');
        console.log(paymentLink.url);
      } else {
        console.log('✅ Opened payment page in browser!');
      }
    });
    
  } catch (error) {
    console.error('❌ Stripe API Error:', error.message);
  }
}

// Run the direct approach since it's simpler
console.log('🚀 Starting Stripe payment link creation...');
createDirectStripeLink().catch(console.error);