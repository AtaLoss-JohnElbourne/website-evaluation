# SharePoint Excel Integration Setup

## 🔐 Azure App Registration Setup

Your Azure app registration has been created with these credentials:
- **App ID**: `36feb769-5050-4f53-9188-582df3da923f`
- **Secret ID**: `78b6963d-4361-4529-b3e0-8a267d933c03`
- **Secret Value**: (You'll receive this via email)

## 📝 Required Configuration

### 1. Update the `.env` file with your actual values:

```env
# Azure App Registration Credentials
AZURE_CLIENT_ID=36feb769-5050-4f53-9188-582df3da923f
AZURE_CLIENT_SECRET=your_secret_value_from_email
AZURE_TENANT_ID=your_tenant_id

# SharePoint Configuration
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/WebsiteEvaluation
EXCEL_FILE_PATH=/Shared Documents/survey_results.xlsx
WORKSHEET_NAME=Sheet1
TABLE_NAME=Table1

# Environment
NODE_ENV=production
PORT=3000

# Security Configuration (Production)
ENABLE_DEBUG_ENDPOINTS=false           # Set to 'true' only for troubleshooting
DEBUG_PASSWORD=your_secure_password    # Required if debug endpoints enabled in production
```

### 2. Information you need to obtain:

**Tenant ID**: 
- Go to Azure Portal → Azure Active Directory → Properties
- Copy the "Tenant ID"

**SharePoint Site URL**:
- Navigate to your "Website Evaluation" SharePoint site
- Copy the full URL (e.g., `https://yourcompany.sharepoint.com/sites/WebsiteEvaluation`)

**Excel File Path**:
- Upload/create your Excel file in the SharePoint site
- Note the path (typically `/Shared Documents/filename.xlsx`)

**Excel Table Configuration**:
- **Worksheet Name**: The Excel sheet containing your table (usually `Sheet1`)
- **Table Name**: The Excel table name (usually `Table1`)
- You can find/change these names in Excel by selecting the table and checking the Table Design tab

### 3. Excel Table Access Methods:

**By Table Name** (Recommended - Current Method):
- Uses human-readable table name: `tables('Table1')`
- Configurable via `TABLE_NAME` environment variable
- Easy to understand and modify
- **Limitation**: Must match exactly (case-sensitive)

**By Table ID** (Alternative):
- Uses unique GUID: `tables('{12345678-1234-1234-1234-123456789012}')`
- More stable (never changes even if table renamed)
- **Limitation**: Hard to determine without inspecting Excel file
- **Not implemented**: Would require code changes

**Current Configuration**: The system uses table names for simplicity and configurability.

## 📊 Excel File Structure

The application will automatically create a table with these columns (**23 total columns**):

| Column | Description | Data Type |
|--------|-------------|-----------|
| Timestamp | When survey was submitted (UTC, displayed as proper date/time) | Date/Time |
| Survey ID | Survey version identifier | Text |
| Submission Stage | Which step completed (1, 2, or 3) | Number |
| Trigger | How survey was triggered (exit, fab, fallback, manual) | Text |
| Page Path | URL path where survey appeared | Text |
| Rating Selected | User's helpfulness rating (very, helpful, etc.) | Text |
| Rating Label | Text label for rating | Text |
| Stars | Number of stars (1-5) | Number |
| Audience | Who they're searching for | Text |
| Heard Where | How they found the site | Text |
| Intent | What they were trying to do | Text |
| Age Group | Demographics | Text |
| Gender | Demographics | Text |
| Ethnicity | Demographics | Text |
| Barriers | What got in the way (for low ratings) | Text |
| Comments | Free text feedback | Text |
| User Agent | Browser information | Text |
| Is Resubmission | If user submitted before | Boolean |
| Resubmission Count | How many times submitted | Number |
| Exited Early | If they closed without completing | Boolean |
| User Fingerprint | Unique browser identifier for linking visits | Text |
| Session ID | Session identifier for this visit | Text |

**Important Notes**:
- **Timestamp**: Stored in UTC, formatted as "YYYY-MM-DD HH:MM:SS" for Excel compatibility
- **User Fingerprint**: Links resubmissions from the same browser across time
- **Session ID**: Groups submissions within the same browser session
- **Resubmission Tracking**: Automatically detects and counts repeat users

## 🚀 Deployment Steps

1. **Install dependencies**:
   ```bash
   cd app
   npm install
   ```

2. **Test SharePoint connection**:
   ```bash
   npm start
   curl http://localhost:3000/api/test-sharepoint
   ```

3. **Deploy to your Linux server** (same as your other Node apps)

## 🔍 API Endpoints

### Core Survey API
- `POST /api/survey` - Submit survey data to SharePoint (with queue management)
- `GET /api/health` - Health check endpoint
- `GET /api/queue-status` - Monitor survey submission queue

### Testing & Debugging  
- `GET /api/debug-excel` - Test Excel file access and table operations
- `GET /api/debug-permissions` - Security audit of Azure app permissions
- `GET /api/debug-sharepoint-scope` - Test SharePoint-specific access

### Survey Features
- **Queue Management**: Sequential processing prevents Excel concurrency conflicts
- **Resubmission Tracking**: Automatic detection via user fingerprinting
- **Session Management**: Links multiple submissions within browser session
- **Exit Intent Detection**: Triggers survey on mouse exit or 45s/90s fallback
- **Mobile Optimized**: 45s fallback for mobile, 90s for desktop
- **Frequency Control**: 7-day TTL prevents survey spam

## 🛠️ Troubleshooting

**Common Issues**:

1. **Authentication Errors**: Verify tenant ID and client secret
2. **Permission Errors**: Ensure app has `Sites.Selected` and `Files.ReadWrite.All` permissions
3. **File Not Found**: Check EXCEL_FILE_PATH and ensure file exists
4. **Table Errors**: App will auto-create "Table1" if it doesn't exist
5. **Queue Issues**: Check `/api/queue-status` for processing status
6. **Timestamp Issues**: Ensure Excel column is formatted as Date/Time

**Security Testing**:
- Use `/api/debug-permissions` to verify proper scope restriction
- Should show access only to WebsiteEvaluation site, not all SharePoint sites
- Verify `Sites.Selected` permission model is working

**Performance Monitoring**:
- Queue system handles up to 12,000+ users/month safely
- Monitor queue status during high traffic periods
- Excel operations are the main performance bottleneck (~1-2 seconds per write)

**Excel Column Setup**:
- Must have exactly **23 columns** in correct order
- Timestamp column should be formatted as Date/Time for proper filtering
- Use `/api/debug-excel` to test table structure

**Testing**:
- Use the `/api/test-sharepoint` endpoint to verify connection
- Check console logs for detailed error messages
- Verify Excel file permissions in SharePoint

## 🔒 Security Notes

- Never commit the `.env` file to version control
- Client secret should be stored securely
- Consider using Azure Key Vault for production secrets
- Regularly rotate client secrets

## 📈 Data Flow & Architecture

### Survey Triggering
1. **Site Engagement Timer**: Tracks total time across all pages (10s minimum)
2. **Exit Intent Detection**: Mouse movement to top of browser (desktop)
3. **Fallback Timers**: 45s mobile, 90s desktop if no exit intent
4. **Manual Feedback**: Always-available button bypasses all restrictions

### Data Processing
1. User triggers exit survey on website
2. Survey data sent to `/survey-api/api/survey` via nginx
3. **Queue System**: Sequential processing prevents Excel conflicts
4. Node.js app authenticates with Azure AD
5. Data written to SharePoint Excel via Microsoft Graph API
6. **Timestamp Conversion**: UTC to "YYYY-MM-DD HH:MM:SS" format for Excel
7. Success response sent back to frontend

### Anti-Spam Protection
- **Session Protection**: Only once per browser tab session
- **TTL Protection**: 7-day cooldown on automatic triggers
- **Manual Override**: Feedback button always works (marked as resubmission)
- **User Fingerprinting**: Tracks repeat users across visits for analysis

### Concurrency Management
- **Queue System**: Handles high traffic (12,000+ users/month tested)
- **Sequential Processing**: Prevents Excel file conflicts
- **Monitoring**: Queue status endpoint for debugging
- **Error Recovery**: Failed submissions retry automatically

## 🔒 Production Security

### Debug Endpoints Protection
The system includes debug endpoints for troubleshooting, but these are automatically protected in production:

**Automatically Disabled in Production** (`NODE_ENV=production`):
- `/api/debug-config` - Configuration details
- `/api/debug-excel` - Excel file testing
- `/api/debug-permissions` - Permission auditing
- `/api/debug-sites` - SharePoint site listing
- `/api/debug-workbook` - Workbook session testing
- `/api/debug-graph` - Graph API testing
- `/api/debug-root` - Root site access
- `/api/debug-sharepoint-scope` - SharePoint scope testing

**Always Available** (needed for operations):
- `/api/health` - Health check (load balancers)
- `/api/queue-status` - Queue monitoring (operations)
- `/api/survey` - Main survey endpoint

### Emergency Debug Access
If troubleshooting is needed in production:

1. **Enable debug endpoints**:
   ```env
   ENABLE_DEBUG_ENDPOINTS=true
   DEBUG_PASSWORD=your_secure_random_password
   ```

2. **Access with authentication**:
   ```bash
   curl -H "Authorization: Bearer your_secure_random_password" \
        https://yourdomain.com/survey-api/api/debug-permissions
   ```

3. **Disable immediately after troubleshooting**:
   ```env
   ENABLE_DEBUG_ENDPOINTS=false
   ```

**Security Notes**:
- Debug endpoints return 404 when disabled (no information disclosure)
- Authentication required when enabled in production
- All debug access should be logged and monitored
- Only enable for specific troubleshooting, then disable immediately