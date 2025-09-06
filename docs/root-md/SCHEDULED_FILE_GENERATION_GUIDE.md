# Scheduled File Generation and FTP Upload Workflow Guide

This guide explains how to create workflows that automatically generate files from API data and upload them to FTP servers on a schedule.

## Workflow Overview

You can now create workflows that:
1. **Schedule** API calls at specific times
2. **Fetch data** from external APIs
3. **Generate files** in CSV or XML format
4. **Upload files** to FTP/SFTP servers

## Basic Workflow Chain

```
Scheduler → HTTP Request → File Generation → FTP Upload
```

## Step-by-Step Setup

### 1. Scheduler Trigger Node

**Purpose**: Triggers the workflow at scheduled intervals

**Configuration**:
- **Cron Pattern**: Use standard cron syntax
  - `0 9 * * 1-5` - Every weekday at 9 AM
  - `0 0 * * *` - Daily at midnight
  - `0 */6 * * *` - Every 6 hours
- **Timezone**: Select your timezone (e.g., "America/New_York")

**Example Settings**:
```
Label: Daily Report Schedule
Pattern: 0 8 * * 1-5
Timezone: America/New_York
```

### 2. HTTP Request Node

**Purpose**: Fetches data from your API endpoint

**Configuration**:
- **Method**: GET, POST, PUT, etc.
- **URL**: Your API endpoint
- **Headers**: API keys, authentication tokens
- **Body**: Request payload (for POST/PUT)

**Example Settings**:
```
Label: Fetch Sales Data
Method: GET
URL: https://api.yourcompany.com/reports/sales
Headers:
  - Key: Authorization
    Value: Bearer YOUR_API_TOKEN
  - Key: Content-Type
    Value: application/json
```

### 3. File Generation Node

**Purpose**: Converts API response data into CSV or XML files

**Configuration**:
- **File Format**: CSV or XML
- **Source Data Path**: `{{httpRequest.data}}` (references previous node)
- **Filename**: Custom filename (extension added automatically)

#### CSV Options:
- **Delimiter**: Comma, semicolon, tab, etc.
- **Include Headers**: Toggle header row
- **Quote Strings**: Wrap text in quotes
- **Custom Headers**: Override auto-detected headers

#### XML Options:
- **Root Element**: Name of XML root element
- **Item Element**: Name for array items
- **Encoding**: Character encoding (UTF-8, etc.)
- **Pretty Print**: Formatted with indentation

**Example Settings**:
```
Label: Generate Sales Report CSV
Format: csv
Source Data: {{httpRequest.data}}
Filename: daily_sales_report
CSV Options:
  - Delimiter: ,
  - Include Headers: true
  - Quote Strings: true
```

### 4. FTP Upload Node

**Purpose**: Uploads the generated file to your FTP server

**Configuration**:
- **Protocol**: FTP, FTPS, or SFTP
- **Host**: FTP server address
- **Port**: Server port (21 for FTP, 22 for SFTP)
- **Credentials**: Username and password
- **Remote Path**: Destination folder on server
- **File Source**: "From Previous Node" (auto-detects file)

**Example Settings**:
```
Label: Upload to Reports Server
Protocol: sftp
Host: reports.yourcompany.com
Port: 22
Username: report_user
Password: ••••••••
Remote Path: /reports/sales/
File Source: From Previous Node
```

## Common Use Cases

### 1. Daily Sales Reports

**Schedule**: Every day at 8 AM
**API**: Sales data from CRM
**File**: CSV with customer purchases
**FTP**: Upload to accounting server

```
Workflow: Daily Sales Export
├── Scheduler (0 8 * * *)
├── HTTP Request (GET /api/sales/daily)
├── File Generation (CSV format)
└── FTP Upload (SFTP to accounting server)
```

### 2. Weekly Inventory Updates

**Schedule**: Every Monday at 6 AM
**API**: Inventory levels from warehouse system
**File**: XML for supplier integration
**FTP**: Upload to supplier portal

```
Workflow: Weekly Inventory Sync
├── Scheduler (0 6 * * 1)
├── HTTP Request (GET /api/inventory/current)
├── File Generation (XML format)
└── FTP Upload (FTP to supplier.example.com)
```

### 3. Monthly Financial Reports

**Schedule**: First day of month at midnight
**API**: Financial data aggregation
**File**: CSV for spreadsheet analysis
**FTP**: Secure upload to finance team

```
Workflow: Monthly Finance Export
├── Scheduler (0 0 1 * *)
├── HTTP Request (POST /api/reports/financial)
├── File Generation (CSV with custom headers)
└── FTP Upload (FTPS with encryption)
```

## Data Flow and Context Variables

### Accessing Previous Node Data

Each node in the workflow can access data from previous nodes using the `{{nodeName.property}}` syntax:

- `{{trigger.data}}` - Initial trigger data
- `{{httpRequest.data}}` - API response data
- `{{httpRequest.statusCode}}` - HTTP status code
- `{{fileGeneration.filename}}` - Generated filename
- `{{fileGeneration.size}}` - File size in bytes

### Example Data Transformations

**API Response**:
```json
{
  "sales": [
    {"date": "2024-01-15", "customer": "ABC Corp", "amount": 1500},
    {"date": "2024-01-15", "customer": "XYZ Ltd", "amount": 2300}
  ],
  "total": 3800
}
```

**File Generation Source**: `{{httpRequest.data.sales}}`

**Generated CSV**:
```csv
date,customer,amount
2024-01-15,ABC Corp,1500
2024-01-15,XYZ Ltd,2300
```

## Error Handling and Monitoring

### Built-in Error Handling

- **HTTP Request**: Retries and timeout handling
- **File Generation**: Data validation and format checking
- **FTP Upload**: Connection retry and file verification

### Monitoring Options

- **Workflow Run History**: View execution logs and results
- **Email Notifications**: Configure alerts for failures
- **Status Dashboard**: Real-time workflow monitoring

### Common Issues and Solutions

1. **API Authentication Errors**
   - Check API keys and tokens
   - Verify header formatting
   - Test HTTP request independently

2. **File Generation Failures**
   - Validate source data path
   - Check data format compatibility
   - Review error logs for specifics

3. **FTP Upload Problems**
   - Verify server credentials
   - Check network connectivity
   - Ensure remote directory exists

## Advanced Configurations

### Conditional File Generation

Use Router nodes to generate different files based on data conditions:

```
Scheduler → HTTP Request → Router
                         ├── (Success) → File Generation → FTP Upload
                         └── (Error) → Email Alert
```

### Multiple File Formats

Generate both CSV and XML from the same data:

```
Scheduler → HTTP Request ─┬── File Generation (CSV) → FTP Upload (CSV)
                          └── File Generation (XML) → FTP Upload (XML)
```

### Dynamic Filenames

Use workflow context for dynamic naming:

```
Filename: sales_report_{{trigger.date}}_{{httpRequest.data.region}}
Result: sales_report_2024-01-15_north.csv
```

## Security Best Practices

1. **Use SFTP or FTPS** instead of plain FTP when possible
2. **Store credentials securely** - passwords are encrypted in workflow storage
3. **Limit FTP user permissions** to only necessary directories
4. **Use API keys** instead of username/password for HTTP requests
5. **Enable connection timeouts** to prevent hanging connections

## Testing Your Workflow

1. **Test Each Node Individually**:
   - HTTP Request: Use the "Test Request" button
   - File Generation: Verify with sample data
   - FTP Upload: Test connection and permissions

2. **Run Full Workflow**:
   - Use "Test Workflow" feature
   - Check execution logs
   - Verify file appears on FTP server

3. **Schedule Testing**:
   - Set temporary frequent schedule (every minute)
   - Monitor several executions
   - Reset to production schedule

## Troubleshooting Guide

### Workflow Not Running
- Check scheduler cron pattern syntax
- Verify workflow is active
- Review system logs for errors

### File Not Generated
- Validate source data path: `{{httpRequest.data}}`
- Check if API response contains expected data
- Review file generation node logs

### FTP Upload Failing
- Test FTP credentials manually
- Check server connectivity
- Verify remote directory permissions
- Review FTP node error messages

## Support and Resources

- **Workflow Builder**: Visual interface for creating workflows
- **Execution History**: Detailed logs of each workflow run
- **Node Documentation**: Help text in each node configuration panel
- **API Testing**: Built-in tools for testing HTTP requests

For additional support, check the workflow execution logs and error messages for specific troubleshooting guidance.