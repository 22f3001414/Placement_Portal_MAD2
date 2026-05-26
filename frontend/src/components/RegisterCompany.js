const RegisterCompany = {
  name: 'RegisterCompany',
  data() {
    return {
      form: {
        email: '',
        password: '',
        confirmPassword: '',
        company_name: '',
        hr_contact: '',
        website: ''
      },
      error: '',
      success: '',
      loading: false
    }
  },
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center py-5" style="background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-7 col-lg-6">

            <div class="text-center mb-4">
              <i class="bi bi-buildings text-white" style="font-size: 3rem;"></i>
              <h2 class="text-white fw-bold mt-2">Company Registration</h2>
              <p class="text-white-50">Register your company to post placement drives</p>
            </div>

            <div class="card p-4">

              <div v-if="error" class="alert alert-danger alert-dismissible d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <span>{{ error }}</span>
                <button type="button" class="btn-close" @click="error = ''"></button>
              </div>

              <div v-if="success" class="alert alert-info d-flex align-items-center">
                <i class="bi bi-info-circle-fill me-2"></i>
                <span>{{ success }}</span>
              </div>

              <form @submit.prevent="handleRegister" novalidate>
                <div class="row g-3">

                  <!-- Company Name -->
                  <div class="col-12">
                    <label class="form-label fw-semibold">Company Name <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-building"></i></span>
                      <input v-model="form.company_name" type="text" class="form-control" placeholder="e.g. Infosys Ltd." required />
                    </div>
                  </div>

                  <!-- Email -->
                  <div class="col-12">
                    <label class="form-label fw-semibold">Company Email <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                      <input v-model="form.email" type="email" class="form-control" placeholder="hr@company.com" required />
                    </div>
                  </div>

                  <!-- Password -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Password <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-lock"></i></span>
                      <input v-model="form.password" type="password" class="form-control" placeholder="Min. 6 characters" required />
                    </div>
                  </div>

                  <!-- Confirm Password -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Confirm Password <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                      <input v-model="form.confirmPassword" type="password" class="form-control" placeholder="Repeat password" required />
                    </div>
                  </div>

                  <!-- HR Contact -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">HR Contact</label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                      <input v-model="form.hr_contact" type="text" class="form-control" placeholder="HR person name / phone" />
                    </div>
                  </div>

                  <!-- Website -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Website</label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-globe"></i></span>
                      <input v-model="form.website" type="url" class="form-control" placeholder="https://yourcompany.com" />
                    </div>
                  </div>

                </div>

                <!-- Info box -->
                <div class="alert alert-warning mt-3 mb-0 py-2 small d-flex align-items-center">
                  <i class="bi bi-hourglass-split me-2"></i>
                  Your registration will be reviewed by the admin before you can post drives.
                </div>

                <button type="submit" class="btn btn-warning w-100 fw-semibold mt-3" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Submitting...' : 'Submit Registration' }}
                </button>
              </form>

              <div class="text-center mt-3 text-muted small">
                Already registered?
                <router-link to="/login" class="fw-semibold">Sign in</router-link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    async handleRegister() {
      this.error = ''
      this.success = ''

      if (!this.form.company_name.trim()) { this.error = 'Company name is required.'; return }
      if (!this.form.email.trim()) { this.error = 'Email is required.'; return }
      if (!this.form.password) { this.error = 'Password is required.'; return }
      if (this.form.password.length < 6) { this.error = 'Password must be at least 6 characters.'; return }
      if (this.form.password !== this.form.confirmPassword) { this.error = 'Passwords do not match.'; return }

      this.loading = true
      try {
        const payload = {
          email: this.form.email.trim(),
          password: this.form.password,
          company_name: this.form.company_name.trim(),
          hr_contact: this.form.hr_contact.trim() || undefined,
          website: this.form.website.trim() || undefined
        }
        await api.post('/api/auth/register/company', payload)
        this.success = 'Registration submitted! You will be able to log in once an admin approves your account.'
        this.form = { email: '', password: '', confirmPassword: '', company_name: '', hr_contact: '', website: '' }
      } catch (err) {
        this.error = err.data?.error || 'Registration failed. Please try again.'
      } finally {
        this.loading = false
      }
    }
  }
}
