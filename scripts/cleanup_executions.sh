#!/bin/bash

# n8n Execution Cleanup Script
# This script provides easy options for cleaning up old n8n executions

echo "🧹 n8n Execution Cleanup"
echo "========================"
echo ""
echo "Choose your cleanup option:"
echo ""
echo "1. Conservative cleanup (keep 7 days of executions)"
echo "2. Moderate cleanup (keep 24 hours of executions)" 
echo "3. Aggressive cleanup (keep 6 hours of executions)"
echo "4. Custom cleanup"
echo "5. Dry run only (see what would be deleted)"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🔄 Running conservative cleanup (7 days)..."
        node scripts/cleanup_old_executions.js --keep-days=7
        ;;
    2)
        echo "🔄 Running moderate cleanup (24 hours)..."
        node scripts/cleanup_old_executions_aggressive.js --keep-hours=24
        ;;
    3)
        echo "🔄 Running aggressive cleanup (6 hours)..."
        node scripts/cleanup_old_executions_aggressive.js --keep-hours=6
        ;;
    4)
        read -p "Enter number of hours to keep: " hours
        echo "🔄 Running custom cleanup (${hours} hours)..."
        node scripts/cleanup_old_executions_aggressive.js --keep-hours=$hours
        ;;
    5)
        echo "🔍 Running dry run (24 hours)..."
        node scripts/cleanup_old_executions_aggressive.js --dry-run --keep-hours=24
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Cleanup script completed!"
