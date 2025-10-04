# Nectar Studio File Storage

**Production-ready file storage with security, scalability, and smart caching**

## Overview

Nectar Studio's File Storage provides reliable, secure file management built on AWS S3. Upload, organize, and deliver files with enterprise-grade security and automatic optimization—without the complexity or cost of managing infrastructure.

---

## ✅ What You Actually Get

### **Secure File Storage**
- **AWS S3 backbone**: 99.999999999% durability, proven at scale
- **Advanced security**: Virus scanning (ClamAV), magic number validation, file type restrictions
- **Encryption**: AES-256 server-side encryption, TLS 1.3 in transit
- **Access control**: Public/private files with organization-level isolation
- **Checksum verification**: SHA-256 integrity checking

### **Smart Performance**
- **Aggressive browser caching**: 1-year cache headers on immutable files
- **Automatic thumbnails**: 3 optimized sizes (150x150, 300x300, 600x400) for images
- **Direct uploads**: Presigned URLs let clients upload directly to S3 (no server bottleneck)
- **Fast regional delivery**: S3's regional edge caching for improved performance
- **Optional CDN**: Bring your own CloudFront/Cloudflare for global distribution

### **Developer-Friendly**
- **RESTful API**: Intuitive endpoints for upload, download, list, share
- **Flexible uploads**: Direct upload via API or presigned URLs for large files
- **Rich metadata**: Tags, descriptions, custom fields, full-text search
- **File sharing**: Secure shareable links with expiration, password protection, download limits
- **Usage tracking**: Monitor storage usage and costs in real-time

### **Enterprise Features**
- **Multi-organization**: Complete tenant isolation with RLS security
- **Version control**: File versioning built into S3 (enable per-bucket)
- **Storage quotas**: Per-plan limits with optional overage billing
- **Audit logging**: Complete activity tracking for compliance
- **Malware protection**: ClamAV virus scanning (when configured)

---

## 📊 Realistic Performance Expectations

### **Upload Speeds**
- **Small files (<10MB)**: Typically 1-3 seconds
- **Large files (>100MB)**: Use presigned URLs for direct S3 upload
- **Performance**: Depends on user's connection + distance to S3 region

### **Download Speeds**
- **With browser caching**: Instant (served from cache after first download)
- **First download**: Depends on S3 region proximity (typically 200-800ms)
- **With CloudFront CDN**: 50-150ms globally (requires separate setup)

### **Storage Limits by Plan**
- **Free**: 5GB storage, 10GB/month bandwidth
- **Professional**: 100GB storage, 500GB/month bandwidth
- **Enterprise**: Custom limits with overage billing

---

## 🔒 Security Features

### **Upload Security**
- Magic number validation (prevents file type spoofing)
- File extension + MIME type matching
- Malicious pattern detection (scripts, SQL injection, XSS)
- Directory traversal prevention
- Zip bomb detection
- Virus scanning with ClamAV (requires manual ClamAV setup)

### **Access Control**
- Organization-level isolation (RLS enforced)
- Public/private file visibility
- Presigned URLs with expiration (1 hour default)
- Password-protected shares
- Download tracking and limits

---

## 💻 API Examples

### **Upload Files**
```bash
POST /api/files/upload
Content-Type: multipart/form-data

curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@document.pdf" \
  -F "tags=[\"invoice\", \"2024\"]" \
  -F "isPublic=false" \
  https://api.nectar.studio/files/upload
```

### **Get Presigned Upload URL (for large files)**
```bash
POST /api/files/presigned-url
{
  "filename": "video.mp4",
  "maxFileSize": 1073741824,  // 1GB
  "expiresIn": 3600
}

# Then upload directly from browser/client to S3
```

### **List Files with Search**
```bash
GET /api/files?search=invoice&tags=2024&mimeType=application/pdf&page=1&limit=20
```

### **Create Shareable Link**
```bash
POST /api/files/{fileId}/share
{
  "isPublic": true,
  "allowDownload": true,
  "expiresIn": 604800,  // 7 days
  "maxDownloads": 50,
  "password": "optional-password"
}
```

---

## 🚀 Getting Started

### **1. Configure Environment**
```bash
# Required
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional - Performance
CDN_DOMAIN=cdn.yourdomain.com  # If using CloudFront/Cloudflare

# Optional - Security (requires ClamAV installation)
CLAMSCAN_PATH=/usr/bin/clamscan
CLAMD_SOCKET=/var/run/clamav/clamd.ctl

# Optional - Limits
MAX_FILE_SIZE=104857600  # 100MB default
```

### **2. Set Up S3 Bucket**
```bash
# Bucket should have:
# - Server-side encryption enabled (AES-256)
# - Versioning enabled (optional but recommended)
# - CORS configured for direct uploads
# - Lifecycle rules for cost optimization (optional)
```

### **3. Optional: Add CloudFront CDN**
If you need global performance (<100ms worldwide):
- Create CloudFront distribution pointing to your S3 bucket
- Set `CDN_DOMAIN` environment variable
- Typical cost: $0.085/GB + $0.01 per 10,000 requests
- Only needed for high-traffic, global user base

---

## 💰 Cost Breakdown (AWS)

### **S3 Storage Costs**
- Storage: $0.023/GB/month (Standard)
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Example**: 100GB storage + 100k downloads/month = **~$2.50/month**

### **Optional CloudFront CDN**
- Data transfer: $0.085/GB (first 10TB)
- Requests: $0.0075 per 10,000 HTTPS requests
- Only recommended for global user base or high traffic

**Example**: 500GB/month CDN delivery = **~$42.50/month**

### **When to Add CDN:**
- ✅ Global user base (multi-continent)
- ✅ High traffic (>10k downloads/day)
- ✅ Need <100ms response times worldwide
- ❌ Regional/local users only
- ❌ Low traffic (<1k downloads/day)
- ❌ Budget-conscious early stage

---

## 🎯 Use Cases

### **What It's Great For**
- User profile pictures and avatars
- Document management systems
- Product images for e-commerce
- File attachments in SaaS apps
- Digital asset management
- Backup and archival storage

### **What You Might Need Extra For**
- **Video streaming**: Consider dedicated video platforms (Mux, Cloudflare Stream)
- **Global <100ms delivery**: Set up CloudFront/Cloudflare separately
- **Image transformations**: Integrate Cloudinary/imgix for on-the-fly resizing
- **Large files (>5GB)**: Use multipart upload with SDK

---

## 📈 Supported File Types

**Images**: JPEG, PNG, GIF, WebP, SVG (with thumbnail generation)
**Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
**Media**: MP4, MOV, MP3, WAV, OGG
**Archives**: ZIP (with virus scanning)
**Data**: JSON, XML

Max file size: 100MB (configurable via `MAX_FILE_SIZE`)

---

## ⚙️ Optional Enhancements

### **Add Virus Scanning**
```bash
# Install ClamAV (Ubuntu/Debian)
sudo apt-get install clamav clamav-daemon
sudo freshclam  # Update virus definitions

# Configure environment
CLAMSCAN_PATH=/usr/bin/clamscan
CLAMD_SOCKET=/var/run/clamav/clamd.ctl
```

### **Add CloudFront CDN**
1. Create CloudFront distribution in AWS Console
2. Point origin to your S3 bucket
3. Set `CDN_DOMAIN=your-distribution.cloudfront.net`
4. Files will use CDN URL automatically

### **Enable S3 Versioning**
```bash
aws s3api put-bucket-versioning \
  --bucket your-bucket-name \
  --versioning-configuration Status=Enabled
```

---

## 🔧 What's NOT Included (Yet)

❌ Built-in CDN (you can add CloudFront separately)
❌ On-the-fly image transformations (use thumbnails or add Cloudinary)
❌ Video transcoding (use dedicated service like Mux)
❌ Automatic image optimization beyond thumbnails
❌ Built-in backup/disaster recovery (use S3 versioning)

---

## 📞 Need More?

**Want faster global delivery?** Set up CloudFront CDN (~$40-100/month for most apps)
**Need image transformations?** Integrate Cloudinary or imgix
**Want video streaming?** Consider Mux, Cloudflare Stream, or AWS MediaConvert
**Enterprise needs?** Contact us for custom S3 configurations, private cloud, or on-premise

---

*Nectar Studio File Storage - Honest, production-ready file storage without the marketing fluff.*
