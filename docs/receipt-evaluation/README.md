# Receipt extraction evaluation

## Question

Can the configured receipt-extraction path correctly propose the five fields an employee needs, and does it fail visibly when it cannot?

## Dataset

`dataset.json` contains three labelled template/anonymized files already present in the repository. No real employee or company data is used. Two PNG entries are byte-identical copies; the SVG is a second template. Labels were read manually from the visible receipts.

Fields evaluated: merchant, total amount, currency, transaction date, and category.

This is a small pipeline evaluation. Duplicate inputs are retained and disclosed because the repository does not yet contain a broad consented receipt corpus.

## Scoring

- Merchant, currency, and category use case-insensitive alphanumeric normalization and otherwise require exact agreement.
- Amount requires exact decimal equality.
- Date requires exact `YYYY-MM-DD` equality.
- Every field from a fallback response counts as incorrect, even if a placeholder happens to resemble the label.
- Overall accuracy is correct fields divided by all evaluated fields.

## Recorded run

- Date: 17 July 2026
- Receipts/files: 3 (2 unique templates)
- Fields: 5 per file, 15 comparisons
- Provider/model: recorded in `results.json`
- Overall field accuracy: **66.7% (10/15)**
- Per-field accuracy: **66.7% for each field**

The two PNG runs were correct on every field. The SVG used fallback and contributed five failures. The fallback correctly set `requiresReview` and returned a warning.

## Common and anticipated failure cases

- unsupported or provider-rejected formats such as SVG;
- blurry, cropped, rotated, low-contrast, or handwritten receipts;
- multiple totals, currencies, or dates on one document;
- ambiguous merchant legal names and subjective categories;
- provider outage, timeout, invalid credentials, malformed JSON, or schema drift.

## Uncertainty and fallback behavior

The provider does not supply a calibrated confidence value for every field. VeriSpend does not manufacture one. Missing or invalid fields produce warnings and `requiresReview: true`. Provider failure returns blank merchant/currency, zero amount, category `Other`, and a warning. The employee must enter and verify the values before creating a draft.

## Reproduce

Configure the ignored `server/appsettings.Development.json`, then run from the repository root:

```powershell
dotnet run --project tools/ReceiptEvaluator/ReceiptEvaluator.csproj -- docs/receipt-evaluation/dataset.json docs/receipt-evaluation/results.json
```

The runner calls the same `AiReceiptService` used by the API, writes raw expected/actual values, and calculates field-level and overall accuracy. Never commit API keys.

## Next dataset milestone

Replace duplicate templates with at least 50 consented, anonymized, or synthetic receipts spanning vendors, currencies, layouts, image quality, and failure cases. Have a second reviewer validate labels, report confidence intervals, and separate OCR accuracy from subjective category accuracy.
