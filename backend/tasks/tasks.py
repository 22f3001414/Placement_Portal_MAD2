import csv
import os
from datetime import datetime, timedelta

from app import celery


# ── Job a: Daily drive reminders ──────────────────────────────────────────

@celery.task(name='tasks.tasks.send_drive_reminders')
def send_drive_reminders():
    """Notify students about drives closing within 3 days."""
    from models.models import StudentProfile, PlacementDrive, Application, User

    now = datetime.utcnow()
    cutoff = now + timedelta(days=3)

    upcoming = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline >= now,
        PlacementDrive.deadline <= cutoff
    ).all()

    count = 0
    for drive in upcoming:
        for sp in StudentProfile.query.all():
            already = Application.query.filter_by(student_id=sp.id, drive_id=drive.id).first()
            if not already:
                user = User.query.get(sp.user_id)
                print(
                    f'[REMINDER] To: {user.email} | '
                    f'Drive: "{drive.job_title}" | '
                    f'Deadline: {drive.deadline.date()}'
                )
                count += 1

    msg = f'[send_drive_reminders] Sent {count} reminder(s).'
    print(msg)
    return msg


# ── Job b: Monthly HTML activity report for admin ─────────────────────────

@celery.task(name='tasks.tasks.send_monthly_report')
def send_monthly_report():
    """Generate HTML monthly placement report for admin. Scheduled 1st of every month."""
    from models.models import PlacementDrive, Application

    now = datetime.utcnow()
    total_drives = PlacementDrive.query.count()
    total_applied = Application.query.count()
    total_selected = Application.query.filter_by(status='selected').count()
    total_shortlisted = Application.query.filter_by(status='shortlisted').count()
    total_rejected = Application.query.filter_by(status='rejected').count()

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Monthly Placement Report</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
  <h2 style="color:#333">Monthly Placement Activity Report</h2>
  <p style="color:#666">Generated: {now.strftime('%B %Y')} | {now.strftime('%Y-%m-%d %H:%M UTC')}</p>
  <hr>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#f4f4f4">
      <th style="padding:10px;text-align:left;border:1px solid #ddd">Metric</th>
      <th style="padding:10px;text-align:right;border:1px solid #ddd">Count</th>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd">Total Placement Drives</td>
      <td style="padding:10px;text-align:right;border:1px solid #ddd">{total_drives}</td>
    </tr>
    <tr style="background:#f9f9f9">
      <td style="padding:10px;border:1px solid #ddd">Total Applications</td>
      <td style="padding:10px;text-align:right;border:1px solid #ddd">{total_applied}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd">Students Shortlisted</td>
      <td style="padding:10px;text-align:right;border:1px solid #ddd">{total_shortlisted}</td>
    </tr>
    <tr style="background:#f9f9f9">
      <td style="padding:10px;border:1px solid #ddd">Students Selected</td>
      <td style="padding:10px;text-align:right;border:1px solid #ddd;color:green;font-weight:bold">{total_selected}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd">Applications Rejected</td>
      <td style="padding:10px;text-align:right;border:1px solid #ddd;color:red">{total_rejected}</td>
    </tr>
  </table>
  <p style="color:#999;font-size:12px;margin-top:20px">Placement Portal — Auto-generated report</p>
</body>
</html>"""

    os.makedirs('reports', exist_ok=True)
    filename = f'reports/monthly_report_{now.strftime("%Y_%m")}.html'
    with open(filename, 'w') as f:
        f.write(html)

    print(f'[MONTHLY REPORT] Saved: {filename}')
    print(f'[MONTHLY REPORT] Stats: drives={total_drives}, applied={total_applied}, selected={total_selected}')
    return f'Report saved: {filename}'


# ── Job c: User-triggered — export student's own applications as CSV ───────

@celery.task(name='tasks.tasks.export_student_applications')
def export_student_applications(student_id):
    """Triggered from student dashboard. Exports that student's application history as CSV."""
    from models.models import Application, PlacementDrive, CompanyProfile, StudentProfile
    from extensions import db

    sp = StudentProfile.query.get(student_id)
    if not sp:
        return {'error': 'Student not found'}

    rows = db.session.query(Application, PlacementDrive, CompanyProfile).join(
        PlacementDrive, Application.drive_id == PlacementDrive.id
    ).join(
        CompanyProfile, PlacementDrive.company_id == CompanyProfile.id
    ).filter(Application.student_id == student_id).all()

    os.makedirs('exports', exist_ok=True)
    filename = f'exports/applications_student_{student_id}.csv'

    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Student ID', 'Company Name', 'Drive Title', 'Application Status', 'Applied Date'])
        for app, drive, cp in rows:
            writer.writerow([
                sp.id,
                cp.company_name,
                drive.job_title,
                app.status,
                app.applied_date.date() if app.applied_date else ''
            ])

    print(f'[EXPORT] Student {student_id}: {len(rows)} record(s) → {filename}')
    return {'file': filename, 'count': len(rows)}


# ── Auto-close expired drives (bonus utility job) ─────────────────────────

@celery.task(name='tasks.tasks.close_expired_drives')
def close_expired_drives():
    """Auto-close approved drives whose deadline has passed."""
    from models.models import PlacementDrive
    from extensions import db

    expired = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline < datetime.utcnow()
    ).all()
    for drive in expired:
        drive.status = 'closed'
    db.session.commit()

    msg = f'[close_expired_drives] Closed {len(expired)} drive(s).'
    print(msg)
    return msg
