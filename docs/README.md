# Grace Fellowship Church Website - Content Management Documentation

Welcome to the Grace Fellowship Church website content management system. This documentation will guide you through updating and maintaining the website content, even if you don't have technical experience.

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Quick Reference Guides](#quick-reference-guides)
3. [Detailed Documentation](#detailed-documentation)
4. [Support & Contact](#support--contact)
5. [Important Notes](#important-notes)

## 🚀 Getting Started

This website is designed to be easy to update by church staff. All content is stored in simple JSON files that can be edited with any text editor. No programming knowledge is required!

### What You Can Update

- **Events**: Add, edit, or remove church events and activities
- **Ministry Information**: Update ministry descriptions, leaders, and schedules
- **Images**: Change photos using Unsplash integration
- **Contact Information**: Update church contact details
- **Service Times**: Modify worship service schedules

### Before You Begin

1. **Backup First**: Always make a copy of files before editing
2. **Use a Text Editor**: We recommend Visual Studio Code, Notepad++, or Sublime Text
3. **Test Changes**: Preview changes locally before publishing
4. **Ask for Help**: Contact technical support if you're unsure about anything

## 📖 Quick Reference Guides

### Essential Guides for Common Tasks

| Guide | Purpose | When to Use |
|-------|---------|-------------|
| [Content Update Guide](./content-update-guide.md) | Step-by-step instructions for updating website content | Weekly/Monthly content updates |
| [JSON File Structure](./json-structure-guide.md) | Understanding and editing JSON data files | When editing events or ministry data |
| [Image Management](./image-management-guide.md) | Adding and managing images via Unsplash | When updating photos or graphics |
| [Troubleshooting Guide](./troubleshooting-guide.md) | Solutions to common problems | When something isn't working |
| [Maintenance Checklist](./maintenance-checklist.md) | Regular website upkeep tasks | Monthly maintenance routine |

## 📋 Detailed Documentation

### Content Management

#### Events Management
Learn how to add upcoming events, update event details, and remove past events.
- **File Location**: `src/data/events.json`
- **Guide**: [Content Update Guide - Events Section](./content-update-guide.md#updating-events)
- **Common Tasks**: Adding new events, updating dates, changing descriptions

#### Ministry Pages
Update information for each ministry including Children's, Youth, Men's, Women's, and Outreach.
- **File Locations**: `src/data/ministries/*.json`
- **Guide**: [Content Update Guide - Ministry Section](./content-update-guide.md#updating-ministry-information)
- **Common Tasks**: Updating leaders, schedules, and descriptions

#### SEO & Metadata
Manage page titles, descriptions, and search engine optimization.
- **File Location**: `src/data/seo-meta.json`
- **Guide**: [JSON File Structure - SEO Metadata](./json-structure-guide.md#seo-metadata)
- **Common Tasks**: Updating page descriptions and keywords

### Technical Documentation

#### File Structure Overview