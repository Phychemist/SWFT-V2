# PDF Template Storage Guide

## Current Implementation (MVP)

The test requisition form template is stored in:
```
public/templates/test_requisition_form.pdf
```

This file is served statically by Next.js and downloaded when managers assign tickets to field executives.

## Why This Location?

**Pros:**
- ✅ Simple - no additional infrastructure needed
- ✅ Fast - served directly by Next.js
- ✅ Version controlled with code
- ✅ No database queries needed

**Cons:**
- ❌ Requires code deployment to update the PDF
- ❌ Not suitable for user-uploaded templates
- ❌ Harder to maintain multiple versions

## Future Recommendations

When you're ready to implement **pre-filled PDFs** with ticket data:

### Option 1: Supabase Storage (Recommended)
**Best for:** Production with dynamic templates

**Setup:**
1. Create a bucket in Supabase Storage called `templates`
2. Upload `test_requisition_form.pdf` to the bucket
3. Update the download code to fetch from Supabase
4. Use `pdf-lib` to fill in form fields with ticket data

**Advantages:**
- Update templates without code deployment
- Support multiple template versions
- Easy to add template management UI
- Can store user-uploaded templates

**Example Code:**
```typescript
import { createClient } from '@/lib/supabase-client'
import { PDFDocument } from 'pdf-lib'

const supabase = createClient()
const { data } = await supabase.storage
  .from('templates')
  .download('test_requisition_form.pdf')

// Load and fill PDF
const pdfDoc = await PDFDocument.load(await data.arrayBuffer())
const form = pdfDoc.getForm()
form.getTextField('patient_name').setText(ticketData.patientName)
// ... fill other fields
```

### Option 2: Keep in `public/` for Now
**Best for:** MVP, templates rarely change

This is what we're using currently. It works well if:
- The template doesn't change often
- You don't need dynamic template selection
- You're OK with code deployments for template updates

## Migration Path

When ready to switch to Supabase Storage:

1. **Install pdf-lib:**
   ```bash
   npm install pdf-lib
   ```

2. **Create Supabase bucket:**
   - Go to Supabase Dashboard → Storage
   - Create new bucket: `templates`
   - Upload your PDF

3. **Update download function** in `DownloadRequiredModal.tsx`

4. **Remove PDF from `public/templates/`** (keep in git history)

## File Organization

```
seragen/
├── public/
│   └── templates/              # Current location
│       └── test_requisition_form.pdf
├── docs/
│   └── PDF_TEMPLATE_STORAGE.md # This file
└── [future] supabase storage bucket: templates/
    ├── test_requisition_form.pdf
    ├── diagnostic_requisition_v2.pdf
    └── therapeutic_requisition.pdf
```

## Notes

- The current implementation downloads the static PDF with a custom filename that includes the ticket UID
- For pre-filling, you'll need a PDF with form fields (fillable PDF)
- The current PDF may or may not have form fields - if not, you'll need to recreate it with form fields using Adobe Acrobat or similar tools
