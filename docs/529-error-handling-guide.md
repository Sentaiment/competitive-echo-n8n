# 529 Overloaded Error Handling Guide

## Overview

This guide explains how to handle 529 "Overloaded" errors from the Anthropic API using the enhanced retry mechanism.

## Problem

The Anthropic API returns 529 errors when it's overloaded, causing workflow failures. Standard retry mechanisms often fail because they don't implement proper exponential backoff.

## Solution Components

### 1. Enhanced Rate Limiter (`000_rateLimiter.js`)

- **Purpose**: Controls the initial flow of requests
- **Features**:
  - 10-second base delays between requests
  - Exponential backoff with 1.8x multiplier
  - Maximum 2-minute delays
  - Intelligent jitter to prevent thundering herd

### 2. Pre-Request Delay (`000_preRequestDelay.js`)

- **Purpose**: Adds delays before HTTP requests
- **Features**:
  - 15-second base delays
  - Error-aware delay increases
  - Retry attempt multipliers
  - 30% jitter for randomization

### 3. Custom Retry Handler (`000_retryHandler.js`)

- **Purpose**: Handles 529 errors with intelligent retry logic
- **Features**:
  - 30-second base retry delays
  - 2x exponential backoff
  - Maximum 10-minute delays
  - Up to 6 retry attempts
  - Success threshold reset

### 4. Enhanced HTTP Request (`008_prompt31Request-http`)

- **Purpose**: Makes API calls with conservative retry settings
- **Features**:
  - 3 built-in retries with 30-second delays
  - 4-minute timeout
  - Never error mode for custom handling

## Workflow Integration

### Recommended Node Sequence:

```
1. Rate Limiter (000_rateLimiter.js)
   ↓
2. Pre-Request Delay (000_preRequestDelay.js)
   ↓
3. HTTP Request (008_prompt31Request-http)
   ↓
4. Custom Retry Handler (000_retryHandler.js)
   ↓
5. Continue workflow...
```

### Alternative Sequence (for existing workflows):

```
1. HTTP Request (with errors)
   ↓
2. Custom Retry Handler (000_retryHandler.js)
   ↓
3. Back to HTTP Request (if retry needed)
   ↓
4. Continue workflow...
```

## Configuration Tuning

### For High Load Scenarios:

- Increase `baseDelay` in rate limiter to 20-30 seconds
- Increase `baseDelay` in pre-request delay to 30-45 seconds
- Increase `baseDelay` in retry handler to 60 seconds

### For Low Load Scenarios:

- Decrease `baseDelay` in rate limiter to 5-8 seconds
- Decrease `baseDelay` in pre-request delay to 8-12 seconds
- Keep retry handler delays as-is for safety

### For Debugging:

- Enable verbose logging in all nodes
- Monitor delay statistics
- Check error patterns in logs

## Expected Behavior

### Normal Operation:

- 15-25 second delays between requests
- Successful API calls
- Minimal retries

### During Overload:

- Automatic detection of 529 errors
- Exponential backoff: 30s → 60s → 120s → 240s → 480s → 960s
- Up to 6 retry attempts
- Automatic recovery when service stabilizes

### Error Recovery:

- Success threshold resets retry counts
- Gradual delay reduction after success
- Global retry tracking

## Monitoring

### Key Metrics to Watch:

- Global retry count
- Consecutive successes
- Average delays
- Error patterns

### Log Messages to Monitor:

- `🚨 Retryable error detected: HTTP 529`
- `✅ Scheduling retry X/Y`
- `⏰ Retry delay: X seconds`
- `🎉 Reset global retry count after X consecutive successes`

## Troubleshooting

### If Still Getting 529 Errors:

1. Increase base delays in all nodes
2. Check if multiple workflows are running simultaneously
3. Verify API key limits and quotas
4. Consider reducing request frequency further

### If Requests Are Too Slow:

1. Decrease base delays gradually
2. Monitor error rates
3. Adjust based on success/failure patterns

### If Retries Never Succeed:

1. Check if service is permanently down
2. Verify API key validity
3. Check network connectivity
4. Review API usage limits

## Best Practices

1. **Start Conservative**: Use longer delays initially, then optimize
2. **Monitor Patterns**: Track when 529 errors occur most frequently
3. **Adjust Gradually**: Make small changes to delays and monitor results
4. **Test Thoroughly**: Verify retry logic with actual 529 errors
5. **Document Changes**: Keep track of configuration changes and their effects

## Emergency Procedures

### If Workflow Is Stuck:

1. Check if retry handler is in infinite loop
2. Verify maximum retry limits are set
3. Check for non-retryable errors
4. Consider manual intervention

### If Service Is Down:

1. Disable workflows temporarily
2. Check service status
3. Wait for service recovery
4. Resume with conservative settings

## Support

For issues with this retry mechanism:

1. Check the logs for detailed error information
2. Verify node configurations
3. Test with single requests first
4. Adjust delays based on error patterns

