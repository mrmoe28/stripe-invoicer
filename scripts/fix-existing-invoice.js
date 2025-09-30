// Script to add Stripe payment link to existing invoices that don't have one
require('dotenv').config();

async function fixExistingInvoice() {
  // Since we can't easily import TypeScript modules, let's use the Stripe API directly
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    return;
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  console.log('🔗 Creating Stripe payment link for existing invoice...');
  
  try {
    // Create a payment link for the invoice INV-2004 (from the screenshot)
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Consultation - Invoice INV-2004',
              description: 'Payment for consultation services'
            },
            unit_amount: 100000, // $1,000.00 in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: 'cmg63ijvm0001l2046ybeu4in',
        invoiceNumber: 'INV-2004',
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://ledgerflow.org/payment-success?invoice=cmg63ijvm0001l2046ybeu4in',
        },
      },
    });
    
    console.log('✅ Stripe payment link created successfully!');
    console.log('🔗 Payment URL:', paymentLink.url);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Copy this payment URL');
    console.log('2. Update your database to add this URL to the invoice record');
    console.log('3. Or use this URL directly for testing');
    console.log('');
    console.log('🌐 Opening payment link in browser...');
    
    // Open the payment link in browser
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
        console.log('✅ Opened Stripe payment page in browser!');
      }
    });
    
    // Also create a SQL update command for convenience
    console.log('');
    console.log('💾 Database update command (if needed):');
    console.log(`UPDATE "Invoice" SET "paymentLinkUrl" = '${paymentLink.url}' WHERE id = 'cmg63ijvm0001l2046ybeu4in';`);
    
  } catch (error) {
    console.error('❌ Error creating Stripe payment link:', error.message);
    
    if (error.code === 'parameter_invalid_string_empty') {
      console.log('💡 This might be a Stripe API configuration issue');
    } else if (error.type === 'StripeAuthenticationError') {
      console.log('💡 Check your STRIPE_SECRET_KEY in the .env file');
    }
  }
}

// Alternative: Create a generic test payment link
async function createTestPaymentLink() {
  console.log('🧪 Creating a test Stripe payment link...');
  
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Invoice Payment',
              description: 'Test payment for invoice functionality'
            },
            unit_amount: 9999, // $99.99 in cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://ledgerflow.org/payment-success',
        },
      },
    });
    
    console.log('✅ Test payment link created!');
    console.log('🔗 Test Payment URL:', paymentLink.url);
    
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
        console.log('✅ Opened test payment page in browser!');
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating test payment link:', error.message);
  }
}

console.log('🚀 Starting payment link generation...');
console.log('');

// Try to create the payment link for the existing invoice
fixExistingInvoice().then(() => {
  console.log('');
  console.log('🎯 You can now test the Stripe payment flow!');
}).catch((error) => {
  console.error('Failed to create payment link:', error.message);
  console.log('');
  console.log('🧪 Falling back to test payment link...');
  createTestPaymentLink();
});