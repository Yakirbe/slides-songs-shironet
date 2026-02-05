---
name: webapp-testing
description: Test web applications using Playwright for browser automation. Use when testing web functionality, validating UI behavior, or performing end-to-end testing.
compatibility: Requires playwright>=1.40.0 package installed. Run `playwright install` to install browser binaries.
---

# Webapp Testing

Test web applications using Playwright for browser automation and end-to-end testing.

## When to Use

- Test web application functionality
- Validate UI behavior and interactions
- Perform end-to-end testing
- Automate browser interactions
- Test responsive design across different viewports
- Verify form submissions and navigation

## Instructions

- Use Playwright to automate browser interactions
- Test the webapp at http://localhost:8000 (or specified port)
- Verify slide navigation (arrow keys, buttons)
- Test keyboard shortcuts (space, arrow keys)
- Validate slide content rendering
- Check responsive design on different screen sizes
- Test loading states and error handling

## Example Usage

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8000")
    # Perform tests...
    browser.close()
```

## Pre-requisites

Before using this skill, ensure:
1. The webapp is running (e.g., `python -m http.server 8000`)
2. Playwright browsers are installed: `playwright install`

## Error Handling

- Verify the webapp is running before testing
- Handle network timeouts gracefully
- Provide clear error messages if tests fail
- Use the ask questions tool if you need to clarify testing requirements with the user
