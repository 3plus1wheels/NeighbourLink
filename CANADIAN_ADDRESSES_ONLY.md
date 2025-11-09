# NeighbourLink - Canadian Addresses Only

## Overview
The address verification system is now simplified to support **Canadian addresses only**.

## Supported Address Format

### Canadian Address Format
```
[Street Number] [Street Name] [Street Type] [Direction]
[City], [Province] [Postal Code]
```

**Example:**
```
4248 40 Avenue Northwest
Calgary, AB T3A 0X1
```

## Canadian Provinces Supported

| Full Name | Abbreviation |
|-----------|--------------|
| Alberta | AB |
| British Columbia | BC |
| Manitoba | MB |
| New Brunswick | NB |
| Newfoundland and Labrador | NL |
| Northwest Territories | NT |
| Nova Scotia | NS |
| Nunavut | NU |
| Ontario | ON |
| Prince Edward Island | PE |
| Quebec | QC |
| Saskatchewan | SK |
| Yukon | YT |

## Postal Code Format

Canadian postal codes follow the format: **A1A 1A1**
- Letter-Digit-Letter space Digit-Letter-Digit
- Example: T3A 0X1, M5H 1H1, V6B 1A1

The system accepts postal codes with or without spaces.

## Common Canadian Street Types

The system recognizes and normalizes these street types:

| Full Name | Abbreviation |
|-----------|--------------|
| Street | St |
| Avenue | Ave |
| Road | Rd |
| Boulevard | Blvd |
| Lane | Ln |
| Drive | Dr |
| Court | Ct |
| Place | Pl |
| Crescent | Cres |
| Circle | Cir |
| Terrace | Ter |

## Directional Abbreviations

| Full Name | Abbreviation |
|-----------|--------------|
| Northwest | NW |
| Northeast | NE |
| Southwest | SW |
| Southeast | SE |
| North | N |
| South | S |
| East | E |
| West | W |

## Verification Logic

### Component Weights
1. **Street Address**: 40%
2. **Postal Code**: 30%
3. **City**: 20%
4. **Province**: 10%

### Confidence Threshold
- **Minimum required**: 80%
- Verification passes only if total confidence ≥ 80%

### What Gets Checked

#### 1. Street Address (40% weight)
- Direct match: Full street address appears in document
- Partial match: Street number + key words found
- Fuzzy match: Similar street addresses found
- Minimum score: 70% if street number found

#### 2. Postal Code (30% weight)
- Checks multiple formats:
  - With space: "T3A 0X1"
  - Without space: "T3A0X1"
  - First 3 characters (FSA): "T3A"
- Most reliable identifier for Canadian addresses

#### 3. City (20% weight)
- Direct match: City name appears in document
- Partial match: Parts of city name found

#### 4. Province (10% weight)
- Checks both full name and abbreviation
- Example: "Alberta" or "AB" both accepted

## Example Verification

### Document Contains:
```
MR BACH PHANHOANG
4248 40 AVE NW UNIT 4248
CALGARY, AB T3A 0X1
```

### User Claims:
```
Street: 4248 40 Avenue Northwest
City: Calgary
Province: Alberta
Postal Code: T3A 0X1
```

### Verification Process:
```
✓ Street found: "4248 40 AVE NW" matches "4248 40 Avenue Northwest"
  → Score: 70% (partial match with street number)
  → Weighted: 70% × 40% = 28%

✓ City found: "CALGARY" matches "Calgary"
  → Score: 100%
  → Weighted: 100% × 20% = 20%

✓ Province found: "AB" matches "Alberta"
  → Score: 100%
  → Weighted: 100% × 10% = 10%

✓ Postal Code found: "T3A 0X1" matches "T3A 0X1"
  → Score: 100%
  → Weighted: 100% × 30% = 30%

TOTAL CONFIDENCE: 28% + 20% + 10% + 30% = 88%
RESULT: ✓ VERIFIED (88% ≥ 80%)
```

## Accepted Documents

### Valid Document Types
1. **Bank Statements**
2. **Utility Bills** (electricity, gas, water, internet)
3. **Credit Card Statements**
4. **Government Mail** (CRA, Service Canada)
5. **Insurance Documents**
6. **Property Tax Bills**

### Document Requirements
- Must show **full residential address**
- Address must be **clearly visible**
- Document must be recent (system doesn't check date, but recommended)
- Must be **JPG, PNG** format

### Not Accepted
- ❌ PO Box addresses
- ❌ Business addresses (unless residential)
- ❌ Mail forwarding addresses

## Technical Implementation

### Text Extraction
- Uses AWS Textract **AnalyzeDocument** API
- Extracts text from tables and forms
- Scans **entire document** (not just first page)
- Finds **all addresses** in document

### Address Matching
1. **Normalize** both claimed and extracted addresses
2. **Compare** each component individually
3. **Find** all addresses in document
4. **Score** each found address against claimed address
5. **Use** the best match

### Canadian-Specific Features
- Recognizes Canadian postal code format (A1A 1A1)
- Maps all 13 provinces/territories
- Handles French Canadian addresses (Quebec)
- Supports bilingual street names

## Why Canada Only?

### Simplified System
- Single postal code format (vs. multiple international formats)
- Consistent address structure
- Well-defined province abbreviations

### Better Accuracy
- Tailored regex patterns for Canadian addresses
- Optimized for Canadian document formats
- Reduced false positives from international formats

### Future Expansion
If needed, the system can be expanded to support:
- United States (ZIP codes)
- Other countries with structured postal systems

## Testing Your Address

### Quick Test
1. Go to registration page
2. Enter your Canadian address via Google Places
3. Upload a household document (bank statement, utility bill)
4. System will scan and compare

### Check Backend Logs
The terminal will show:
```
✓ Street address found
✓ City found: Calgary
✓ Province found: Alberta (matched as 'AB')
✓ Postal code found: T3A 0X1
TOTAL CONFIDENCE: 88%
RESULT: ✓ VERIFIED
```

## Troubleshooting

### "Province NOT found"
- Check if document shows province abbreviation (AB, ON, BC, etc.)
- System checks both full name and abbreviation

### "Postal code NOT found"
- Ensure postal code is visible in document
- Check for OCR errors (O vs 0, I vs 1)
- System is flexible with spaces

### "Street address confidence low"
- Ensure street number is visible
- Check if full street name appears
- Look for directional abbreviations (NW, NE, etc.)

### Confidence Below 80%
Common causes:
1. Poor document quality (blurry scan)
2. Address partially visible
3. Different address format (apartment number missing)
4. OCR misread characters

**Solution**: Upload clearer document or try different document type

## Support

For verification issues:
1. Check backend terminal logs for detailed output
2. Verify document shows complete address
3. Ensure address format matches Canadian standard
4. Try different document if first fails

## Privacy & Security

- Documents are **not stored** permanently
- Only used for real-time verification
- Extracted text discarded after verification
- AWS Textract is PIPEDA compliant for Canadian data
