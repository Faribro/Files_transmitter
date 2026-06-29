import { NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

const DB_PATH = process.env.DB_PATH || '/home/azureuser/medical-migration/medical_migration.db'

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY,
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const facility = searchParams.get('facility')   // AKROSS | DAVO | null=all
  const month    = searchParams.get('month')       // 2026-01 | null=all
  const drill    = searchParams.get('drill')       // patient | date | null

  try {
    const db = await getDb()

    // ── 1. Top-level summary ──────────────────────────────────────────────────
    const summary = await db.all(`
      SELECT
        UPPER(COALESCE(facility, 'UNKNOWN'))   AS facility,
        COALESCE(month,
          strftime('%Y-%m', scan_date),
          'unknown') AS month,
        migration_status                        AS status,
        COUNT(*)                                AS file_count,
        COALESCE(SUM(size_bytes), 0)            AS size_bytes,
        COUNT(DISTINCT inmate_id)               AS patient_count
      FROM file_inventory
      WHERE 1=1
        ${facility ? `AND UPPER(COALESCE(facility,'')) LIKE '%${facility.toUpperCase()}%'` : ''}
        ${month    ? `AND COALESCE(month, strftime('%Y-%m', scan_date)) = '${month}'`        : ''}
      GROUP BY facility, month, migration_status
      ORDER BY month, facility, migration_status
    `)

    // ── 2. Monthly breakdown per facility (calendar grid view) ────────────────
    const monthlyGrid = await db.all(`
      SELECT
        COALESCE(month, strftime('%Y-%m', scan_date), 'unknown') AS month,
        UPPER(COALESCE(facility, 'UNKNOWN'))                      AS facility,
        migration_status                                           AS status,
        COUNT(*)                                                   AS file_count,
        COALESCE(SUM(size_bytes), 0)                              AS size_bytes,
        COUNT(DISTINCT inmate_id)                                  AS patient_count
      FROM file_inventory
      GROUP BY month, facility, migration_status
      ORDER BY month, facility
    `)

    // ── 3. Patient-level drill-down (if month + facility selected) ────────────
    let patientDrilldown: any[] = []
    if (facility && month) {
      patientDrilldown = await db.all(`
        SELECT
          COALESCE(inmate_id, 'unknown')   AS patient_id,
          COALESCE(inmate_name, '—')       AS patient_name,
          migration_status                  AS status,
          COUNT(*)                          AS file_count,
          COALESCE(SUM(size_bytes), 0)     AS size_bytes,
          MIN(scan_date)                    AS first_scan,
          MAX(scan_date)                    AS last_scan,
          GROUP_CONCAT(DISTINCT file_type) AS file_types
        FROM file_inventory
        WHERE UPPER(COALESCE(facility,'')) LIKE '%${facility.toUpperCase()}%'
          AND COALESCE(month, strftime('%Y-%m', scan_date)) = '${month}'
        GROUP BY inmate_id, inmate_name, migration_status
        ORDER BY file_count DESC
        LIMIT 500
      `)
    }

    // ── 4. File-type breakdown ────────────────────────────────────────────────
    const fileTypes = await db.all(`
      SELECT
        UPPER(COALESCE(file_type, 'UNKNOWN'))  AS file_type,
        UPPER(COALESCE(facility, 'UNKNOWN'))   AS facility,
        migration_status                         AS status,
        COUNT(*)                                 AS count,
        COALESCE(SUM(size_bytes), 0)            AS size_bytes
      FROM file_inventory
      WHERE 1=1
        ${facility ? `AND UPPER(COALESCE(facility,'')) LIKE '%${facility.toUpperCase()}%'` : ''}
        ${month    ? `AND COALESCE(month, strftime('%Y-%m', scan_date)) = '${month}'`        : ''}
      GROUP BY file_type, facility, migration_status
      ORDER BY count DESC
    `)

    // ── 5. Verification gap summary (from verification_report.json if present) ─
    let verificationGaps = { missing: 0, size_mismatch: 0, ok: 0, total: 0, passed: false }
    try {
      const fs = await import('fs')
      const reportPath = '/home/azureuser/medical-migration/verification_report.json'
      if (fs.existsSync(reportPath)) {
        const raw = fs.readFileSync(reportPath, 'utf8')
        const rep = JSON.parse(raw)
        verificationGaps = {
          missing:      rep.missing      || 0,
          size_mismatch: rep.size_mismatch || 0,
          ok:            rep.ok           || 0,
          total:         rep.total        || 0,
          passed:        rep.passed       || false,
        }
      }
    } catch {}

    // ── 6. Canonical path readiness (reorganization progress) ─────────────────
    const canonicalCount = await db.get(`
      SELECT COUNT(*) as cnt
      FROM file_inventory
      WHERE target_path LIKE '%Prison_and_OCS_Intervention%'
        AND migration_status = 'completed'
    `)

    const totalCompleted = await db.get(`
      SELECT COUNT(*) as cnt FROM file_inventory WHERE migration_status = 'completed'
    `)

    await db.close()

    return NextResponse.json({
      summary,
      monthlyGrid,
      patientDrilldown,
      fileTypes,
      verificationGaps,
      reorganization: {
        canonical_paths: canonicalCount?.cnt || 0,
        total_completed: totalCompleted?.cnt || 0,
        percent_reorganized: totalCompleted?.cnt
          ? Math.round(((canonicalCount?.cnt || 0) / totalCompleted.cnt) * 100)
          : 0,
      },
      filters: { facility, month },
      generated_at: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })

  } catch (err: any) {
    console.error('Migration analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
