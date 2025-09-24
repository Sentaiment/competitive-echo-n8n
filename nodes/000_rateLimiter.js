// Enhanced Rate Limiter with Error Handling and Exponential Backoff
// This node processes scenarios with intelligent retry logic and rate limiting

const inputData = $input.first().json;
console.log("=== ENHANCED RATE LIMITER ===");
console.log("Input data type:", typeof inputData);
console.log("Is array:", Array.isArray(inputData));

// Configuration for rate limiting and retry logic
const RATE_LIMIT_CONFIG = {
  // Base delay between requests (in milliseconds)
  baseDelay: 30000, // 30 seconds base delay (aggressive to prevent 529 errors)

  // Exponential backoff multiplier for overload errors
  backoffMultiplier: 1.8,

  // Maximum delay between requests (in milliseconds)
  maxDelay: 120000, // 2 minutes max

  // Maximum number of retries for overload errors
  maxRetries: 5,

  // Error codes that should trigger backoff
  retryableErrorCodes: [429, 529, 503, 502, 504],

  // Error codes that should trigger immediate retry with same delay
  immediateRetryCodes: [500, 502, 503, 504],

  // Error codes that should trigger longer backoff
  backoffRetryCodes: [429, 529],
};

// Handle the data structure - it's an array of scenario objects directly
let scenarios = [];
if (Array.isArray(inputData)) {
  scenarios = inputData;
  console.log("Input data is directly an array of scenarios");
} else if (inputData.results && Array.isArray(inputData.results)) {
  scenarios = inputData.results;
  console.log("Found scenarios in 'results' array");
} else if (inputData.scenarios && Array.isArray(inputData.scenarios)) {
  scenarios = inputData.scenarios;
  console.log("Found scenarios in 'scenarios' array");
} else {
  console.log("No scenarios found in expected locations");
  console.log("Available keys:", Object.keys(inputData));
}

console.log("Total scenarios to process:", scenarios.length);

// If no scenarios found, return the original data to prevent workflow failure
if (scenarios.length === 0) {
  console.log("No scenarios found - passing through original data");
  return [
    {
      json: inputData,
    },
  ];
}

// Function to calculate delay with exponential backoff
function calculateDelay(attempt, errorCode = null) {
  let delay = RATE_LIMIT_CONFIG.baseDelay;

  // Apply exponential backoff for specific error codes
  if (errorCode && RATE_LIMIT_CONFIG.backoffRetryCodes.includes(errorCode)) {
    delay =
      RATE_LIMIT_CONFIG.baseDelay *
      Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt);
  }

  // Cap at maximum delay
  delay = Math.min(delay, RATE_LIMIT_CONFIG.maxDelay);

  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 2000; // 0-2 second jitter
  delay += jitter;

  return Math.round(delay);
}

// Process each scenario individually with enhanced metadata
const scenarioResults = [];

for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
  const scenario = scenarios[scenarioIndex];
  console.log(
    `\n--- Processing Scenario ${scenarioIndex + 1}/${scenarios.length} ---`
  );
  console.log(`Scenario: ${scenario.scenario_title || "Unknown"}`);

  // Calculate delay for this scenario
  const delayForThisScenario = calculateDelay(scenarioIndex);

  // Create the request data for this scenario with enhanced metadata
  const requestData = {
    scenario: scenario,
    scenarioIndex: scenarioIndex,
    totalScenarios: scenarios.length,
    processing_metadata: {
      totalScenarios: scenarios.length,
      currentScenarioIndex: scenarioIndex,
      delayBetweenRequests: delayForThisScenario,
      sequentialProcessing: true,
      rateLimitConfig: RATE_LIMIT_CONFIG,
      retryLogic: {
        maxRetries: RATE_LIMIT_CONFIG.maxRetries,
        retryableErrorCodes: RATE_LIMIT_CONFIG.retryableErrorCodes,
        immediateRetryCodes: RATE_LIMIT_CONFIG.immediateRetryCodes,
        backoffRetryCodes: RATE_LIMIT_CONFIG.backoffRetryCodes,
      },
      processingTimestamp: new Date().toISOString(),
      estimatedCompletionTime: new Date(
        Date.now() + delayForThisScenario * (scenarios.length - scenarioIndex)
      ).toISOString(),
    },
  };

  scenarioResults.push({
    json: requestData,
  });
}

console.log(`\n=== ENHANCED RATE LIMITING COMPLETE ===`);
console.log(`Created ${scenarioResults.length} individual scenario requests`);
console.log(`Total scenarios to process: ${scenarios.length}`);
console.log(`Base delay: ${RATE_LIMIT_CONFIG.baseDelay}ms`);
console.log(`Max delay: ${RATE_LIMIT_CONFIG.maxDelay}ms`);
console.log(
  `Estimated total processing time: ${Math.round(
    (RATE_LIMIT_CONFIG.baseDelay * scenarios.length) / 1000
  )} seconds`
);

// Return all scenarios individually
return scenarioResults;
