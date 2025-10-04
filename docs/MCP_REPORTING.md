# MCP Server Reporting & Analytics

## Overview

MCP (Model Context Protocol) server activity is fully integrated into the application's reporting system, providing comprehensive visibility into autonomous agent operations.

## Where to Find MCP Data

### Activity Logs Report (Primary)

**Location**: Navigation → **Activity Logs**

This is the **primary report** for viewing MCP server activity.

**Filtering MCP Data**:

1. **Category Filter**: Select **"MCP (AI Agents)"** to show only MCP operations
2. **Endpoint Type Filter**: Select **"Agent (MCP)"** to filter by agent endpoint type
3. **Combine Filters**: Use both together for precise MCP activity filtering

**What You Can See**:
- Individual MCP tool executions
- Server discovery requests
- Tool listing operations
- Health check calls
- Success/failure rates
- Response times
- Error details
- IP addresses and user agents
- Application and role context

**Example Filters**:
```
Category: MCP (AI Agents)
Endpoint Type: Agent (MCP)
Date Range: Last 7 days
Status: All
```

### API Usage Report (Excludes MCP)

**Location**: Navigation → **API Usage Report**

⚠️ **Note**: The API Usage Report is specifically designed for **public API tracking** and does **NOT include MCP data**.

**Why**: MCP operations use `endpointType: 'agent'` while the API Usage Report only tracks `endpointType: 'public'`. This separation is intentional:
- **API Usage Report** → External/Public API calls from client applications
- **Activity Logs Report** → All internal operations including MCP

## MCP-Specific Metrics

### Available Data Points

For each MCP operation, the following is tracked:

| Metric | Description | Where to Find |
|--------|-------------|---------------|
| Tool Name | The MCP tool that was executed | Activity Logs → Endpoint column |
| Server ID | The MCP server instance | Activity Logs → Metadata |
| Application | The application that made the request | Activity Logs → Metadata |
| Role | The role associated with the MCP server | Activity Logs → Metadata |
| Parameters | Input parameters (sanitized) | Activity Logs → Metadata |
| Result | Tool execution result (truncated) | Activity Logs → Metadata |
| Execution Time | Time taken to execute (ms) | Activity Logs → Response Time |
| Success/Failure | Whether the operation succeeded | Activity Logs → Status |
| IP Address | Client IP address | Activity Logs → IP Address |
| Timestamp | When the request occurred | Activity Logs → Timestamp |

### Common MCP Endpoints

| Endpoint | Description | Category | Type |
|----------|-------------|----------|------|
| MCP Discovery | Agent discovering available servers | mcp | agent |
| MCP Server List | Listing MCP servers | mcp | agent |
| MCP Tools List | Getting available tools for a server | mcp | agent |
| MCP Tool: [name] | Executing a specific tool | mcp | agent |
| MCP Health Check | Server health status | mcp | agent |

## Querying MCP Data

### Via Activity Logs UI

**Most Used MCP Tools** (Last 7 Days):
1. Navigate to **Activity Logs**
2. Set filters:
   - Category: **MCP (AI Agents)**
   - Date Range: **Last 7 Days**
3. Sort by **Endpoint** to group by tool name
4. Review counts and performance

**Failed MCP Operations**:
1. Navigate to **Activity Logs**
2. Set filters:
   - Category: **MCP (AI Agents)**
   - Status: **Failed** (or filter by Status Code >= 400)
3. Review error messages and patterns

**MCP Usage by Application**:
1. Navigate to **Activity Logs**
2. Set filters:
   - Category: **MCP (AI Agents)**
3. Export to CSV
4. Group by Application Name in Excel/spreadsheet

### Via Direct Database Query

See `docs/MCP_ACTIVITY_LOGGING.md` for SQL query examples.

**Quick Example**:
```sql
SELECT
  "timestamp",
  "endpoint",
  "metadata"->>'applicationName' as application,
  "responseTime",
  "statusCode"
FROM "ApiActivityLog"
WHERE "category" = 'mcp'
  AND "timestamp" > NOW() - INTERVAL '7 days'
ORDER BY "timestamp" DESC;
```

## Statistics & Analytics

### Key Performance Indicators (KPIs)

To calculate MCP KPIs:

**1. MCP Request Volume** (requests/day)
- Filter: Category = MCP
- Group by: Date
- Metric: Count

**2. Average MCP Response Time**
- Filter: Category = MCP, Success = true
- Metric: AVG(responseTime)

**3. MCP Error Rate**
- Filter: Category = MCP
- Metric: (Failed Requests / Total Requests) * 100

**4. Most Active Applications**
- Filter: Category = MCP
- Group by: Application Name
- Metric: Count

**5. Peak MCP Usage Hours**
- Filter: Category = MCP
- Group by: Hour of Day
- Metric: Count

### Exporting MCP Data

**From Activity Logs**:
1. Set Category filter to **MCP (AI Agents)**
2. Set desired date range
3. Click **Export** button
4. Choose format: CSV or JSON

**Exported Data Includes**:
- Timestamp
- Endpoint/Tool Name
- Status Code
- Response Time
- User/Application
- IP Address
- Error details (if failed)
- Full metadata (JSON)

## Monitoring & Alerts

### Recommended Monitoring

**Daily Checks**:
- MCP error rate (should be < 5%)
- Average response time (should be < 2000ms for most tools)
- Failed authentication attempts

**Weekly Reviews**:
- Top 10 most-used MCP tools
- Applications with highest MCP usage
- Trend analysis (increasing/decreasing usage)

**Monthly Analysis**:
- MCP adoption rate (number of active applications)
- Performance trends
- Cost analysis (if tracking AI costs)

### Setting Up Alerts

While the application doesn't have built-in alerting for MCP yet, you can:

1. **Query-Based Monitoring**:
   - Schedule SQL queries to check error rates
   - Alert if error rate > threshold

2. **Export + External Tools**:
   - Export MCP logs daily
   - Import into monitoring tools (Datadog, New Relic, etc.)

3. **Log-Based Alerts**:
   - Monitor application logs for MCP errors
   - Set up log aggregation tools (ELK, Splunk)

## Usage Patterns

### Common Analysis Scenarios

**1. Which tools are agents using most?**
```
Filter: Category = MCP
Group by: Endpoint
Sort by: Count (desc)
```

**2. What's the typical response time for each tool?**
```
Filter: Category = MCP, Success = true
Group by: Endpoint
Metric: AVG(responseTime), MIN(responseTime), MAX(responseTime)
```

**3. Which applications are experiencing MCP errors?**
```
Filter: Category = MCP, Status = Failed
Group by: Application
Sort by: Count (desc)
```

**4. When do agents call MCP servers?**
```
Filter: Category = MCP
Group by: Hour of Day
Metric: Count
```

**5. How many unique agents are using MCP?**
```
Filter: Category = MCP
Distinct count: Application ID
```

## Integration with Existing Reports

### Activity Statistics Cards

The **Activity Statistics Cards** at the top of the Activity Logs Report show aggregate metrics that **include MCP data**:

- **Total Requests**: Includes MCP operations
- **Success Rate**: Includes MCP successes/failures
- **Avg Response Time**: Includes MCP response times
- **Error Rate**: Includes MCP errors

To see **MCP-only statistics**, filter by Category = MCP before viewing the stats.

### Smart Filters

The Activity Logs Report includes **Smart Filters**:

- **All Activity**: Shows everything including MCP
- **Important Only**: Includes MCP (high importance)
- **Critical Only**: Excludes MCP (focuses on auth + public APIs)

MCP operations are classified as **"high" importance** due to their agent-driven nature.

## Best Practices

### For Administrators

1. **Regular Monitoring**: Check MCP activity weekly at minimum
2. **Error Investigation**: Investigate all MCP errors promptly (agents may be stuck)
3. **Performance Tracking**: Monitor response times to ensure agent efficiency
4. **Access Review**: Periodically review which applications have MCP access

### For Developers

1. **Export Data**: Export MCP logs for offline analysis
2. **Correlate with Application Logs**: Match MCP activity with application behavior
3. **Identify Bottlenecks**: Look for slow tools that need optimization
4. **Track Adoption**: Monitor MCP usage trends to measure success

### For Business Users

1. **Usage Trends**: Track MCP adoption across teams
2. **Cost Analysis**: If applicable, correlate MCP usage with AI costs
3. **ROI Measurement**: Compare before/after MCP implementation metrics

## Future Enhancements

Potential improvements to MCP reporting:

- **Dedicated MCP Dashboard**: Real-time MCP metrics with charts
- **Cost Tracking**: Link MCP tool usage to AI provider costs
- **Anomaly Detection**: Automated alerts for unusual patterns
- **Agent Performance Profiles**: Detailed analytics per agent
- **Tool Efficiency Reports**: Identify underperforming tools
- **Predictive Analytics**: Forecast MCP usage and capacity needs

## Troubleshooting

### MCP Data Not Showing

**Problem**: Can't see MCP activity in reports

**Solutions**:
1. Verify date range includes recent MCP activity
2. Check Category filter is set to "All" or "MCP (AI Agents)"
3. Verify MCP activity logger is running (check `docs/MCP_ACTIVITY_LOGGING.md`)
4. Check database for MCP logs: `SELECT COUNT(*) FROM "ApiActivityLog" WHERE category = 'mcp'`

### Incomplete MCP Data

**Problem**: Some MCP operations are missing

**Solutions**:
1. Check logger queue status: Review `mcpActivityLogger.getStatus()`
2. Verify no errors in application logs
3. Ensure `organizationId` is present in requests (required for logging)

### Performance Issues

**Problem**: Activity Logs Report slow when filtering MCP

**Solutions**:
1. Narrow date range
2. Add database index on category: `CREATE INDEX idx_category ON "ApiActivityLog"(category);`
3. Archive old logs (see data retention policies)

## References

- **Activity Logger Implementation**: `docs/MCP_ACTIVITY_LOGGING.md`
- **MCP Architecture**: `docs/MCP_AUTONOMOUS_AGENTS_ARCHITECTURE.md`
- **User Guide**: `docs/MCP_USER_GUIDE.md`
- **Security**: `docs/MCP_RLS_SECURITY.md`
