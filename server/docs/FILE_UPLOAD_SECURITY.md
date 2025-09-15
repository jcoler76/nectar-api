# File Upload Security Documentation

## Overview
The Nectar Studio implements comprehensive file upload security with multiple layers of protection against common attack vectors.

## Security Features

### 1. File Type Validation
- **Whitelist Approach**: Only explicitly allowed file types accepted
- **MIME Type Checking**: Validates declared MIME type
- **Extension Validation**: Ensures file extension matches MIME type
- **Magic Number Validation**: Verifies file content matches declared type

#### Allowed File Types
```javascript
// Text and Data
.txt  (text/plain)
.csv  (text/csv)
.json (application/json)
.xml  (application/xml, text/xml)

// Documents
.pdf  (application/pdf)
.xls  (application/vnd.ms-excel)
.xlsx (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

// Images
.jpg, .jpeg (image/jpeg)
.png  (image/png)
.gif  (image/gif)

// Archives
.zip  (application/zip, application/x-zip-compressed)
```

### 2. Filename Security
- **Directory Traversal Prevention**: Blocks `../`, `..\\` patterns
- **Path Injection Prevention**: Removes path separators
- **Reserved Name Blocking**: Windows reserved names (CON, PRN, AUX, etc.)
- **Hidden File Prevention**: Blocks files starting with `.`
- **Executable Blocking**: Rejects executable extensions
- **Control Character Filtering**: Removes non-printable characters
- **Length Limits**: Maximum 255 characters
- **Automatic Sanitization**: Generates safe filenames

### 3. Content Validation
- **Magic Number Verification**: Validates file headers
- **Script Detection**: Scans for embedded scripts
- **XXE Prevention**: Blocks XML external entities
- **SQL Injection Detection**: Identifies SQL patterns
- **Polyglot File Detection**: Prevents dual-purpose files
- **Zip Bomb Detection**: Checks compression ratios

#### Threat Patterns Detected
- `<script>`, `javascript:`, `vbscript:`
- `<iframe>`, `<object>`, `<embed>`, `<applet>`
- `<?php`, `<?=`
- `<!--#include`, `<!--#exec`
- `<!ENTITY`, `SYSTEM`
- Base64 encoded scripts

### 4. Size and Rate Limiting
- **File Size Limits**: Configurable per endpoint (default 10MB)
- **Upload Rate Limiting**: Redis-backed with fallback
- **Request Part Limits**: Maximum fields and parts
- **Memory Protection**: Memory storage with limits

### 5. Authentication and Authorization
- **Upload Tokens**: Required for all uploads
- **Timing-Safe Comparison**: Prevents timing attacks
- **Workflow Validation**: Ensures workflow accepts uploads
- **IP Tracking**: Logs upload sources

### 6. Temporary Storage
- **Automatic Cleanup**: Files deleted after TTL
- **Encryption at Rest**: Optional AES-256-GCM encryption
- **Secure Permissions**: Files created with 0600 mode
- **Isolated Storage**: Separate temp directory

## Implementation

### Basic Upload Endpoint
```javascript
const { createSecureUploader, validateFileContent } = require('./middleware/fileUploadSecurity');
const { uploadRateLimiter } = require('./middleware/rateLimiter');

const upload = createSecureUploader({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  sanitizeFilename: true
});

router.post('/upload',
  uploadRateLimiter,
  upload.single('file'),
  validateFileContent,
  async (req, res) => {
    // File has passed all security checks
    const file = req.file;
    const metadata = file.securityMetadata;
    
    // Process file...
  }
);
```

### Custom File Types
```javascript
const documentUploader = createSecureUploader({
  allowedMimeTypes: ['application/pdf', 'application/msword'],
  allowedExtensions: ['.pdf', '.doc', '.docx'],
  maxFileSize: 20 * 1024 * 1024 // 20MB
});
```

### Workflow Integration
```javascript
// File trigger with token authentication
router.post('/trigger/:workflowId',
  uploadRateLimiter,
  fileUploadSecurity,
  upload.single('file'),
  validateFileContent,
  async (req, res) => {
    // Validate upload token
    const token = req.header('X-Upload-Token');
    // Process workflow...
  }
);
```

## Security Headers

### Request Headers
```
X-Upload-Token: <secure-token>
Content-Type: multipart/form-data
```

### Response Headers
```
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'
```

## Error Handling

### Error Responses
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not allowed"
  }
}
```

### Error Codes
- `INVALID_FILE_TYPE`: MIME type not allowed
- `INVALID_FILE_EXTENSION`: Extension not allowed
- `MIME_MISMATCH`: Extension doesn't match MIME
- `MALICIOUS_FILENAME`: Dangerous filename pattern
- `INVALID_FILE_CONTENT`: Content validation failed
- `MALICIOUS_CONTENT`: Threat detected in content
- `FILE_TOO_LARGE`: Exceeds size limit
- `VIRUS_DETECTED`: Antivirus scan failed

## Best Practices

### 1. Configuration
```javascript
// Environment variables
FILE_ENCRYPTION_KEY=your-256-bit-key
MAX_FILE_SIZE=10485760
TEMP_FILE_TTL=3600000
```

### 2. Logging
- Log all upload attempts with IP
- Track validation failures
- Monitor for attack patterns
- Alert on repeated failures

### 3. Testing
```bash
# Run security tests
npm test -- fileUploadSecurity.test.js

# Test malicious files
curl -X POST -H "X-Upload-Token: token" \
  -F "file=@/path/to/eicar.txt" \
  http://localhost:3001/api/files/trigger/workflowId
```

### 4. Monitoring
- Track upload volumes by IP
- Monitor file type distribution
- Alert on unusual patterns
- Review validation failures

## Attack Scenarios Prevented

### 1. Path Traversal
```
../../../etc/passwd ❌
..\\windows\\system32 ❌
%2e%2e%2f%2e%2e%2f ❌
```

### 2. XSS via Filename
```
<script>alert(1)</script>.txt ❌
image.svg<svg onload=alert(1)> ❌
```

### 3. File Type Bypass
```
shell.php.jpg ❌ (Double extension)
image.jpg with PHP content ❌ (Magic number mismatch)
```

### 4. Zip Bombs
```
42.zip (1GB compressed to 1KB) ❌
Nested zip files ❌
```

### 5. XXE Attacks
```xml
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root> ❌
```

### 7. Real-time Virus Scanning
- **ClamAV Integration**: Real antivirus scanning with clamscan package
- **Graceful Fallback**: EICAR detection when ClamAV unavailable
- **Multiple Scan Methods**: Daemon (clamdscan) and binary (clamscan) support
- **Error Handling**: Comprehensive error handling and logging
- **Performance Optimized**: Configurable timeouts and multithreading

#### ClamAV Configuration
```javascript
// Environment variables for ClamAV
CLAMSCAN_PATH=/usr/bin/clamscan           // Path to clamscan binary
CLAMDSCAN_PATH=/usr/bin/clamdscan         // Path to clamdscan binary
CLAMD_SOCKET=/var/run/clamav/clamd.ctl    // Unix socket for daemon
CLAMD_HOST=127.0.0.1                      // TCP host for daemon
CLAMD_PORT=3310                           // TCP port for daemon
CLAMAV_DB_PATH=/var/lib/clamav            // Virus database path
CLAMD_CONFIG=/etc/clamav/clamd.conf       // Daemon config file
```

#### Virus Scan Results
```javascript
// Successful scan result
{
  clean: true,
  scanner: 'clamav', // or 'fallback'
  goodFiles: 1,
  badFiles: 0,
  errors: []
}

// Fallback mode result
{
  clean: true,
  scanner: 'fallback',
  warning: 'ClamAV not available - limited virus detection active'
}
```

## Future Enhancements

1. **Image Processing**: Resize/reformat to remove metadata
2. **Document Sanitization**: PDF/Office macro removal
3. **Machine Learning**: Anomaly detection for uploads
4. **CDN Integration**: Direct uploads to cloud storage
5. **Watermarking**: Add tracking to uploaded files
6. **Cloud AV Integration**: Additional cloud-based scanning services