# PDS template field audit

Compared the provided 2026 template with the PDS UI, save actions, and export mappings.

| Sheet | Template fields | UI coverage / export |
| --- | --- | --- |
| C2 | Eligibility, rating, exam date/place, license number/validity | All collected; rows 5–11, columns A/F/G/I/L/M. |
| C2 | Work dates, position, agency, salary, grade/step, appointment status, government service | All collected; rows 18–45, columns A/C/D/G/J/K/L/M. Blank end date means Present in the UI and export. Duties go to the continuation sheet. |
| C3 | Voluntary organization/address, dates, hours, position/nature | All collected; rows 6–12, columns A/E/F/G/H. |
| C3 | Training title, dates, hours, type, conducted/sponsored by | All collected; rows 18–38, columns A/E/F/G/H/I. Custom Other type is saved and exported. |
| C3 | Skills/hobbies, recognition, memberships | All collected; rows 42–48, columns A/C/I. |
| C4 | Questions 34A–40C and conditional details | All collected. YES/NO updates both VML and Excel control properties. Country codes become country names. |
| C4 | References | All collected; rows 52–54, columns A/F/G. |
| C4 | Government-issued ID type, number, date/place of issuance | Missing from the PDS UI and its structured saved data. Template fields D61, D62, D64 remain unfilled. Personal ID numbers on C1 do not identify which document was presented for the oath. |
| C4 | Date accomplished | Not collected as a PDS field. Do not assume a download date is the accomplishment date. |
| C2–C4 | Signature/date boxes; C4 photo, thumbmark, oath date/officer | No PDS capture/export workflow. These areas remain available for manual completion. Electronic submission acknowledgement is not a signature image or notarization. |

Overflow entries and full questionnaire details are preserved on the continuation sheet. No template labels, merges, border styles, or blank completion areas are removed.

C4 detail cells: 34A I11; 34B I12; 35A I15; 35B I22 (date filed J20, case status J21); 36 I25; 37 I29; 38A K32; 38B K35; 39 I39; 40A I44; 40B I46; 40C I48.

Checkbox serialization follows [Microsoft's CheckedValues definition](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.office2010.excel.checkedvalues?view=openxml-3.0.1).
