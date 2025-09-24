// Enhanced Error Handler for HTTP Request Overloads
// This node handles 529 and other retryable errors with intelligent backoff

console.log("=== ENHANCED ERROR HANDLER ===");

const inputData = $input.all();
console.log("Processing", inputData.length, "items for error handling");

// Configuration for error handling
const ERROR_HANDLING_CONFIG = {
  // Error codes that should trigger retry with backoff
  retryableErrors: {
    429: { type: "rate_limit", backoffMultiplier: 2.0, maxRetries: 3 },
    529: { type: "overloaded", backoffMultiplier: 2.5, maxRetries: 5 },
    503: { type: "service_unavailable", backoffMultiplier: 1.5, maxRetries: 3 },
    502: { type: "bad_gateway", backoffMultiplier: 1.5, maxRetries: 3 },
    504: { type: "gateway_timeout", backoffMultiplier: 1.5, maxRetries: 3 },
  },

  // Base delay for retries (in milliseconds)
  baseRetryDelay: 10000, // 10 seconds

  // Maximum delay between retries
  maxRetryDelay: 300000, // 5 minutes

  // Maximum number of total retries across all attempts
  globalMaxRetries: 10,
};

// Function to determine if an error is retryable
function isRetryableError(error) {
  if (!error || !error.httpCode) return false;

  const httpCode = parseInt(error.httpCode);
  return ERROR_HANDLING_CONFIG.retryableErrors.hasOwnProperty(httpCode);
}

// Function to get retry configuration for an error
function getRetryConfig(error) {
  if (!error || !error.httpCode) return null;

  const httpCode = parseInt(error.httpCode);
  return ERROR_HANDLING_CONFIG.retryableErrors[httpCode] || null;
}

// Function to calculate retry delay with exponential backoff
function calculateRetryDelay(attempt, errorType) {
  const config = ERROR_HANDLING_CONFIG.retryableErrors[errorType];
  if (!config) return ERROR_HANDLING_CONFIG.baseRetryDelay;

  let delay =
    ERROR_HANDLING_CONFIG.baseRetryDelay *
    Math.pow(config.backoffMultiplier, attempt);
  delay = Math.min(delay, ERROR_HANDLING_CONFIG.maxRetryDelay);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 2000; // 0-2 seconds jitter
  delay += jitter;

  return Math.round(delay);
}

// Process each input item
const results = [];

for (let i = 0; i < inputData.length; i++) {
  const item = inputData[i];
  const itemData = item.json || {};

  console.log(`\n--- Processing Item ${i + 1}/${inputData.length} ---`);

  // Check if this item has an error
  if (itemData.error || itemData.errorMessage || itemData.errorDetails) {
    const error = itemData.error || {};
    const httpCode =
      error.httpCode ||
      (itemData.errorDetails && itemData.errorDetails.httpCode);

    console.log(`Error detected: HTTP ${httpCode}`);
    console.log(
      `Error message: ${
        error.errorMessage || itemData.errorMessage || "Unknown error"
      }`
    );

    if (isRetryableError({ httpCode })) {
      const retryConfig = getRetryConfig({ httpCode });
      const currentAttempt = itemData.retryAttempt || 0;

      if (currentAttempt < retryConfig.maxRetries) {
        const nextAttempt = currentAttempt + 1;
        const retryDelay = calculateRetryDelay(currentAttempt, httpCode);

        console.log(
          `✅ Error is retryable (attempt ${nextAttempt}/${retryConfig.maxRetries})`
        );
        console.log(`⏰ Retry delay: ${Math.round(retryDelay / 1000)} seconds`);

        // Create retry request with enhanced metadata
        const retryData = {
          ...itemData,
          retryAttempt: nextAttempt,
          retryMetadata: {
            originalError: error,
            httpCode: httpCode,
            errorType: retryConfig.type,
            attempt: nextAttempt,
            maxRetries: retryConfig.maxRetries,
            retryDelay: retryDelay,
            retryTimestamp: new Date().toISOString(),
            estimatedRetryTime: new Date(Date.now() + retryDelay).toISOString(),
          },
          // Clear the error so it can be retried
          error: null,
          errorMessage: null,
          errorDetails: null,
        };

        results.push({
          json: retryData,
          // Add delay instruction for n8n
          delay: retryDelay,
        });

        continue;
      } else {
        console.log(`❌ Maximum retries exceeded (${retryConfig.maxRetries})`);
      }
    } else {
      console.log(`❌ Error is not retryable (HTTP ${httpCode})`);
    }
  } else {
    console.log(`✅ No errors detected - passing through`);
  }

  // If we reach here, either no error or non-retryable error
  results.push(item);
}

console.log(`\n=== ERROR HANDLING COMPLETE ===`);
console.log(`Processed ${inputData.length} items`);
console.log(`Results: ${results.length} items`);

// Log summary of retryable errors found
const retryableCount = results.filter(
  (item) => item.json && item.json.retryMetadata
).length;

if (retryableCount > 0) {
  console.log(`🔄 ${retryableCount} items scheduled for retry`);
}

return results;
