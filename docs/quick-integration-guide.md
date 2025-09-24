# Quick Integration Guide for 529 Error Handling

## 🚨 **Immediate Fix for Your Current Workflow**

Since you're still getting 529 errors, here's how to quickly integrate the retry handler into your existing workflow:

### **Step 1: Add Custom Retry Handler After HTTP Request**

1. **Copy the code** from `000_retryHandler.js`
2. **Create a new Code node** in your workflow
3. **Paste the code** into the new node
4. **Connect it** after your `008_prompt31Request-http` node

### **Step 2: Update Your HTTP Request Node**

Make sure your HTTP request node has these settings:

```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "retryDelay": 30000,
    "retryOnFail": true
  },
  "timeout": 240000,
  "response": {
    "response": {
      "neverError": true,
      "responseFormat": "json"
    }
  }
}
```

### **Step 3: Test the Integration**

1. **Run your workflow** with the retry handler
2. **Monitor the logs** for retry messages
3. **Check for 529 errors** - they should now be caught and retried

## 🔧 **Current Aggressive Settings**

I've updated all the nodes with aggressive settings to prevent 529 errors:

- **Rate Limiter**: 30-second base delays
- **Pre-Request Delay**: 45-second base delays
- **Retry Handler**: 60-second base retry delays
- **HTTP Request**: 30-second retry delays

## 📊 **Expected Behavior**

### **Normal Operation:**

- 45-75 second delays between requests
- Minimal 529 errors due to aggressive delays

### **When 529 Errors Occur:**

- Automatic detection and retry
- Exponential backoff: 60s → 120s → 240s → 480s → 960s
- Up to 6 retry attempts
- Detailed logging of all retry attempts

## 🚀 **Quick Test**

To test if the retry handler is working:

1. **Add the retry handler** after your HTTP request
2. **Run a single request** that might trigger a 529
3. **Watch the logs** for these messages:
   - `🚨 Retryable error detected: HTTP 529`
   - `✅ Scheduling retry 1/6`
   - `⏰ Retry delay: 60 seconds`

## ⚠️ **Important Notes**

- **The retry handler must be connected** after your HTTP request node
- **Make sure `neverError: true`** is set in your HTTP request
- **Monitor the logs** to see retry attempts
- **Adjust delays** if you still get too many 529 errors

## 🔄 **If You Still Get 529 Errors**

1. **Increase the base delays** in all nodes by 50%
2. **Check if multiple workflows** are running simultaneously
3. **Verify the retry handler** is properly connected
4. **Monitor the logs** for retry attempts

## 📝 **Next Steps**

Once the retry handler is working:

1. **Test with a few requests** to verify it catches 529 errors
2. **Monitor the retry patterns** in the logs
3. **Adjust delays** based on success/failure rates
4. **Consider adding the pre-request delay** for even better prevention

The key is getting the retry handler connected to your workflow so it can catch and handle the 529 errors automatically!
