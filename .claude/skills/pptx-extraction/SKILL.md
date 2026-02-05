---
name: pptx-extraction
description: Extract text content from PowerPoint (PPTX) files using markitdown. Use when processing presentation files, extracting slide content, or converting PPTX to other formats.
compatibility: Requires markitdown>=0.0.1a26 package installed
---

# PPTX Text Extraction

Extract text content from PowerPoint (PPTX) files using markitdown.

## When to Use

- Extract text from PowerPoint presentations
- Process PPTX files for content analysis
- Convert PPTX content to markdown or other formats
- Extract slide content and notes
- Work with presentation structure

## Instructions

- Use the `markitdown` library to extract text from PPTX files
- Extract text from all slides in the presentation
- Preserve slide structure and hierarchy when possible
- Handle text in text boxes, shapes, and notes
- Extract metadata like slide titles and content

## Example Usage

```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("presentation.pptx")
text = result.text_content
```

## Error Handling

- Check if the PPTX file exists before processing
- Handle corrupted or password-protected files gracefully
- Inform the user if text extraction fails
- Use the ask questions tool if you need to clarify PPTX processing requirements with the user
