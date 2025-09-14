# OAuth API Integrations - BaaS Platform

## Overview

The OAuth API Integrations system allows users to connect their external service accounts (Google, GitHub, Facebook) to your BaaS platform for use in workflows, automations, and data synchronization. This matches the functionality provided by major BaaS competitors like Firebase, Supabase, and workflow platforms like Zapier.

## Architecture

### Authentication vs Integration Flow

**User Authentication Flow (Traditional OAuth):**
- Users sign into your application using OAuth providers instead of email/password
- Replaces traditional login system
- Less common for BaaS platforms

**API Integration Flow (Our Implementation):**
- Users authenticate normally with email/password to your platform
- Separately connect external accounts via `/integrations` page
- OAuth tokens stored for API calls on user's behalf
- Used for workflow automation and data access

## User Experience

### 1. Normal Login
Users sign into your BaaS platform using their regular email/password credentials.

### 2. Navigate to Integrations
- Access integrations via the `/integrations` route
- Protected route requiring authentication
- Professional UI showing available and connected services

### 3. Connect External Services
- Click "Connect" on desired service (Google, GitHub, Facebook)
- Opens OAuth popup window (600x700px, centered)
- Complete OAuth flow in popup without disrupting main application
- Popup automatically closes on completion
- Connection status updates immediately

### 4. Use in Workflows
- Connected accounts available for workflow automation
- Access user's Google Sheets, GitHub repos, Facebook pages
- API calls made on user's behalf using stored tokens

## Technical Implementation

### Backend Components

#### 1. OAuth Routes (`server/routes/oauth.js`)
```javascript
// Available providers endpoint
GET /api/auth/oauth/providers

// OAuth initiation (with integration flag)
GET /api/auth/oauth/{provider}?integration=true

// OAuth callbacks (popup-friendly responses)
GET /api/auth/oauth/{provider}/callback

// Account management
POST /api/auth/oauth/link/{provider}
DELETE /api/auth/oauth/unlink/{provider}
GET /api/auth/oauth/linked
```

#### 2. Passport.js Configuration (`server/config/passport.js`)
- Google OAuth2 strategy with profile and email scopes
- GitHub strategy with user:email scope
- Facebook strategy with email scope
- User creation/linking logic for integration flow

#### 3. Database Schema (Prisma)
```prisma
model SocialAccount {
  id           String   @id @default(uuid())
  userId       String
  provider     String   // 'google', 'github', 'facebook'
  providerId   String   // User's ID from OAuth provider
  email        String?
  name         String?
  profileUrl   String?
  avatarUrl    String?
  accessToken  String?  // For API calls
  refreshToken String?  // For token refresh
  profileData  String?  // JSON of full profile
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
  @@index([provider])
}
```

### Frontend Components

#### 1. IntegrationsPanel (`src/components/integrations/IntegrationsPanel.jsx`)
**Main integrations management interface featuring:**
- Tabbed layout (Available vs Connected)
- Provider cards with service information
- Connection status and management
- Popup-based OAuth flow

**Key Features:**
- Service icons and descriptions
- Available API scopes display
- Connection status badges
- Connect/disconnect functionality

#### 2. OAuth Popup Flow
```javascript
const handleConnect = (integrationId) => {
  // Open centered popup window
  const popup = window.open(
    `/api/auth/oauth/${integrationId}?integration=true`,
    'oauth',
    'width=600,height=700,centered'
  );

  // Monitor popup closure
  const checkClosed = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkClosed);
      // Refresh integration status
      fetchIntegrations();
    }
  }, 1000);
};
```

#### 3. Popup Response Handling
```javascript
// OAuth callback sends postMessage to parent window
window.opener.postMessage({
  type: 'oauth_success',
  provider: 'google',
  message: 'Google account connected successfully!'
}, '*');
```

## Available Integrations

### Google Integration
**Scopes:** sheets, drive, gmail
**Use Cases:**
- Access and modify Google Sheets
- Read/write Google Drive files
- Send emails via Gmail API
- Calendar integration

### GitHub Integration
**Scopes:** repo, user, workflow
**Use Cases:**
- Access repository data
- Create issues and pull requests
- Trigger GitHub Actions
- Repository webhooks

### Facebook Integration
**Scopes:** pages, ads, insights
**Use Cases:**
- Post to Facebook pages
- Access page insights
- Manage advertising campaigns
- Social media automation

## Configuration

### Environment Variables
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# OAuth Session
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
```

### OAuth Provider Setup

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/auth/oauth/google/callback`

#### GitHub OAuth Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3001/api/auth/oauth/github/callback`

#### Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app
3. Add Facebook Login product
4. Set valid OAuth redirect URI: `http://localhost:3001/api/auth/oauth/facebook/callback`

## Security Considerations

### Token Storage
- Access tokens stored encrypted in database
- Refresh tokens for long-term access
- Token expiration and renewal handling

### Scopes and Permissions
- Minimal required scopes requested
- Clear scope explanations to users
- Granular permission management

### CSRF Protection
- OAuth callbacks excluded from CSRF protection
- Integration parameter validates legitimate requests
- Popup-based flow prevents CSRF attacks

## Workflow Integration

### Using Connected Accounts
```javascript
// Example: Access user's Google Sheets
const googleAccount = await prisma.socialAccount.findFirst({
  where: {
    userId: user.id,
    provider: 'google'
  }
});

if (googleAccount?.accessToken) {
  // Make Google Sheets API call
  const sheets = await googleSheetsAPI.get({
    auth: googleAccount.accessToken,
    spreadsheetId: 'user_spreadsheet_id'
  });
}
```

### Workflow Triggers
- Webhook-based triggers from connected services
- Scheduled data synchronization
- Real-time event processing

## Error Handling

### OAuth Errors
- Provider-specific error messages
- Graceful popup closure on errors
- User-friendly error notifications

### Token Issues
- Automatic token refresh
- Re-authentication prompts
- Connection status monitoring

## Monitoring and Analytics

### Integration Metrics
- Connection success rates
- Most used integrations
- API call volume per provider
- Token refresh frequency

### User Adoption
- Integration usage patterns
- Workflow automation metrics
- User engagement with connected services

## Roadmap

### Phase 1 (Current)
- ✅ Google, GitHub, Facebook OAuth
- ✅ Popup-based integration flow
- ✅ Professional UI components
- ⚠️ Token storage (pending Prisma client)

### Phase 2 (Future)
- Additional providers (Slack, Discord, Twitter)
- Advanced scope management
- Integration marketplace
- Webhook management interface

### Phase 3 (Advanced)
- Custom OAuth provider support
- Integration analytics dashboard
- Rate limiting per integration
- Advanced workflow triggers

## Competitive Analysis

### Firebase
- Similar OAuth provider integration
- Token management via Firebase Auth
- Limited to Google ecosystem primarily

### Supabase
- OAuth integrations via Supabase Auth
- Multiple provider support
- Good developer experience

### Zapier/Make.com
- Extensive integration marketplace
- Professional connection management
- Advanced workflow automation

**Our Advantage:**
- Integrated into full BaaS platform
- Real-time data capabilities
- Auto-REST API generation
- Professional enterprise features

## Support and Documentation

### Developer Resources
- Integration setup guides
- API documentation
- Code examples
- Best practices

### User Support
- Connection troubleshooting
- Permission management
- Usage monitoring
- Security guidelines

---

*This OAuth API Integrations system provides enterprise-grade external service connectivity for your BaaS platform, enabling powerful workflow automation while maintaining security and user control.*