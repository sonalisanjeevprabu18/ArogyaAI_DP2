import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      },
      `You are a medical document reader specializing in handwritten clinical notes. 
      
Your task has TWO parts:

PART 1 — FULL TEXT EXTRACTION:
Read EVERY word visible in this document, including:
- Printed headers, clinic name, doctor details
- Handwritten notes, diagnoses, prescriptions
- Dates, names, numbers

Output this as JSON field "extracted_text" — preserve original line structure.

PART 2 — FORMATTED HEALTH SUMMARY:
Create a clean, patient-friendly summary with these sections (only include sections that have content):
- **Patient Info**: Name, Age/Sex, Date of Visit
- **Doctor**: Name and qualifications  
- **Chief Complaint**: Why the patient visited (in simple words)
- **Examination Findings**: What the doctor observed
- **Diagnosis**: What the doctor concluded (in plain English, avoiding scary medical jargon)
- **Investigations Ordered**: Any tests ordered (X-ray, blood tests, etc.)
- **Advice / Next Steps**: What the patient should do

Write each section in warm, simple, reassuring language. Never use alarming phrasing.

Respond ONLY with valid JSON:
{
  "extracted_text": "...",
  "formatted_summary": "...",
  "confidence": 95
}`,
    ]);

    const text = result.response.text().trim();
    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Gemini OCR error:', err);
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
  }
}
