# Troubleshooting Guide

## Table of Contents
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Error Messages Explained](#error-messages-explained)
- [Preventive Measures](#preventive-measures)
- [When to Contact Technical Support](#when-to-contact-technical-support)
- [Emergency Procedures](#emergency-procedures)

---

## Common Issues and Solutions

### Issue 1: Website Not Displaying Updated Content

**Symptoms:**
- Changes made to JSON files are not visible on the website
- Old content still appears after updates

**Solutions:**

**Step 1: Clear Browser Cache**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page with `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

**Step 2: Verify File Upload**
1. Check that the JSON file was saved correctly
2. Confirm the file was uploaded to the correct location
3. Verify file permissions allow reading

**Step 3: Check for Syntax Errors**
1. Open the JSON file in a text editor
2. Look for missing commas, brackets, or quotes
3. Use a JSON validator tool (jsonlint.com)
4. Fix any syntax errors and re-upload

**Prevention:**
- Always validate JSON before uploading
- Keep backup copies of working files
- Test changes in a staging environment first

---

### Issue 2: JSON Syntax Errors

**Symptoms:**
- Content not loading on specific pages
- Console errors in browser developer tools
- Blank sections on the website

**Common JSON Mistakes:**

**Missing Comma:**