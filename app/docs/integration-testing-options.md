# Integration Testing with Test Excel File

## Option 1: Dedicated Test Environment

### Setup Test SharePoint Site
1. Create separate SharePoint site: `https://yoursite.sharepoint.com/sites/WebsiteEvaluationTEST`
2. Upload test Excel file: `Website Evaluation TEST.xlsx`
3. Configure test table: `TEST_Table` in worksheet `TEST Survey`

### Test Environment Variables
```bash
# Test-specific configuration
SHAREPOINT_SITE_URL=https://yoursite.sharepoint.com/sites/WebsiteEvaluationTEST
EXCEL_FILE_PATH=/Website Evaluation TEST.xlsx
WORKSHEET_NAME=TEST Survey
TABLE_NAME=TEST_Table

# Same Azure credentials (with test site permissions)
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

### Benefits
- ✅ Real Excel operations
- ✅ Actual SharePoint integration
- ✅ True end-to-end testing
- ✅ Separate from production data

### Drawbacks
- ❌ Requires additional SharePoint setup
- ❌ Tests depend on external service
- ❌ Slower test execution
- ❌ Network connectivity required