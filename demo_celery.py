from app import flask_app

with flask_app.app_context():

    from models.models import StudentProfile, Application
    from tasks.tasks import (
        send_drive_reminders,
        send_monthly_report,
        export_student_applications,
        close_expired_drives,
        send_interview_schedule_email,
    )

    print("=" * 60)
    print("Placement Portal - Celery Demo")
    print("=" * 60)

    # --------------------------------------------------
    # 1. Drive Reminder Emails
    # --------------------------------------------------
    print("\n[1] Triggering Drive Reminder Emails...")
    send_drive_reminders.delay()

    # --------------------------------------------------
    # 2. Monthly Report
    # --------------------------------------------------
    print("[2] Triggering Monthly Report...")
    send_monthly_report.delay()

    # --------------------------------------------------
    # 3. Student CSV Export
    # --------------------------------------------------
    student = StudentProfile.query.first()

    if student:
        print(f"[3] Exporting CSV for Student ID {student.id}...")
        export_student_applications.delay(student.id)
    else:
        print("[3] No student found. Skipping CSV export.")

    # --------------------------------------------------
    # 4. Auto-close Expired Drives
    # --------------------------------------------------
    print("[4] Triggering Close Expired Drives...")
    close_expired_drives.delay()

    # --------------------------------------------------
    # 5. Interview Email
    # --------------------------------------------------
    application = Application.query.filter_by(status="shortlisted").first()

    if application:
        print(
            f"[5] Sending Interview Email for Application {application.id}..."
        )
        send_interview_schedule_email.delay(application.id)
    else:
        print("[5] No shortlisted application found. Skipping interview email.")

    print("\nAll Celery tasks have been submitted.")
    print("Check the Celery Worker terminal.")