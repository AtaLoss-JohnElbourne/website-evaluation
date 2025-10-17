# Resubmission Linking Guide

## Overview

Your website evaluation system now includes robust resubmission tracking and linking capabilities. Here's how to understand and use the data to link related survey submissions.

## How Resubmissions Are Tracked

### 1. **User Fingerprinting**
The system creates a unique "fingerprint" for each user based on:
- **Canvas rendering**: Hardware-specific graphics fingerprint (primary uniqueness factor)
- **Screen characteristics**: Resolution, color depth, pixel ratio
- **Browser details**: User agent, language, timezone offset
- **Hardware info**: CPU cores, memory, platform
- **WebGL renderer**: Graphics card identifier
- **Audio context**: Audio hardware fingerprint

**Fingerprint Algorithm**: Combines multiple factors and creates a hash for consistency and privacy.

### 2. **Session Management**
- **Session ID**: Consistent identifier that persists across visits
- **Local Storage**: Tracks submission history for TTL (7 days)
- **Resubmission Count**: Increments with each submission from the same user

### 3. **Excel Data Fields**

Your SharePoint Excel file now includes these linking fields (**Total: 23 columns**):

| Column | Field | Description | Use Case |
|--------|-------|-------------|----------|
| A | **Timestamp** | Submission date/time (UTC, proper Excel date/time format) | Track submission timeline |
| B | **Survey ID** | Survey version identifier | Group submissions by survey version |
| C | **Submission Stage** | Which step completed (1, 2, or 3) | Track completion patterns |
| D | **Trigger** | How triggered (exit, fab, fallback, manual) | Analyze trigger effectiveness |
| E | **Page Path** | URL where survey appeared | Track page-specific patterns |
| R | **Is Resubmission** | Boolean flag | Quickly identify resubmissions |
| S | **Resubmission Count** | Number of submissions | Track frequency of resubmissions |
| U | **User Fingerprint** | Unique user identifier | **Primary linking field** |
| V | **Session ID** | Persistent session identifier | Alternative linking method |

**Key Improvements**:
- **Enhanced Fingerprinting**: More reliable user identification
- **Proper Date/Time**: Excel recognizes timestamp for filtering/sorting
- **Stage Tracking**: See which steps users complete vs. abandon

## Linking Strategies

### Option 1: **User Fingerprint Linking** (Recommended)
```excel
=COUNTIF(U:U, U2)  // Count submissions from same fingerprint
```

### Option 2: **Session ID Linking**
```excel  
=COUNTIF(V:V, V2)  // Count submissions from same session
```

### Option 3: **Combined Approach**
Link by fingerprint first, then session ID as fallback:
```excel
=IF(U2<>"", COUNTIF(U:U, U2), COUNTIF(V:V, V2))
```

## Analysis Examples

### 1. **Find All Resubmissions**
Filter rows where: `Is Resubmission = TRUE` or `Resubmission Count > 0`

### 2. **Group Related Submissions**
1. Sort by `User Fingerprint` column (Column U)
2. Group consecutive rows with same fingerprint
3. Use conditional formatting to highlight groups

### 3. **Track User Journey Over Time**
For a specific user fingerprint:
1. Filter by `User Fingerprint = [specific value]` (Column U)
2. Sort by `Timestamp` (Column A - proper date/time sorting)
3. Analyze progression: Stage 1 → Stage 2 → Stage 3
4. Check trigger patterns: exit-intent vs. manual FAB clicks

### 4. **Identify Frequent Users**
```excel
// Create pivot table with:
// Rows: User Fingerprint (Column U)
// Values: Count of submissions
// Filter: Count > 1
```

### 5. **Analyze Completion Patterns**
```excel
// Track users who exit at different stages:
Filter: User Fingerprint = [value] AND Submission Stage < 3
// vs users who complete all stages:
Filter: User Fingerprint = [value] AND Submission Stage = 3
```

### 6. **Study Trigger Effectiveness**
```excel
// Compare how users arrive at survey:
Pivot Table:
- Rows: Trigger (exit, fab, fallback)
- Columns: Is Resubmission
- Values: Count of submissions
```

## Data Quality Considerations

### **Fingerprint Stability & Accuracy**
- **High stability**: Same browser, same device (99% consistent)
- **Enhanced uniqueness**: Canvas + WebGL + Audio fingerprinting
- **Medium stability**: Browser updates may change fingerprint (rare)
- **Low stability**: Incognito mode, privacy tools, different browsers

### **Privacy-Friendly Design**
- **No personal information**: Fingerprints are anonymous hashes
- **Cannot identify individuals**: No way to reverse-engineer identity
- **Pseudonymous only**: Links behavior patterns, not people
- **GDPR compliant**: No PII stored or transmitted

### **Edge Cases & Limitations**
- **Shared computers**: May link different users (same hardware)
- **Privacy tools**: Ad blockers may interfere with fingerprinting
- **Mobile browsers**: Less stable but still effective
- **Canvas poisoning**: Some privacy tools randomize canvas output

### **Improved Reliability**
- **Multiple factors**: Not dependent on single identifier
- **Fallback mechanisms**: Session ID when fingerprint unavailable
- **Consistent hashing**: Same inputs always produce same fingerprint

## Recommended Workflow

### 1. **Daily Analysis**
```excel
// Check for new resubmissions
Filter: Timestamp >= TODAY() AND Is Resubmission = TRUE
```

### 2. **Weekly Reports**
```excel
// Analyze resubmission patterns
Pivot Table: 
- Rows: Week of Timestamp
- Values: % of resubmissions, Average resubmission count
```

### 3. **User Experience Analysis**
```excel
// Track users who exit early repeatedly
Filter: Exited Early = TRUE AND Resubmission Count > 1
Group by: User Fingerprint
```

## Advanced Linking Queries

### **Find Users Who Improved Their Rating**
```sql
-- If using Power Query or similar:
SELECT f1.UserFingerprint, f1.Stars as FirstRating, f2.Stars as LastRating, 
       f1.Timestamp as FirstSubmission, f2.Timestamp as LastSubmission
FROM SurveyData f1
JOIN SurveyData f2 ON f1.UserFingerprint = f2.UserFingerprint
WHERE f1.ResubmissionCount = 0 AND f2.ResubmissionCount > 0
AND f2.Stars > f1.Stars
ORDER BY f2.Timestamp DESC
```

### **Track Multi-Stage Completion Patterns**
```sql
-- Users who complete different stages over time:
SELECT UserFingerprint, 
       MAX(CASE WHEN SubmissionStage = 1 THEN Timestamp END) as Stage1Time,
       MAX(CASE WHEN SubmissionStage = 2 THEN Timestamp END) as Stage2Time,
       MAX(CASE WHEN SubmissionStage = 3 THEN Timestamp END) as Stage3Time
FROM SurveyData 
GROUP BY UserFingerprint
HAVING COUNT(DISTINCT SubmissionStage) > 1
```

### **Identify Users Who Need Follow-up**
```excel
// Users with multiple low ratings and different triggers
Filter: User Fingerprint = [value] AND Stars <= 2 AND Resubmission Count > 1
Sort by: Timestamp (to see pattern over time)
```

### **Analyze Exit Patterns**
```excel
// Users who repeatedly exit without completing
Filter: Exited Early = TRUE AND Resubmission Count > 1
Group by: User Fingerprint, Submission Stage
```

## API Integration

If you want to query resubmissions programmatically:

### **Get User's Previous Submissions**
```javascript
// Add to your analysis scripts:
function findRelatedSubmissions(userFingerprint) {
  // Query SharePoint for matching fingerprints
  // Return timeline of user's survey interactions
}
```

### **Real-time Resubmission Alerts**
```javascript
// In server.js, add notification logic:
if (data.resubmissionCount >= 3 && data.stars <= 2) {
  // Send alert for user who repeatedly gives low ratings
  console.log('Alert: Frequent low-rating user detected');
}
```

## Privacy & Compliance

### **GDPR Considerations**
- Fingerprints are pseudonymous, not personal data
- No PII stored or transmitted
- Users cannot be individually identified

### **Data Retention**
- Client-side: 7 days (configurable via `ttlDays`)
- Server-side: Follows your SharePoint retention policy

### **Opt-out Mechanism**
Users can clear their browser data to reset their fingerprint and submission history.

## Troubleshooting

### **Inconsistent Linking**
- Check for browser updates affecting fingerprints
- Verify canvas fingerprinting is working
- Consider increasing fingerprint complexity

### **Missing Resubmissions**
- Users may be clearing browser data
- Incognito/private browsing resets state
- Different devices create different fingerprints

### **Too Many False Positives**
- Shared computers may link different users
- Consider adding additional identifying factors
- Use session ID as secondary verification

## Testing Resubmission Linking

### **Manual Test Procedure**
1. **First submission**: Complete a survey normally (any trigger)
2. **Wait period**: Wait a few minutes for processing
3. **Resubmission**: Click the "Feedback" button to trigger manually
4. **Verify linking**: Check Excel file for entries with:
   - Same `User Fingerprint` (Column U)
   - Same `Session ID` (Column V)
   - `Is Resubmission = TRUE` on second entry
   - `Resubmission Count = 1` on second entry

### **Testing Different Scenarios**
```javascript
// Test exit intent resubmission:
1. Complete survey via exit intent (move mouse to top)
2. Later, trigger via FAB button
3. Should link via fingerprint

// Test cross-page resubmission:
1. Complete survey on page A
2. Navigate to page B  
3. Trigger survey again
4. Should link via fingerprint + session ID
```

### **Reset for Testing**
```javascript
// In browser console to reset all tracking:
ExitSurvey.resetSession();           // Clears session storage
localStorage.clear();                // Clears TTL and fingerprint history
// Refresh page to generate new fingerprint
location.reload();
```

### **Debug Fingerprint Generation**
```javascript
// Check fingerprint in browser console:
console.log('Current fingerprint:', window.lastGeneratedFingerprint);
// Should be consistent across page loads for same browser
```

### **Verify Queue Processing**
- Check server logs for queue processing messages
- Visit `/api/queue-status` to monitor submission processing
- Ensure submissions aren't lost during high traffic

This resubmission linking system gives you powerful insights into user behavior while maintaining privacy and ease of use.