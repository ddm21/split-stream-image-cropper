# Helper Documentation Index

This folder contains helper documentation files for developers and contributors. These are reference materials and guides, not part of the core application code.

## 📚 Documentation Files

### 1. **CLAUDE.md** - AI Code Assistant Guide
- **Purpose**: Instructions for Claude Code AI to work with this repository
- **For**: Developers using Claude Code for modifications
- **Contains**:
  - Project overview and architecture
  - Quick commands for development
  - File structure and purposes
  - Common issues and solutions
  - Development workflow

### 2. **RATE_LIMITING.md** - Rate Limiting Complete Guide
- **Purpose**: Comprehensive documentation on rate limiting setup and usage
- **For**: Developers deploying to production or Vercel
- **Contains**:
  - Rate limiting overview
  - Dual-mode operation explanation
  - Localhost setup
  - Vercel production setup with Upstash Redis
  - Configuration options
  - Testing procedures
  - Troubleshooting guide
  - Performance considerations

### 3. **SECURITY_FIXES.md** - Security Audit Report
- **Purpose**: Documentation of security fixes and considerations
- **For**: Security-conscious developers and auditors
- **Contains**:
  - Security improvements made
  - Vulnerability fixes
  - CORS configuration
  - Rate limiting security
  - API authentication
  - Future security recommendations

## 🚀 Quick Links by Use Case

### I'm deploying to production
→ Read: **RATE_LIMITING.md** for Upstash Redis setup

### I'm hosting on Vercel
→ Read: **RATE_LIMITING.md** (Vercel section)

### I'm reviewing security
→ Read: **SECURITY_FIXES.md**

### I'm using Claude Code to modify this repo
→ Read: **CLAUDE.md**

### I'm developing locally
→ Read: **CLAUDE.md** (Development Workflow section)

## 📖 Main Documentation

For general usage, setup, and API reference, see:
- **README.md** - Main project documentation in repository root
- **RATE_LIMITING.md** - For rate limiting specifics

## 💡 Tips

- The README.md in the root should be the first thing new users read
- CLAUDE.md is designed for AI assistants working with the code
- SECURITY_FIXES.md documents past issues and current mitigations
- RATE_LIMITING.md is essential for anyone deploying to production
