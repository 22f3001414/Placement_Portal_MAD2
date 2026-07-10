from flask import Blueprint, jsonify, request, send_file
from extensions import db
from models.models import CompanyProfile, PlacementDrive, Application, StudentProfile, User
from routes.utils import role_required, get_current_user_id
from datetime import datetime, date
from sqlalchemy import func
import os

company_bp = Blueprint('company', __name__)


def _get_company_profile():

    user_id = get_current_user_id()

    cp = CompanyProfile.query.filter_by(user_id=user_id).first()

    if not cp:
        return None, (
            jsonify({
                'error': 'Company profile not found.'
            }),
            404
        )

    user = User.query.get(cp.user_id)

    if user.is_blacklisted:
        return None, (
            jsonify({
                'error': 'Your company account has been blacklisted.'
            }),
            403
        )

    if not user.is_active:
        return None, (
            jsonify({
                'error': 'Your company account has been deactivated.'
            }),
            403
        )

    return cp, None


@company_bp.route('/dashboard', methods=['GET'])
@role_required('company')
def dashboard():
    cp, err = _get_company_profile()
    if err:
        return err

    drives = PlacementDrive.query.filter_by(company_id=cp.id).all()
    drives_data = []
    for drive in drives:
        applicant_count = Application.query.filter_by(drive_id=drive.id).count()
        drives_data.append({
            'id': drive.id,
            'job_title': drive.job_title,
            'job_description': drive.job_description,
            'eligible_branches': drive.eligible_branches,
            'min_cgpa': drive.min_cgpa,
            'eligible_years': drive.eligible_years,
            'deadline': drive.deadline.isoformat() if drive.deadline else None,
            'status': drive.status,
            'applicant_count': applicant_count,
            'created_at': drive.created_at.isoformat() if drive.created_at else None
        })

    drive_ids = [d.id for d in drives]
    if drive_ids:
        status_rows = db.session.query(
            Application.status, func.count(Application.id)
        ).filter(Application.drive_id.in_(drive_ids)).group_by(Application.status).all()
        agg = {s: c for s, c in status_rows}
    else:
        agg = {}

    return jsonify({
        'profile': {
            'id': cp.id,
            'company_name': cp.company_name,
            'hr_contact': cp.hr_contact,
            'website': cp.website,
            'approval_status': cp.approval_status
        },
        'drives': drives_data,
        'stats': {
            'applied': agg.get('applied', 0),
            'shortlisted': agg.get('shortlisted', 0),
            'selected': agg.get('selected', 0),
            'rejected': agg.get('rejected', 0),
            'total': sum(agg.values())
        }
    })


@company_bp.route('/drives', methods=['POST'])
@role_required('company')
def create_drive():
    cp, err = _get_company_profile()
    if err:
        return err

    if cp.approval_status != 'approved':
        return jsonify({'error': 'Your company account must be approved before posting drives.'}), 403

    data = request.get_json() or {}
    job_title = (data.get('job_title') or '').strip()
    job_description = (data.get('job_description') or '').strip()
    deadline_str = data.get('deadline')

    if not job_title:
        return jsonify({'error': 'Job title is required.'}), 400
    if not job_description:
        return jsonify({'error': 'Job description is required.'}), 400
    if not deadline_str:
        return jsonify({'error': 'Deadline is required.'}), 400

    try:
        deadline = datetime.fromisoformat(deadline_str)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid deadline format. Use ISO 8601.'}), 400

    if deadline.date() < date.today():
        return jsonify({'error': 'Deadline must be a future date.'}), 400

    drive = PlacementDrive(
        company_id=cp.id,
        job_title=job_title,
        job_description=job_description,
        eligible_branches=data.get('eligible_branches') or '',
        min_cgpa=float(data.get('min_cgpa') or 0.0),
        eligible_years=data.get('eligible_years') or '',
        deadline=deadline,
        status='pending'
    )
    db.session.add(drive)
    db.session.commit()
    return jsonify({'message': 'Drive created successfully.', 'drive_id': drive.id}), 201


@company_bp.route('/drives/<int:drive_id>/applications', methods=['GET'])
@role_required('company')
def drive_applications(drive_id):
    cp, err = _get_company_profile()
    if err:
        return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != cp.id:
        return jsonify({'error': 'Access denied'}), 403

    apps = db.session.query(Application, StudentProfile, User).join(
        StudentProfile, Application.student_id == StudentProfile.id
    ).join(
        User, StudentProfile.user_id == User.id
    ).filter(Application.drive_id == drive_id).all()

    result = []
    for app, sp, user in apps:
        result.append({
            'application_id': app.id,
            'student_id': sp.id,
            'name': sp.name,
            'email': user.email,
            'branch': sp.branch,
            'cgpa': sp.cgpa,
            'year': sp.year,
            'applied_date': app.applied_date.isoformat() if app.applied_date else None,
            'status': app.status,
            'resume_filename': sp.resume_filename
        })
    return jsonify(result)


@company_bp.route('/applications/<int:application_id>/status', methods=['PUT'])
@role_required('company')
def update_application_status(application_id):
    cp, err = _get_company_profile()
    if err:
        return err

    app = Application.query.get_or_404(application_id)
    drive = PlacementDrive.query.get_or_404(app.drive_id)
    if drive.company_id != cp.id:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json() or {}
    new_status = data.get('status', '').strip()
    
    interview_date = data.get('interview_date')
    interview_mode = (data.get('interview_mode') or '').strip()
    interview_location = (data.get('interview_location') or '').strip()
    interview_notes = (data.get('interview_notes') or '').strip()

    valid_transitions = {
        'applied': ['shortlisted', 'rejected'],
        'shortlisted': ['selected', 'rejected']
    }
    allowed = valid_transitions.get(app.status, [])
    if new_status not in allowed:
        return jsonify({'error': f'Cannot transition from "{app.status}" to "{new_status}".'}), 400
    
    # Interview details are required when shortlisting
    parsed_interview_date = None

    if new_status == 'shortlisted':

        if not interview_date:
            return jsonify({'error': 'Interview date is required.'}), 400

        if interview_mode not in ['Online', 'Offline']:
            return jsonify({'error': 'Interview mode must be Online or Offline.'}), 400

        if not interview_location:
            return jsonify({'error': 'Interview location/link is required.'}), 400

        try:
            parsed_interview_date = datetime.fromisoformat(interview_date)
            if parsed_interview_date <= datetime.utcnow():
                return jsonify({
                    'error': 'Interview must be scheduled for a future date and time.'
                }), 400
        except ValueError:
            return jsonify({'error': 'Invalid interview date.'}), 400

    app.status = new_status

    if new_status == 'shortlisted':
        app.interview_date = parsed_interview_date
        app.interview_mode = interview_mode
        app.interview_location = interview_location
        app.interview_notes = interview_notes
        app.interview_scheduled_at = datetime.utcnow()

    db.session.commit()
    if new_status == "shortlisted":
        from tasks.tasks import send_interview_schedule_email
        send_interview_schedule_email.delay(app.id)
    return jsonify({'message': 'Application status updated.', 'status': app.status})

@company_bp.route('/applications/<int:application_id>/resume', methods=['GET'])
@role_required('company')
def view_applicant_resume(application_id):
    cp, err = _get_company_profile()
    if err:
        return err

    application = Application.query.get_or_404(application_id)

    drive = PlacementDrive.query.get_or_404(application.drive_id)

    # Company can only access resumes for its own drives
    if drive.company_id != cp.id:
        return jsonify({'error': 'Access denied.'}), 403

    student = StudentProfile.query.get_or_404(application.student_id)

    if not student.resume_filename:
        return jsonify({'error': 'Student has not uploaded a resume.'}), 404

    resume_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'uploads',
        'resumes',
        student.resume_filename
    )

    if not os.path.exists(resume_path):
        return jsonify({'error': 'Resume file not found.'}), 404

    return send_file(
        resume_path,
        mimetype='application/pdf',
        as_attachment=False
    )