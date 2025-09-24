// SIMPLE 529 FIX - n8n Compatible Format
// Copy this code into a new Code node and place it AFTER your HTTP Request node

console.log("=== SIMPLE 529 ERROR FIX ===");

const inputData = $input.all();
console.log("Processing", inputData.length, "items for 529 error handling");

// Simple configuration
const QUICK_FIX_CONFIG = {
  maxRetries: 5,
  baseDelay: 60000, // 1 minute
};

// Function to detect 529 errors
function is529Error(item) {
  const itemData = item.json || {};

  // Check for the exact error structure you're seeing
  if (itemData.error) {
    const error = itemData.error;

    // Check for overloaded error description
    if (error.description && error.description.includes("Overloaded")) {
      return true;
    }

    // Check for service failed message
    if (
      error.message &&
      error.message.includes("The service failed to process your request")
    ) {
      return true;
    }

    // Check for NodeApiError with overloaded description
    if (error.name === "NodeApiError" && error.description === "Overloaded") {
      return true;
    }
  }

  return false;
}

// Function to calculate retry delay
function calculateDelay(attempt) {
  let delay = QUICK_FIX_CONFIG.baseDelay * Math.pow(2, attempt);
  delay = Math.min(delay, 600000); // Max 10 minutes
  delay += Math.random() * 10000; // Add jitter
  return Math.round(delay);
}

// Process each item
const results = [];

for (let i = 0; i < inputData.length; i++) {
  const item = inputData[i];
  const itemData = item.json || {};

  console.log(`\n--- Processing Item ${i + 1}/${inputData.length} ---`);
  console.log("🔍 DEBUG: Full item data:", JSON.stringify(itemData, null, 2));

  if (is529Error(item)) {
    const currentAttempt = itemData.retryAttempt || 0;

    console.log(`🚨 529 ERROR DETECTED!`);
    console.log(
      `📝 Error: ${
        itemData.error?.description || itemData.error?.message || "Overloaded"
      }`
    );
    console.log(`🏷️ Error Name: ${itemData.error?.name || "Unknown"}`);
    console.log(
      `🔄 Attempt: ${currentAttempt + 1}/${QUICK_FIX_CONFIG.maxRetries}`
    );

    if (currentAttempt < QUICK_FIX_CONFIG.maxRetries) {
      const nextAttempt = currentAttempt + 1;
      const retryDelay = calculateDelay(currentAttempt);

      console.log(
        `✅ SCHEDULING RETRY ${nextAttempt}/${QUICK_FIX_CONFIG.maxRetries}`
      );
      console.log(`⏰ Retry delay: ${Math.round(retryDelay / 1000)} seconds`);
      console.log(
        `🕐 Retry time: ${new Date(Date.now() + retryDelay).toLocaleString()}`
      );

      // Create retry data with delay information
      const retryData = {
        ...itemData,
        retryAttempt: nextAttempt,
        retryMetadata: {
          originalError: itemData.error,
          attempt: nextAttempt,
          maxRetries: QUICK_FIX_CONFIG.maxRetries,
          retryDelay: retryDelay,
          retryTimestamp: new Date().toISOString(),
          estimatedRetryTime: new Date(Date.now() + retryDelay).toISOString(),
        },
        // Clear the error so it can be retried
        error: null,
      };

      // Return data for retry - n8n will handle the delay
      results.push({
        json: retryData,
      });

      continue;
    } else {
      console.log(
        `❌ MAXIMUM RETRIES EXCEEDED (${QUICK_FIX_CONFIG.maxRetries})`
      );
      console.log(`💀 GIVING UP ON THIS REQUEST`);
    }
  } else {
    console.log(`✅ No 529 error detected - passing through`);
  }

  // If no 529 error or max retries exceeded, pass through
  results.push(item);
}

console.log(`\n=== 529 ERROR FIX COMPLETE ===`);
console.log(`Processed ${inputData.length} items`);

const retryCount = results.filter(
  (item) => item.json && item.json.retryMetadata
).length;

console.log(`🔄 Items scheduled for retry: ${retryCount}`);

if (retryCount > 0) {
  console.log(`🎉 SUCCESS! 529 errors will be retried automatically!`);
  console.log(
    `💡 Add a Wait node after this with ${Math.round(
      QUICK_FIX_CONFIG.baseDelay / 1000
    )} seconds delay`
  );
} else {
  console.log(`✅ No 529 errors found - workflow can continue normally`);
}

return results;
