# Skills from Anthropics Skills Repository

This directory contains skills from the [Anthropics Skills repository](https://github.com/anthropics/skills) that have been integrated into this project.

## Available Skills

### 1. PPTX Skill (`pptx/`)
**Purpose**: Presentation creation, editing, and analysis

**Capabilities**:
- Creating new PowerPoint presentations
- Modifying or editing existing presentations
- Working with layouts, themes, and designs
- Adding comments or speaker notes
- Converting HTML to PPTX
- Analyzing presentation structure

**Key Files**:
- `SKILL.md` - Main skill documentation
- `scripts/` - Python and JavaScript scripts for PPTX operations
- `ooxml/` - Office Open XML processing tools

**Usage**: See `pptx/SKILL.md` for detailed instructions

### 2. PDF Skill (`pdf/`)
**Purpose**: Comprehensive PDF manipulation toolkit

**Capabilities**:
- Extracting text and tables from PDFs
- Creating new PDFs
- Merging and splitting PDF documents
- Handling and filling PDF forms
- Converting PDFs to images
- Analyzing PDF structure

**Key Files**:
- `SKILL.md` - Main skill documentation
- `forms.md` - PDF form handling guide
- `reference.md` - Advanced features and examples
- `scripts/` - Python scripts for PDF operations

**Usage**: See `pdf/SKILL.md` for detailed instructions

### 3. Webapp Testing Skill (`webapp-testing/`)
**Purpose**: Toolkit for interacting with and testing web applications

**Capabilities**:
- Testing local web applications using Playwright
- Verifying frontend functionality
- Debugging UI behavior
- Capturing browser screenshots
- Viewing browser logs
- Managing server lifecycle for testing

**Key Files**:
- `SKILL.md` - Main skill documentation
- `scripts/with_server.py` - Server lifecycle management
- `examples/` - Example automation scripts

**Usage**: See `webapp-testing/SKILL.md` for detailed instructions

## Integration

These skills are now available for use in this project. Each skill contains:
- `SKILL.md` - Complete documentation and instructions
- `scripts/` - Helper scripts and tools
- `LICENSE.txt` - License information

## Dependencies

Make sure to install required dependencies for each skill:

**PPTX**:
- Python libraries for Office Open XML processing
- Node.js for html2pptx conversion

**PDF**:
- `pypdf` or similar PDF libraries
- See `pdf/SKILL.md` for full list

**Webapp Testing**:
- `playwright` - Browser automation
- See `webapp-testing/SKILL.md` for setup

## License

Each skill includes its own LICENSE.txt file. Please review the license terms before use.

## Source

These skills were obtained from:
https://github.com/anthropics/skills
