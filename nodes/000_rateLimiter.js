// Rate Limiter Node - Prevents API rate limit issues
// This node adds delays between API calls to stay within rate limits

console.log("=== RATE LIMITER NODE ===");

const delayMs = 30000; // 30 seconds delay between API calls
console.log(`Adding ${delayMs}ms delay to prevent rate limiting...`);

// Simple delay function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wait for the specified delay
await delay(delayMs);

console.log("Rate limiter delay completed");

// Pass through the original data
return $input.all();
