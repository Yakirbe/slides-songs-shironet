---
name: pdf-processing
description: Extract and process text content from PDF files. Use when working with PDF documents, extracting text, or converting PDF content to other formats.
compatibility: Requires pypdf>=3.0.0 package installed
---

# PDF Processing

Extract and process text content from PDF files using pypdf.

## When to Use

- Extract text from PDF documents
- Process PDF files for content analysis
- Convert PDF content to other formats
- Work with PDF metadata or structure

## Instructions

- Use the `pypdf` library to read and extract text from PDF files
- Handle PDF files that may contain multiple pages
- Extract text while preserving structure when possible
- Handle encoding issues gracefully
- Provide clear error messages if PDF processing fails

## Example Usage

```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Error Handling

- Check if the PDF file exists before processing
- Handle corrupted or encrypted PDFs gracefully
- Inform the user if text extraction fails
- Use the ask questions tool if you need to clarify PDF processing requirements with the user
