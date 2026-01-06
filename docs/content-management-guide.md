# Content Management Guide

## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Managing Events](#managing-events)
- [Managing Ministry Content](#managing-ministry-content)
- [Managing Leadership Profiles](#managing-leadership-profiles)
- [Image Management](#image-management)
- [Publishing Changes](#publishing-changes)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## Introduction

Welcome to the Grace Fellowship Church website content management guide. This document provides step-by-step instructions for updating website content without requiring technical expertise. All content is stored in JSON files that can be edited with any text editor.

**Important:** Always make a backup copy of files before editing them.

## Getting Started

### Prerequisites
- Text editor (Notepad, TextEdit, or VS Code recommended)
- Access to the website repository
- Basic understanding of JSON format

### File Locations
All content files are located in the `src/data/` directory:
- Events: `src/data/events.json`
- Ministry content: `src/data/ministries/[ministry-name].json`
- SEO metadata: `src/data/seo-meta.json`

### JSON Format Basics
JSON files use a structured format with key-value pairs: