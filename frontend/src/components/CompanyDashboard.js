const CompanyDashboard = {
  name: 'CompanyDashboard',
  components: { Navbar },
  data() {
    return {
      userEmail: '',
      loading: true,
      profile: null,
      drives: [],

      // Create drive form
      showForm: false,
      formLoading: false,
      formMsg: { text: '', type: '' },
      form: {
        job_title: '',
        job_description: '',
        eligible_branches: '',
        min_cgpa: '',
        eligible_years: '',
        deadline: ''
      },

      // Applicants panel
      selectedDrive: null,
      applicants: [],
      applicantsLoading: false,
      applicantMsg: { text: '', type: '' },

      pageMsg: { text: '', type: '' }
    }
  },
  template: `
    <div>
      <Navbar role="company" :userEmail="userEmail" />

      <div class="container-fluid py-4 px-4">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-warning" role="status"></div>
        </div>

        <div v-else>
          <!-- ── Profile Card ── -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">
              <div class="d-flex align-items-start justify-content-between flex-wrap gap-2">
                <div>
                  <h4 class="fw-bold mb-1">
                    <i class="bi bi-building me-2 text-warning"></i>{{ profile.company_name }}
                  </h4>
                  <p class="text-muted mb-1" v-if="profile.hr_contact">
                    <i class="bi bi-person-badge me-1"></i>{{ profile.hr_contact }}
                  </p>
                  <p class="text-muted mb-0" v-if="profile.website">
                    <i class="bi bi-globe me-1"></i>
                    <a :href="profile.website" target="_blank" rel="noopener">{{ profile.website }}</a>
                  </p>
                </div>
                <span class="badge fs-6 px-3 py-2"
                  :class="{
                    'bg-warning text-dark': profile.approval_status === 'pending',
                    'bg-success': profile.approval_status === 'approved',
                    'bg-danger': profile.approval_status === 'rejected'
                  }">
                  {{ profile.approval_status.toUpperCase() }}
                </span>
              </div>

              <div v-if="profile.approval_status === 'pending'" class="alert alert-warning mt-3 mb-0 py-2 small d-flex align-items-center">
                <i class="bi bi-hourglass-split me-2"></i>
                Your account is awaiting admin approval. You cannot post drives yet.
              </div>
              <div v-if="profile.approval_status === 'rejected'" class="alert alert-danger mt-3 mb-0 py-2 small d-flex align-items-center">
                <i class="bi bi-x-circle me-2"></i>
                Your account has been rejected. Please contact the admin.
              </div>
            </div>
          </div>

          <!-- Page-level alert -->
          <div v-if="pageMsg.text" class="alert" :class="'alert-' + pageMsg.type">{{ pageMsg.text }}</div>

          <!-- ── My Drives ── -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 class="fw-bold mb-0"><i class="bi bi-briefcase me-2"></i>My Drives</h5>
                <div>
                  <button
                    v-if="profile.approval_status === 'approved'"
                    class="btn btn-warning fw-semibold"
                    @click="showForm = !showForm"
                  >
                    <i class="bi" :class="showForm ? 'bi-x-lg' : 'bi-plus-lg'" class="me-1"></i>
                    {{ showForm ? 'Cancel' : 'Create New Drive' }}
                  </button>
                  <button v-else class="btn btn-warning fw-semibold" disabled title="Account must be approved to post drives">
                    <i class="bi bi-plus-lg me-1"></i>Create New Drive
                  </button>
                </div>
              </div>

              <div v-if="drives.length === 0" class="text-muted">No drives posted yet.</div>
              <div v-else class="table-responsive">
                <table class="table table-hover align-middle">
                  <thead class="table-dark">
                    <tr>
                      <th>Job Title</th>
                      <th>Deadline</th>
                      <th>Status</th>
                      <th>Applicants</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="d in drives"
                      :key="d.id"
                      style="cursor:pointer"
                      :class="{'table-active': selectedDrive && selectedDrive.id === d.id}"
                      @click="loadApplicants(d)"
                    >
                      <td class="fw-semibold">{{ d.job_title }}</td>
                      <td>{{ d.deadline ? d.deadline.slice(0,10) : '—' }}</td>
                      <td>
                        <span class="badge" :class="statusBadge(d.status)">{{ d.status }}</span>
                      </td>
                      <td><span class="badge bg-secondary">{{ d.applicant_count }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ── Create Drive Form ── -->
          <div v-if="showForm" class="card border-0 shadow-sm mb-4">
            <div class="card-body">
              <h5 class="fw-bold mb-3"><i class="bi bi-plus-circle me-2 text-warning"></i>Post a New Drive</h5>

              <div v-if="formMsg.text" class="alert" :class="'alert-' + formMsg.type">{{ formMsg.text }}</div>

              <form @submit.prevent="submitDrive" novalidate>
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label fw-semibold">Job Title <span class="text-danger">*</span></label>
                    <input v-model="form.job_title" type="text" class="form-control" placeholder="e.g. Software Engineer" required />
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold">Job Description <span class="text-danger">*</span></label>
                    <textarea v-model="form.job_description" class="form-control" rows="4" placeholder="Describe the role, responsibilities, required skills…" required></textarea>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Eligible Branches</label>
                    <input v-model="form.eligible_branches" type="text" class="form-control" placeholder="e.g. CS,DS,ES (comma-separated)" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-semibold">Min CGPA</label>
                    <input v-model="form.min_cgpa" type="number" class="form-control" placeholder="0.0" min="0" max="10" step="0.1" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-semibold">Eligible Years</label>
                    <input v-model="form.eligible_years" type="text" class="form-control" placeholder="e.g. 3,4" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Application Deadline <span class="text-danger">*</span></label>
                    <input v-model="form.deadline" type="date" class="form-control" required />
                  </div>
                </div>
                <button type="submit" class="btn btn-warning fw-semibold mt-4" :disabled="formLoading">
                  <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ formLoading ? 'Submitting…' : 'Submit Drive' }}
                </button>
              </form>
            </div>
          </div>

          <!-- ── Applicants Panel ── -->
          <div v-if="selectedDrive" class="card border-0 shadow-sm">
            <div class="card-body">
              <h5 class="fw-bold mb-3">
                <i class="bi bi-people me-2 text-primary"></i>Applicants for: {{ selectedDrive.job_title }}
              </h5>

              <div v-if="applicantMsg.text" class="alert" :class="'alert-' + applicantMsg.type">{{ applicantMsg.text }}</div>

              <div v-if="applicantsLoading" class="text-center py-3">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="applicants.length === 0" class="text-muted">No applicants yet.</div>
              <div v-else class="table-responsive">
                <table class="table table-hover align-middle">
                  <thead class="table-dark">
                    <tr>
                      <th>Name</th>
                      <th>Branch</th>
                      <th>CGPA</th>
                      <th>Year</th>
                      <th>Applied</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in applicants" :key="a.application_id">
                      <td class="fw-semibold">{{ a.name }}</td>
                      <td>{{ a.branch || '—' }}</td>
                      <td>{{ a.cgpa != null ? a.cgpa : '—' }}</td>
                      <td>{{ a.year || '—' }}</td>
                      <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '—' }}</td>
                      <td>
                        <span class="badge" :class="appStatusBadge(a.status)">{{ a.status }}</span>
                      </td>
                      <td>
                        <div class="d-flex gap-1 flex-wrap">
                          <template v-if="a.status === 'applied'">
                            <button class="btn btn-sm btn-warning text-dark" @click="updateStatus(a, 'shortlisted')">Shortlist</button>
                            <button class="btn btn-sm btn-danger" @click="updateStatus(a, 'rejected')">Reject</button>
                          </template>
                          <template v-else-if="a.status === 'shortlisted'">
                            <button class="btn btn-sm btn-success" @click="updateStatus(a, 'selected')">Select</button>
                            <button class="btn btn-sm btn-danger" @click="updateStatus(a, 'rejected')">Reject</button>
                          </template>
                          <span v-else class="text-muted small">—</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  methods: {
    statusBadge(status) {
      return {
        'bg-warning text-dark': status === 'pending',
        'bg-success': status === 'approved',
        'bg-danger': status === 'rejected'
      }
    },

    appStatusBadge(status) {
      return {
        'bg-secondary': status === 'applied',
        'bg-warning text-dark': status === 'shortlisted',
        'bg-success': status === 'selected',
        'bg-danger': status === 'rejected'
      }
    },

    async loadDashboard() {
      this.loading = true
      try {
        const data = await api.get('/api/company/dashboard')
        this.profile = data.profile
        this.drives = data.drives
      } catch (err) {
        this.pageMsg = { text: err.data?.error || 'Failed to load dashboard.', type: 'danger' }
      }
      this.loading = false
    },

    async submitDrive() {
      this.formMsg = { text: '', type: '' }
      if (!this.form.job_title.trim()) { this.formMsg = { text: 'Job title is required.', type: 'danger' }; return }
      if (!this.form.job_description.trim()) { this.formMsg = { text: 'Job description is required.', type: 'danger' }; return }
      if (!this.form.deadline) { this.formMsg = { text: 'Deadline is required.', type: 'danger' }; return }

      this.formLoading = true
      try {
        const payload = {
          job_title: this.form.job_title.trim(),
          job_description: this.form.job_description.trim(),
          eligible_branches: this.form.eligible_branches.trim(),
          min_cgpa: this.form.min_cgpa ? parseFloat(this.form.min_cgpa) : 0.0,
          eligible_years: this.form.eligible_years.trim(),
          deadline: this.form.deadline
        }
        await api.post('/api/company/drives', payload)
        this.formMsg = { text: 'Drive posted successfully! Awaiting admin approval.', type: 'success' }
        this.form = { job_title: '', job_description: '', eligible_branches: '', min_cgpa: '', eligible_years: '', deadline: '' }
        this.showForm = false
        await this.loadDashboard()
      } catch (err) {
        this.formMsg = { text: err.data?.error || 'Failed to create drive.', type: 'danger' }
      }
      this.formLoading = false
    },

    async loadApplicants(drive) {
      if (this.selectedDrive && this.selectedDrive.id === drive.id) {
        this.selectedDrive = null
        this.applicants = []
        return
      }
      this.selectedDrive = drive
      this.applicants = []
      this.applicantsLoading = true
      this.applicantMsg = { text: '', type: '' }
      try {
        this.applicants = await api.get(`/api/company/drives/${drive.id}/applications`)
      } catch (err) {
        this.applicantMsg = { text: err.data?.error || 'Failed to load applicants.', type: 'danger' }
      }
      this.applicantsLoading = false
    },

    async updateStatus(applicant, newStatus) {
      try {
        await api.put(`/api/company/applications/${applicant.application_id}/status`, { status: newStatus })
        applicant.status = newStatus
        this.applicantMsg = { text: `Status updated to "${newStatus}".`, type: 'success' }
        await this.loadDashboard()
      } catch (err) {
        this.applicantMsg = { text: err.data?.error || 'Failed to update status.', type: 'danger' }
      }
      setTimeout(() => { this.applicantMsg = { text: '', type: '' } }, 3000)
    }
  },
  mounted() {
    this.userEmail = localStorage.getItem('userEmail') || ''
    this.loadDashboard()
  }
}
