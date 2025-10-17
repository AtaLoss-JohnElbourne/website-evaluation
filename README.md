# Website Exit Intent Survey System

A sophisticated Node.js application that intelligently detects when users are about to leave your website and presents them with a multi-step survey. Survey responses are automatically saved to SharePoint Excel with advanced resubmission tracking, queue management, and comprehensive analytics.

## 🚀 Key Features

- 🎯 **Smart Exit Intent Detection**: Multi-trigger system (exit-intent, fallback timers, manual)
- 📊 **Multi-Step Survey Flow**: Progressive 3-step survey with conditional logic
- 🔗 **Resubmission Tracking**: Links related submissions via advanced user fingerprinting
- 📈 **SharePoint Integration**: Direct Excel file updates via Microsoft Graph API
- ⚡ **Queue Management**: High-traffic concurrency protection (12,000+ users/month tested)
- 📱 **Device-Optimized**: Different behaviors for mobile vs desktop
- 🔒 **Enterprise Security**: Azure AD authentication with restricted permissions
- 🌍 **Timezone Aware**: Proper date/time handling with automatic DST support
- 🕐 **Frequency Control**: 7-day TTL prevents survey spam
- 📋 **Session Management**: Site-wide engagement tracking across pages

## 📁 Project Structure

```
website-evaluation/
├── app/                           # Node.js backend
│   ├── package.json              # Dependencies and scripts
│   ├── server.js                 # Express server with queue management
│   ├── docker-compose.yml        # Docker deployment config
│   ├── Dockerfile                # Container configuration
│   └── .env                      # Environment variables (not committed)
├── web/                          # Frontend assets
│   ├── exit-intent-survey.js     # Advanced survey library
│   └── Dockerfile               # Static file server container
├── SHAREPOINT_SETUP.md          # Azure/SharePoint configuration guide
├── RESUBMISSION_LINKING.md      # Analytics and linking documentation
├── NGINX_CONFIG.md              # Reverse proxy setup
└── DOCKER_DEPLOYMENT.md         # Container deployment guide
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose (for deployment)
- Azure AD app registration (see SHAREPOINT_SETUP.md)
- SharePoint site with Excel file access

### 2. Environment Setup

Create `.env` file in `/app` directory:
```env
# Azure App Registration
AZURE_CLIENT_ID=your_app_id
AZURE_CLIENT_SECRET=your_app_secret
AZURE_TENANT_ID=your_tenant_id

# SharePoint Configuration
SHAREPOINT_SITE_URL=https://yourcompany.sharepoint.com/sites/WebsiteEvaluation
EXCEL_FILE_PATH=/Shared Documents/survey_results.xlsx
WORKSHEET_NAME=Sheet1

# Server Configuration
NODE_ENV=production
PORT=3000
```

### 3. Install Dependencies

```bash
cd app
npm install
```

### 4. Test SharePoint Connection

```bash
npm start
curl http://localhost:3000/api/debug-permissions
```

### 5. Deploy with Docker

```bash
docker-compose up -d
```

### 6. Integration

Add to your website:
```html
<script src="https://your-domain.com/survey-api/exit-intent-survey.js"></script>
```

## 🎯 Survey Trigger System

### Intelligent Multi-Trigger Detection

1. **Site Engagement Timer**
   - Tracks total time across ALL pages (not per-page)
   - 10-second minimum before survey can trigger
   - Persists across navigation within session

2. **Exit Intent Detection** (Desktop)
   - Mouse movement to top 12px of browser
   - Primary trigger for desktop users
   - Immediate response when detected

3. **Fallback Timers** (Device-Specific)
   - **Mobile devices**: 45 seconds (no mouse events)
   - **Desktop devices**: 90 seconds (backup to exit-intent)
   - Ensures coverage across all device types

4. **Manual Feedback Button**
   - Always-available green "Feedback" button
   - Bypasses all restrictions and timers
   - Marked as resubmission if user already responded

### Frequency Control

- **Session Protection**: Only once per browser tab session
- **TTL Protection**: 7-day cooldown on automatic triggers
- **Manual Override**: Feedback button always works
- **Resubmission Tracking**: Automatic detection and linking

## 📊 Multi-Step Survey Flow

### Step 1: Initial Rating
- "How helpful was your visit today?"
- 5-point scale with star ratings
- Instant visual feedback

### Step 2: Audience & Intent
- Who are you searching for?
- How did you hear about us?
- What were you trying to do?

### Step 3: Demographics & Barriers
- Age group and demographics
- Barriers (for ratings < 4 stars)
- Open-text feedback

### Exit Tracking
- Detects early abandonment at any stage
- Records partial completions
- Links to user fingerprint for analysis

## 🔗 Advanced Resubmission Tracking

### User Fingerprinting Technology
- **Canvas Rendering**: Hardware-specific graphics fingerprint
- **WebGL Information**: Graphics card and driver details
- **Audio Context**: Hardware audio fingerprinting
- **Browser Characteristics**: Screen, platform, language settings
- **Consistent Hashing**: Same browser = same fingerprint

### Linking Capabilities
- **Cross-Visit Tracking**: Links users across multiple visits
- **Session Continuity**: Maintains session across page navigation
- **Resubmission Detection**: Automatic identification of repeat users
- **Privacy-Friendly**: No PII stored, GDPR compliant

### Analytics Insights
- Track user journey improvements over time
- Identify users who change ratings
- Analyze completion patterns across stages
- Monitor exit behaviors and triggers

## 📈 SharePoint Excel Integration

### Automatic Data Storage
- **23 columns** of comprehensive survey data
- **Real-time updates** via Microsoft Graph API
- **Proper date/time formatting** for Excel analysis
- **Queue management** prevents concurrency conflicts

### Key Data Fields
| Field | Description |
|-------|-------------|
| Timestamp | UTC timestamp, Excel date/time format |
| User Fingerprint | Unique browser identifier |
| Session ID | Browser session identifier |
| Submission Stage | Which step completed (1-3) |
| Trigger | How survey was activated |
| Is Resubmission | Boolean flag for repeat users |
| Resubmission Count | Number of previous submissions |
| Stars | Rating value (1-5) |
| Barriers | What prevented success (low ratings) |
| Comments | Free-text feedback |

### Enterprise Features
- **Azure AD Authentication**: Secure API access
- **Sites.Selected Permissions**: Restricted access scope
- **Audit Endpoints**: Security and permission verification
- **Queue Monitoring**: Real-time processing status

## 🔧 API Endpoints

### Core Survey API
- **POST** `/api/survey` - Submit survey data (with queue management)
- **GET** `/api/health` - Health check and service status
- **GET** `/api/queue-status` - Monitor submission queue

### Testing & Debugging
- **GET** `/api/debug-excel` - Test Excel file access and operations
- **GET** `/api/debug-permissions` - Security audit of Azure permissions
- **GET** `/api/debug-sharepoint-scope` - SharePoint access verification

### Survey Submission Format

**Request Body:**
```json
{
  "surveyId": "exit-survey-v2",
  "submissionStage": 3,
  "trigger": "exit",
  "path": "/contact",
  "timestamp": "2025-10-15T18:20:41.187Z",
  "selected": "helpful", 
  "label": "Helpful",
  "stars": 4,
  "audience": "Family member",
  "heardWhere": "Google search",
  "intent": "Find contact information",
  "ageGroup": "25-34",
  "gender": "Prefer not to say",
  "ethnicity": "White British",
  "barriers": "",
  "comments": "Easy to find what I needed",
  "ua": "Mozilla/5.0...",
  "resubmission": false,
  "resubmissionCount": 0,
  "userFingerprint": "kc7kwogtpf",
  "sessionId": "session_1760546553404_24ty1oba"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Survey data queued for processing",
  "requestId": "7i3x29gz4"
}
```
        }
    ]
});
```

## API Endpoints

### POST /api/survey
Submit survey response data.

**Request Body:**
```json
{
    "reason": "Found what I was looking for",
    "rating": "4",
    "feedback": "Great website!",
    "page_url": "https://example.com/page",
    "page_title": "Example Page",
    "user_agent": "Mozilla/5.0...",
    "time_on_page": 15000,
    "timestamp": "2025-10-12T10:30:00.000Z"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Survey data saved successfully"
}
```

### GET /api/health
Check API status.

**Response:**
```json
{
    "status": "OK",
    "timestamp": "2025-10-12T10:30:00.000Z",
    "service": "Website Exit Survey API"
}
```

## ⚡ Performance & Scalability

### Queue Management System
- **Sequential Processing**: Prevents Excel file conflicts
- **High Traffic Support**: Tested with 12,000+ users/month
- **Automatic Retry**: Failed submissions retry automatically
- **Monitor Endpoint**: Real-time queue status via `/api/queue-status`

### Optimization Features
- **Async Processing**: Non-blocking survey submissions
- **Minimal Payload**: Efficient data transmission
- **CDN Ready**: Static assets can be cached
- **Docker Deployment**: Containerized for easy scaling

## 🛠️ Development & Testing

### Local Development
```bash
cd app
npm run dev  # Auto-restart on changes
```

### Testing Survey Triggers
```javascript
// Browser console commands:
ExitSurvey.open()           // Manually trigger survey
ExitSurvey.resetSession()   // Reset all tracking
localStorage.clear()        // Clear fingerprint history
```

### Debug Information
- Enable debug mode: Set `CONFIG.debug = true` in survey script
- Monitor server logs for queue processing
- Check `/api/queue-status` for submission status
- Use `/api/debug-permissions` for security verification

## 🔒 Security & Privacy

### Security Features
- **Azure AD Authentication**: Enterprise-grade security
- **Restricted Permissions**: `Sites.Selected` scope only
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Server-side data validation
- **CORS Protection**: Configurable origin restrictions

### Privacy Protection
- **Anonymous Fingerprinting**: No PII collected
- **GDPR Compliant**: Pseudonymous data only
- **User Control**: Clear browser data resets tracking
- **Transparent**: Open source and auditable

## 📚 Documentation

- **[SHAREPOINT_SETUP.md](SHAREPOINT_SETUP.md)** - Azure and SharePoint configuration
- **[RESUBMISSION_LINKING.md](RESUBMISSION_LINKING.md)** - Analytics and data linking guide
- **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** - Container deployment guide
- **[NGINX_CONFIG.md](NGINX_CONFIG.md)** - Reverse proxy configuration

## 🚀 Deployment

### Docker Deployment (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
1. Configure Azure AD app registration
2. Set up SharePoint Excel file (23 columns)
3. Deploy Node.js application
4. Configure nginx reverse proxy
5. Add survey script to website

### Environment Requirements
- Node.js 18+
- Docker & Docker Compose
- Azure AD app with SharePoint access
- SharePoint site with Excel file

## 📊 Analytics & Insights

### Built-in Analytics
- **Resubmission Tracking**: Link user journeys over time
- **Completion Analysis**: Multi-stage drop-off rates
- **Trigger Effectiveness**: Compare exit vs. manual triggers
- **Device Patterns**: Mobile vs. desktop behavior
- **Time-based Trends**: Excel date/time analysis

### Excel Integration
- **Proper Date/Time**: Excel-compatible timestamp formatting
- **Filterable Data**: Date ranges, ratings, demographics
- **Pivot Tables**: Ready for advanced analysis
- **Chart Creation**: Visual trend analysis

## 🆘 Support & Troubleshooting

### Common Issues
1. **Permissions**: Use `/api/debug-permissions` to verify access
2. **Queue Issues**: Check `/api/queue-status` for processing status
3. **Excel Errors**: Ensure 23-column table structure
4. **Timestamp Issues**: Verify Excel date/time formatting

### Performance Monitoring
- Monitor queue processing times
- Check server logs for errors
- Verify Excel write operations
- Test during high traffic periods

## 📜 License

MIT License - Open source and freely usable for commercial projects.

---

**Built for enterprise-scale website evaluation with comprehensive analytics and resubmission tracking.**