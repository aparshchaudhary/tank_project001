from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.report_generator import report_generator

router = APIRouter()

REPORT_TYPES = {
    "daily_health": {"title": "Daily Health Report", "days": 1},
    "weekly_condition": {"title": "Weekly Condition Report", "days": 7},
    "fault_diagnosis": {"title": "Fault Diagnosis Report", "days": 3},
    "component_health": {"title": "Component Health Matrix", "days": 14},
    "maintenance_recommendation": {"title": "Maintenance Recommendation Report", "days": 30}
}

@router.get("/types")
def get_report_types():
    return [
        {"key": k, "title": v["title"], "default_days": v["days"]}
        for k, v in REPORT_TYPES.items()
    ]

@router.get("/generate")
def generate_report(
    report_type: str = Query("daily_health"),
    format: str = Query("json"), # "json" or "html"
    days: Optional[int] = None,
    db: Session = Depends(get_db)
):
    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid report_type. Allowed: {list(REPORT_TYPES.keys())}")

    target_days = days or REPORT_TYPES[report_type]["days"]
    data = report_generator.gather_report_data(db, report_type, days=target_days)

    if format.lower() == "html":
        html_content = report_generator.generate_html_report(data)
        return HTMLResponse(content=html_content)

    return data

@router.get("/download-pdf")
def download_pdf_report(
    report_type: str = Query("daily_health"),
    days: Optional[int] = None,
    db: Session = Depends(get_db)
):
    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid report_type. Allowed: {list(REPORT_TYPES.keys())}")

    target_days = days or REPORT_TYPES[report_type]["days"]
    data = report_generator.gather_report_data(db, report_type, days=target_days)
    
    pdf_bytes = report_generator.generate_pdf_report(data)
    filename = f"turret_cbpm_{report_type}_{target_days}d.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
