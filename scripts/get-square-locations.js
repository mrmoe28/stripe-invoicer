// Quick script to get Square Location ID
const { SquareClient, SquareEnvironment } = require('square');

// Use production credentials
const client = new SquareClient({
  accessToken: 'EAAAlx2ChyW15BdBXaAMwhHiRSRutkxf1KYn49mk7-qF9_82dKkfnm5tlBpjgQUm',
  environment: SquareEnvironment.Production,
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