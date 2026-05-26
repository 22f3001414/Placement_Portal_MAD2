const RegisterStudent = {
  name: 'RegisterStudent',
  data() {
    return {
      form: {
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        branch: '',
        cgpa: '',
        year: ''
      },
      error: '',
      success: '',
      loading: false,
      branches: ['CS', 'DS', 'ES', 'EE', 'ME', 'CE', 'CH', 'MA', 'PH', 'HS'],
      years: [1, 2, 3, 4]
    }
  },
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center py-5" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-7 col-lg-6">

            <div class="text-center mb-4">
              <i class="bi bi-mortarboard text-white" style="font-size: 3rem;"></i>
              <h2 class="text-white fw-bold mt-2">Student Registration</h2>
              <p class="text-white-50">Create your student account</p>
            </div>

            <div class="card p-4">

              <div v-if="error" class="alert alert-danger alert-dismissible d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <span>{{ error }}</span>
                <button type="button" class="btn-close" @click="error = ''"></button>
              </div>

              <div v-if="success" class="alert alert-success d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-2"></i>
                <span>{{ success }}</span>
              </div>

              <form @submit.prevent="handleRegister" novalidate>

                <div class="row g-3">
                  <!-- Full Name -->
                  <div class="col-12">
                    <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-person"></i></span>
                      <input v-model="form.name" type="text" class="form-control" placeholder="Your full name" required />
                    </div>
                  </div>

                  <!-- Email -->
                  <div class="col-12">
                    <label class="form-label fw-semibold">Email <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                      <input v-model="form.email" type="email" class="form-control" placeholder="you@example.com" required />
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

                  <!-- Branch -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Branch</label>
                    <select v-model="form.branch" class="form-select">
                      <option value="">Select branch</option>
                      <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
                    </select>
                  </div>

                  <!-- Year -->
                  <div class="col-md-3">
                    <label class="form-label fw-semibold">Year</label>
                    <select v-model="form.year" class="form-select">
                      <option value="">Year</option>
                      <option v-for="y in years" :key="y" :value="y">Year {{ y }}</option>
                    </select>
                  </div>

                  <!-- CGPA -->
                  <div class="col-md-3">
                    <label class="form-label fw-semibold">CGPA</label>
                    <input
                      v-model="form.cgpa"
                      type="number"
                      class="form-control"
                      placeholder="0–10"
                      min="0"
                      max="10"
                      step="0.01"
                    />
                  </div>
                </div>

                <button type="submit" class="btn btn-success w-100 fw-semibold mt-4" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Registering...' : 'Create Student Account' }}
                </button>
              </form>

              <div class="text-center mt-3 text-muted small">
                Already have an account?
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

      // Frontend validation
      if (!this.form.name.trim()) { this.error = 'Full name is required.'; return }
      if (!this.form.email.trim()) { this.error = 'Email is required.'; return }
      if (!this.form.password) { this.error = 'Password is required.'; return }
      if (this.form.password.length < 6) { this.error = 'Password must be at least 6 characters.'; return }
      if (this.form.password !== this.form.confirmPassword) { this.error = 'Passwords do not match.'; return }
      if (this.form.cgpa && (parseFloat(this.form.cgpa) < 0 || parseFloat(this.form.cgpa) > 10)) {
        this.error = 'CGPA must be between 0 and 10.'; return
      }

      this.loading = true
      try {
        const payload = {
          email: this.form.email.trim(),
          password: this.form.password,
          name: this.form.name.trim(),
          branch: this.form.branch || undefined,
          cgpa: this.form.cgpa ? parseFloat(this.form.cgpa) : undefined,
          year: this.form.year ? parseInt(this.form.year) : undefined
        }
        await api.post('/api/auth/register/student', payload)
        this.success = 'Account created! Redirecting to login...'
        setTimeout(() => this.$router.push('/login'), 1800)
      } catch (err) {
        this.error = err.data?.error || 'Registration failed. Please try again.'
      } finally {
        this.loading = false
      }
    }
  }
}
