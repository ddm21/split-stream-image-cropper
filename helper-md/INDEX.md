# Helper Documentation Index

This folder contains helper documentation files for developers and contributors. These are reference materials and guides, not part of the core application code.

## 📚 Documentation Files

### 0. **DUAL_RATE_LIMITER_IMPLEMENTATION.md** - Implementation Summary
- **Purpose**: Overview of the dual-layer rate limiting system overhaul
- **For**: Developers who need to understand what changed and why
- **Contains**:
  - Problems solved (4 critical issues)
  - Architecture changes (before/after)
  - All files modified and changes made
  - Configuration guide
  - Testing coverage
  - Backward compatibility notes
  - Performance impact analysis
  - Security considerations
  - Migration path for existing deployments

### 1. **CLAUDE.md** - AI Code Assistant Guide
- **Purpose**: Instructions for Claude Code AI to work with this repository
- **For**: Developers using Claude Code for modifications
- **Contains**:
  - Project overview and architecture
  - Quick commands for development
  - File structure and purposes
  - Common issues and solutions
  - Development workflow

### 2. **RATE_LIMITING.md** - Rate Limiting Architecture & Implementation Guide
- **Purpose**: Complete reference for dual-layer rate limiting system
- **For**: Developers deploying to production, API users, and troubleshooters
- **Contains**:
  - **Dual Rate Limiter Architecture**
    - Processing limiter (10/hour): `/api/ui/process` + `/api/v1/process` (shared quota)
    - Health check limiter (100/hour): `/api/health` (separate quota)
  - **How It Works**
    - Localhost in-memory mode
    - Vercel Redis-backed mode with Upstash
    - IP detection and sanitization
    - Frontend sessionStorage optimization
  - **Configuration**
    - Environment variables
    - Custom limits
    - Examples for different scenarios
  - **Testing Procedures**
    - Processing rate limiting tests
    - Health check isolation tests
    - Shared quota verification
    - Page refresh verification
    - Proxy IP detection tests
  - **Production Deployment**
    - Upstash Redis setup
    - Vercel integration
    - Verification steps
  - **Troubleshooting**
    - IPs not in Redis
    - Health check caching issues
    - API bypass prevention
    - Rate limit reset problems
  - **Implementation Details**
    - File structure and organization
    - Rate limiter middleware logic
    - Performance overhead
    - Security considerations

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

### I want to understand the new rate limiting system
→ Start with: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (overview)
→ Then read: **RATE_LIMITING.md** (detailed guide)

### I'm deploying to production
→ Read: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (configuration)
→ Then: **RATE_LIMITING.md** for Upstash Redis setup

### I'm hosting on Vercel
→ Read: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (migration path)
→ Then: **RATE_LIMITING.md** (Production Deployment section)

### I need to test rate limiting
→ Read: **RATE_LIMITING.md** (Testing section - 6 test scenarios)

### I'm reviewing security
→ Read: **SECURITY_FIXES.md**
→ Then: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (Security section)

### API calls are bypassing rate limits
→ Likely fixed! Check: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (Problem #1)

### Page refreshes are consuming my quota
→ Fixed! See: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (Problem #3)

### IPs aren't appearing in Redis
→ Likely fixed! Check: **DUAL_RATE_LIMITER_IMPLEMENTATION.md** (Problem #2)
→ Debug guide: **RATE_LIMITING.md** (Troubleshooting section)

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
