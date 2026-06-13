# OCR Workflow Notes

Use this note when importing Rolemaster pages from scanned PDFs.

## Working Method

The reliable workflow in this workspace is:

1. Use bundled Python plus `pypdf` to extract embedded page images from a scanned PDF.
2. Save the images under `_obsidian_excluded/Rolemaster 98 Scratch/<import-name>/`.
3. Use the existing local `tesseract.js` install under `_obsidian_excluded/Rolemaster 98 Scratch/ocr-node/node_modules` to OCR those images.
4. Transcribe the resulting OCR into the relevant Obsidian note, checking unclear values against adjacent OCR or page images.

## Extract Page Images

Adjust the PDF name, output folder, and page range.

```powershell
@'
from pypdf import PdfReader
from pathlib import Path

reader = PdfReader('Rolemaster - Alchemy Companion.pdf')
out = Path('_obsidian_excluded/Rolemaster 98 Scratch/alchemy-pages')
out.mkdir(parents=True, exist_ok=True)

for page_num in range(54, 58):
    page = reader.pages[page_num - 1]
    for image in page.images:
        target = out / f'page-{page_num:03d}-{image.name}'
        target.write_bytes(image.data)
        print(target)
'@ | & 'C:\Users\zeroc\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -
```

Notes:

- `pypdf` is available in the bundled Python runtime.
- Many Rolemaster PDFs are scanned. Text extraction may return nothing even when images are present.
- Some PDFs print xref or FaxDecode warnings while still extracting usable images.

## OCR Extracted Images

Adjust the folder and page list.

```powershell
$env:NODE_PATH='C:\Users\zeroc\Documents\AetherGate\_obsidian_excluded\Rolemaster 98 Scratch\ocr-node\node_modules'
@'
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

(async () => {
  const worker = await createWorker('eng');
  const dir = '_obsidian_excluded/Rolemaster 98 Scratch/alchemy-pages';

  for (const page of [54, 55, 56, 57]) {
    const prefix = `page-${String(page).padStart(3, '0')}-`;
    const file = fs.readdirSync(dir).find((name) => name.startsWith(prefix));
    if (!file) continue;

    const { data: { text } } = await worker.recognize(path.join(dir, file));
    console.log(`--- PAGE ${page} ${file} ---`);
    console.log(text);
  }

  await worker.terminate();
})();
'@ | node
```

## Useful Checks

For scanned PDFs, first confirm whether pages contain extractable text or embedded images:

```powershell
@'
from pypdf import PdfReader

reader = PdfReader('Rolemaster - ICE5800 - Rolemaster Fantasy Role Playing.pdf')
for page_num in range(90, 101):
    page = reader.pages[page_num - 1]
    text = page.extract_text() or ''
    images = list(page.images)
    print(page_num, 'text chars:', len(text), 'images:', len(images))
'@ | & 'C:\Users\zeroc\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -
```

## Things That Did Not Work Reliably

- `pdfjs-dist` did not find useful text in scanned Rolemaster pages.
- The local `_obsidian_excluded/Rolemaster 98 Scratch/pymupdf` package was present, but Windows denied direct import access to `fitz`.
- The in-process Node REPL helper crashed under the Windows sandbox during this OCR work. Regular shell commands with bundled Python/Node worked.

## Import Hygiene

- Keep extracted images and scratch OCR under `_obsidian_excluded/Rolemaster 98 Scratch/`.
- Do not unpack, replace, or remove source ZIP files or PDFs unless explicitly requested.
- When OCR is uncertain, prefer marking the note with a source reference or checking neighboring pages/images rather than inventing values.
- After editing Rolemaster notes used by the character creator, run `npm run build` in `apps/character-creator` to regenerate app data.
