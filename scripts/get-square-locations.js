// Quick script to get Square Location ID
const { SquareClient, SquareEnvironment } = require('square');

const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox,
});

async function getLocations() {
  try {
    console.log('🔍 Fetching Square locations...');
    const response = await client.locations.list();
    
    console.log('✅ Locations found:');
    response.result.locations?.forEach(location => {
      console.log(`- Location ID: ${location.id}`);
      console.log(`  Name: ${location.name}`);
      console.log(`  Status: ${location.status}`);
      console.log(`  Type: ${location.type}`);
      console.log('');
    });
    
    const mainLocation = response.result.locations?.[0];
    if (mainLocation) {
      console.log(`🎯 Use this Location ID: ${mainLocation.id}`);
    }
  } catch (error) {
    console.error('❌ Error fetching locations:', error.message);
    if (error.errors) {
      console.error('Details:', error.errors);
    }
  }
}

getLocations();