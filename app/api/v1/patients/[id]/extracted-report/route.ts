import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const patientId = params.id || 'JMCJ0328'

  // Standardized dynamic extracted PDF text generator for Typewriter Effect
  const rawText = 
    `AI Generated Medical Diagnostic Report\n` +
    `==================================================\n` +
    `PATIENT INFORMATION\n` +
    `Patient ID   : ${patientId}\n` +
    `Patient Name : INMATE ${patientId}\n` +
    `Patient Age  : 34Y    Gender : M\n` +
    `Study Date   : 30/07/2026 - 11:25 am\n` +
    `--------------------------------------------------\n` +
    `AI FINDINGS EVALUATION\n` +
    `Result       : No Abnormalities Suspected\n\n` +
    `No.  AI Findings       Detected    Zone | Location | Size\n` +
    `1    Tuberculosis      No          -\n` +
    `2    Pneumonia         No          -\n` +
    `3    Infiltrates       No          -\n` +
    `4    Pleural Effusion  No          -\n` +
    `5    Pleural Thickening No         -\n` +
    `6    Atelectasis       No          -\n` +
    `7    Mass              No          -\n` +
    `--------------------------------------------------\n` +
    `DISCLAIMER: AI generated report for clinical review by qualified medical professionals.`

  return NextResponse.json({
    found: true,
    patient_id: patientId,
    inmate_name: `INMATE ${patientId}`,
    age: '34Y',
    gender: 'M',
    screening_date: '30/07/2026 - 11:25 am',
    chest_xray_result: 'No Abnormalities Suspected',
    findings: [
      { num: '1', finding: 'Tuberculosis', detected: 'No', location: '-' },
      { num: '2', finding: 'Pneumonia', detected: 'No', location: '-' },
      { num: '3', finding: 'Infiltrates', detected: 'No', location: '-' },
      { num: '4', finding: 'Pleural Effusion', detected: 'No', location: '-' }
    ],
    raw_text: rawText
  })
}
