# Google Analytics 4 Setup and Configuration Guide

## Overview

This guide provides comprehensive instructions for setting up Google Analytics 4 (GA4) for the Grace Fellowship Church website, including property creation, tracking configuration, custom events, conversion goals, and dashboard setup for church staff.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GA4 Property Creation](#ga4-property-creation)
3. [Tracking ID Configuration](#tracking-id-configuration)
4. [Custom Events Setup](#custom-events-setup)
5. [Conversion Goals Configuration](#conversion-goals-configuration)
6. [Dashboard Setup](#dashboard-setup)
7. [Privacy Compliance](#privacy-compliance)
8. [Testing and Verification](#testing-and-verification)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Google Account with administrative access
- Access to Google Analytics (analytics.google.com)
- Website domain ownership verification
- Basic understanding of web analytics concepts

## GA4 Property Creation

### Step 1: Create GA4 Account

1. Navigate to [Google Analytics](https://analytics.google.com)
2. Click **Admin** (gear icon in bottom left)
3. Click **Create Account**
4. Enter account details:
   - **Account Name**: Grace Fellowship Church
   - **Account Data Sharing Settings**: Review and select appropriate options
5. Click **Next**

### Step 2: Create Property

1. Enter property details:
   - **Property Name**: Grace Fellowship Church Website
   - **Reporting Time Zone**: (UTC+01:00) West Central Africa
   - **Currency**: Nigerian Naira (NGN)
2. Click **Next**

### Step 3: Configure Business Information

1. Select business details:
   - **Industry Category**: Religion & Spirituality
   - **Business Size**: Small (1-10 employees)
2. Select business objectives:
   - ✓ Examine user behavior
   - ✓ Measure customer engagement
   - ✓ Get baseline reports
3. Click **Create**
4. Accept Terms of Service

### Step 4: Set Up Data Stream

1. Select platform: **Web**
2. Enter website details:
   - **Website URL**: https://gracefellowshipchurch.org
   - **Stream Name**: Grace Fellowship Church Main Site
3. Enable **Enhanced Measurement** (recommended)
4. Click **Create Stream**
5. **Save the Measurement ID** (format: G-XXXXXXXXXX)

## Tracking ID Configuration

### Step 1: Update Analytics Configuration

1. Open `src/js/utils/analytics.js`
2. Locate the configuration section: