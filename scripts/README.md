# n8n Execution Cleanup Scripts

This directory contains scripts to safely clean up old n8n executions while preserving important data.

## 🚀 Quick Start

### Option 1: Interactive Script (Recommended)

```bash
./scripts/cleanup_executions.sh
```

This will give you a menu to choose your cleanup level.

### Option 2: Direct Commands

**Conservative cleanup (keep 7 days):**

```bash
node scripts/cleanup_old_executions.js --keep-days=7
```

**Moderate cleanup (keep 24 hours):**

```bash
node scripts/cleanup_old_executions_aggressive.js --keep-hours=24
```

**Aggressive cleanup (keep 6 hours):**

```bash
node scripts/cleanup_old_executions_aggressive.js --keep-hours=6
```

## 📋 What Gets Preserved

All cleanup scripts will **ALWAYS** preserve:

- ✅ **Most recent execution** for each workflow
- ✅ **Currently running executions** (status: running, new)
- ✅ **Recent failed executions** (last 2-24 hours for debugging)
- ✅ **Recent successful executions** (within your chosen timeframe)

## 🛡️ Safety Features

### Dry Run Mode

Always test first with `--dry-run`:

```bash
node scripts/cleanup_old_executions_aggressive.js --dry-run --keep-hours=24
```

This shows you exactly what would be deleted without making any changes.

### Database Backup

The scripts work directly with your n8n database at `~/.n8n/database.sqlite`.

**⚠️ Important:** Always backup your database before running cleanup:

```bash
cp ~/.n8n/database.sqlite ~/.n8n/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)
```

## 📊 Script Options

### Conservative Script (`cleanup_old_executions.js`)

- **Purpose:** Safe cleanup for production environments
- **Default:** Keeps 7 days of executions
- **Best for:** Production systems where you want to keep more history

### Aggressive Script (`cleanup_old_executions_aggressive.js`)

- **Purpose:** More aggressive cleanup for development/testing
- **Default:** Keeps 24 hours of executions
- **Best for:** Development environments with lots of test runs

## 🔧 Customization

### Keep Different Time Periods

**Keep 3 days:**

```bash
node scripts/cleanup_old_executions.js --keep-days=3
```

**Keep 12 hours:**

```bash
node scripts/cleanup_old_executions_aggressive.js --keep-hours=12
```

**Keep 1 hour (very aggressive):**

```bash
node scripts/cleanup_old_executions_aggressive.js --keep-hours=1
```

## 📈 Expected Results

Based on your current setup (194 executions), here's what you can expect:

### Conservative (7 days)

- **Keeps:** ~194 executions (all recent)
- **Deletes:** 0 executions
- **Database size:** No change

### Moderate (24 hours)

- **Keeps:** ~62 executions
- **Deletes:** ~132 executions
- **Database size:** Significant reduction

### Aggressive (6 hours)

- **Keeps:** ~20-30 executions
- **Deletes:** ~160+ executions
- **Database size:** Major reduction

## 🚨 Troubleshooting

### "Cannot find module 'sqlite3'"

```bash
cd /Users/jfrites/Repos/competitive-echo-n8n
npm install sqlite3
```

### "Database not found"

Make sure n8n has been run at least once to create the database.

### "Permission denied"

```bash
chmod +x scripts/*.sh
chmod +x scripts/*.js
```

## 🔄 Automation

### Add to Cron (Daily Cleanup)

```bash
# Add to crontab for daily cleanup at 2 AM
0 2 * * * cd /Users/jfrites/Repos/competitive-echo-n8n && node scripts/cleanup_old_executions_aggressive.js --keep-hours=24
```

### n8n Environment Variables

You can also configure n8n to automatically prune executions:

```bash
export EXECUTIONS_DATA_PRUNE=true
export EXECUTIONS_DATA_MAX_AGE=168  # 7 days in hours
export EXECUTIONS_DATA_PRUNE_MAX_COUNT=100
```

## 📝 Logs

The scripts provide detailed output showing:

- Total executions found
- Executions to keep (with reasons)
- Executions to delete (with ages)
- Final summary

## ⚠️ Important Notes

1. **Always backup your database first**
2. **Test with --dry-run before running live**
3. **Stop n8n before running cleanup** (recommended)
4. **The cleanup is irreversible**
5. **Keep at least 1 execution per workflow**

## 🆘 Need Help?

If you encounter issues:

1. Check the database path: `~/.n8n/database.sqlite`
2. Verify n8n is not running during cleanup
3. Try the dry-run mode first
4. Check file permissions on the scripts
