// Manual test to check if we can load the native module
const path = require('path');

console.log('Attempting to load native module...');

try {
  // Try loading the .so file directly
  const nativePath = path.join(__dirname, '../../native/target/release/libcopilot_api_native.so');
  console.log('Trying path:', nativePath);
  
  const native = require(nativePath);
  console.log('✓ Successfully loaded native module!');
  console.log('Available functions:', Object.keys(native));
  
  // Test a simple function
  if (native.getTokenCount) {
    console.log('Testing getTokenCount...');
    const result = native.getTokenCount('[]');
    console.log('Result:', result);
  }
  
} catch (error) {
  console.error('✗ Failed to load native module:', error.message);
  console.log('This is expected - Neon modules need proper compilation setup');
}

console.log('Test complete.');