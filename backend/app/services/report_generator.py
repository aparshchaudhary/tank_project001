import io
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.models.all_models import Subsystem, HealthIndexRecord, Alert, AnomalyEvent, MaintenanceEvent

class ReportGenerator:
    @staticmethod
    def gather_report_data(db: Session, report_type: str, days: int = 1) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(days=days)

        subsystems = db.query(Subsystem).all()
        alerts = db.query(Alert).filter(Alert.timestamp >= start_time).order_by(Alert.timestamp.desc()).all()
        anomalies = db.query(AnomalyEvent).filter(AnomalyEvent.timestamp >= start_time).order_by(AnomalyEvent.timestamp.desc()).all()
        maintenance = db.query(MaintenanceEvent).filter(MaintenanceEvent.created_at >= start_time).order_by(MaintenanceEvent.created_at.desc()).all()

        subsystem_summaries = []
        for sub in subsystems:
            latest_health = db.query(HealthIndexRecord).filter(
                HealthIndexRecord.subsystem_id == sub.id
            ).order_by(HealthIndexRecord.timestamp.desc()).first()

            sub_alerts = [a for a in alerts if a.subsystem_id == sub.id]
            sub_anomalies = [an for an in anomalies if an.subsystem_id == sub.id]

            subsystem_summaries.append({
                "id": sub.id,
                "code": sub.code,
                "name": sub.name,
                "category": sub.category,
                "operating_hours": sub.operating_hours,
                "operating_cycles": sub.operating_cycles,
                "current_health_index": latest_health.health_index if latest_health else sub.current_health_index,
                "status_band": latest_health.status_band if latest_health else "HEALTHY",
                "alert_count": len(sub_alerts),
                "anomaly_count": len(sub_anomalies)
            })

        avg_health = 100.0
        if subsystem_summaries:
            avg_health = round(sum(s["current_health_index"] for s in subsystem_summaries) / len(subsystem_summaries), 2)

        return {
            "title": f"TURRET CBPM — {report_type.replace('_', ' ').title()}",
            "report_type": report_type,
            "generated_at": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "period_days": days,
            "overall_health_index": avg_health,
            "formula_version": "HI-WeightedDev-v1.0",
            "model_version": "Statistical-kSigma-v1.0",
            "subsystems": subsystem_summaries,
            "alerts": [
                {
                    "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M"),
                    "feature": a.feature_name,
                    "severity": a.severity,
                    "probable_issue": a.probable_issue,
                    "status": a.status
                }
                for a in alerts[:20]
            ],
            "anomalies": [
                {
                    "timestamp": an.timestamp.strftime("%Y-%m-%d %H:%M"),
                    "feature": an.feature_name,
                    "severity": an.severity,
                    "fault_diagnosis": an.fault_diagnosis,
                    "score": an.anomaly_score
                }
                for an in anomalies[:20]
            ],
            "maintenance": [
                {
                    "created_at": m.created_at.strftime("%Y-%m-%d %H:%M"),
                    "event_type": m.event_type,
                    "priority": m.maintenance_priority,
                    "description": m.description,
                    "recommendations": m.recommendations
                }
                for m in maintenance[:20]
            ]
        }

    @classmethod
    def generate_html_report(cls, data: Dict[str, Any]) -> str:
        sub_rows = "".join([
            f"""<tr>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">{s['name']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">{s['category']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155; font-weight: bold; color: {'#10b981' if s['current_health_index'] >= 75 else '#f59e0b' if s['current_health_index'] >= 50 else '#ef4444'};">{s['current_health_index']}%</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">{s['status_band']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">{s['alert_count']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">{s['operating_hours']} hrs</td>
            </tr>"""
            for s in data["subsystems"]
        ])

        alert_rows = "".join([
            f"""<tr>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{a['timestamp']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155; font-weight: bold; color: {'#ef4444' if a['severity'] == 'CRITICAL' else '#f59e0b'};">{a['severity']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{a['feature']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{a['probable_issue']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{a['status']}</td>
            </tr>"""
            for a in data["alerts"]
        ]) or "<tr><td colspan='5' style='padding: 8px; color: #94a3b8;'>No alerts during this observation window.</td></tr>"

        maint_rows = "".join([
            f"""<tr>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{m['created_at']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155; font-weight: bold;">{m['event_type']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{m['priority']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{m['description']}</td>
                <td style="padding: 6px; border-bottom: 1px solid #334155;">{m['recommendations']}</td>
            </tr>"""
            for m in data["maintenance"]
        ]) or "<tr><td colspan='5' style='padding: 8px; color: #94a3b8;'>No maintenance events logged during this period.</td></tr>"

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{data['title']}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 30px; margin: 0; }}
        .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }}
        .badge {{ background-color: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }}
        .kpi-container {{ display: flex; gap: 20px; margin-bottom: 30px; }}
        .kpi-card {{ background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 15px 20px; flex: 1; }}
        .kpi-title {{ font-size: 12px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; }}
        .kpi-value {{ font-size: 28px; font-weight: 800; margin-top: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; background: #111827; border-radius: 6px; overflow: hidden; border: 1px solid #1f2937; }}
        th {{ background: #1f2937; color: #94a3b8; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; }}
        h2 {{ font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; margin-top: 30px; margin-bottom: 12px; }}
        .disclaimer {{ background: rgba(30, 41, 59, 0.7); border-left: 4px solid #f59e0b; padding: 12px 16px; margin-top: 40px; font-size: 12px; color: #cbd5e1; }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="badge">LABORATORY / TEST-BENCH PROTOTYPE</div>
            <h1 style="margin: 8px 0 4px 0; font-size: 24px; letter-spacing: 0.03em;">{data['title']}</h1>
            <div style="font-size: 13px; color: #94a3b8;">Generated: {data['generated_at']} | Window: Last {data['period_days']} Day(s)</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 12px; color: #94a3b8;">Model Version: <span style="color: #38bdf8;">{data['model_version']}</span></div>
            <div style="font-size: 12px; color: #94a3b8;">Formula: <span style="color: #38bdf8;">{data['formula_version']}</span></div>
        </div>
    </div>

    <div class="kpi-container">
        <div class="kpi-card">
            <div class="kpi-title">Overall Health Index</div>
            <div class="kpi-value" style="color: {'#10b981' if data['overall_health_index'] >= 75 else '#f59e0b' if data['overall_health_index'] >= 50 else '#ef4444'};">{data['overall_health_index']}%</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title">Monitored Subsystems</div>
            <div class="kpi-value" style="color: #38bdf8;">{len(data['subsystems'])}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title">Recorded Alerts</div>
            <div class="kpi-value" style="color: #f59e0b;">{len(data['alerts'])}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title">Maintenance Actions</div>
            <div class="kpi-value" style="color: #a855f7;">{len(data['maintenance'])}</div>
        </div>
    </div>

    <h2>Subsystem Health Matrix</h2>
    <table>
        <thead>
            <tr>
                <th>Subsystem</th>
                <th>Category</th>
                <th>Health Index</th>
                <th>Status Band</th>
                <th>Active Alerts</th>
                <th>Operating Hours</th>
            </tr>
        </thead>
        <tbody>
            {sub_rows}
        </tbody>
    </table>

    <h2>Recent Condition Alerts</h2>
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Feature / Sensor</th>
                <th>Probable Condition</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {alert_rows}
        </tbody>
    </table>

    <h2>Maintenance & Inspection Actions</h2>
    <table>
        <thead>
            <tr>
                <th>Date / Time</th>
                <th>Action Type</th>
                <th>Priority</th>
                <th>Description</th>
                <th>Recommendations</th>
            </tr>
        </thead>
        <tbody>
            {maint_rows}
        </tbody>
    </table>

    <div class="disclaimer">
        <strong>IMPORTANT NOTICE:</strong> This is a SOFTWARE-ONLY condition-based maintenance decision-support report for a laboratory/test-bench prototype. This report contains no weapon-control, targeting, or tactical directives. Health index bands and fault classifications are illustrative and subject to OEM qualification.
    </div>
</body>
</html>"""

    @classmethod
    def generate_pdf_report(cls, data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=6
        )
        sub_style = ParagraphStyle(
            'SubStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor("#475569"),
            spaceAfter=14
        )
        h2_style = ParagraphStyle(
            'H2Style',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor("#1e40af"),
            spaceBefore=10,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor("#1e293b")
        )

        elements.append(Paragraph(f"TURRET CBPM — {data['title']}", title_style))
        elements.append(Paragraph(
            f"Generated: {data['generated_at']} | Period: Last {data['period_days']} Day(s) | Overall Health Index: {data['overall_health_index']}%",
            sub_style
        ))

        # Subsystems Table
        elements.append(Paragraph("Subsystem Health Summary", h2_style))
        sub_table_data = [["Subsystem", "Category", "Health", "Status Band", "Hours"]]
        for s in data["subsystems"]:
            sub_table_data.append([
                s["name"],
                s["category"],
                f"{s['current_health_index']}%",
                s["status_band"],
                f"{s['operating_hours']} hrs"
            ])
        t_sub = Table(sub_table_data, colWidths=[160, 90, 60, 140, 80])
        t_sub.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t_sub)
        elements.append(Spacer(1, 14))

        # Alerts Table
        elements.append(Paragraph("Recent Condition Alerts", h2_style))
        alert_table_data = [["Timestamp", "Severity", "Feature", "Probable Issue", "Status"]]
        if data["alerts"]:
            for a in data["alerts"][:10]:
                alert_table_data.append([
                    a["timestamp"],
                    a["severity"],
                    a["feature"],
                    a["probable_issue"][:35],
                    a["status"]
                ])
        else:
            alert_table_data.append(["No alerts recorded during this window", "", "", "", ""])

        t_alert = Table(alert_table_data, colWidths=[90, 60, 110, 200, 70])
        t_alert.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t_alert)
        elements.append(Spacer(1, 14))

        # Disclaimer
        disclaimer_text = (
            "NOTICE: Laboratory/test-bench prototype condition-monitoring report. "
            "Contains no weapon-control logic. All recommendations are restricted to mechanical/electrical inspection."
        )
        elements.append(Paragraph(disclaimer_text, sub_style))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

report_generator = ReportGenerator()
