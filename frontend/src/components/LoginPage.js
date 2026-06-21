const LoginPage = {
  name: 'LoginPage',
  data() {
    return {
      form: { email: '', password: '' },
      error: '',
      loading: false
    }
  },
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-5 col-lg-4">

            <!-- Header -->
            <div class="text-center mb-4">
              <i class="bi bi-building-check text-white" style="font-size: 3rem;"></i>
              <h2 class="text-white fw-bold mt-2">Placement Portal</h2>
              <p class="text-white-50">Institute Placement Management System</p>
            </div>

            <div class="card p-4">
              <h5 class="card-title fw-bold mb-4 text-center">Sign In</h5>

              <!-- Error Alert -->
              <div v-if="error" class="alert alert-danger alert-dismissible d-flex align-items-center" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <span>{{ error }}</span>
                <button type="button" class="btn-close" @click="error = ''"></button>
              </div>

              <form @submit.prevent="handleLogin" novalidate>
                <div class="mb-3">
                  <label for="email" class="form-label fw-semibold">Email address</label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                    <input
                      id="email"
                      v-model="form.email"
                      type="email"
                      class="form-control"
                      placeholder="you@example.com"
                      required
                      autocomplete="email"
                    />
                  </div>
                </div>

                <div class="mb-4">
                  <label for="password" class="form-label fw-semibold">Password</label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                    <input
                      id="password"
                      v-model="form.password"
                      type="password"
                      class="form-control"
                      placeholder="••••••••"
                      required
                      autocomplete="current-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  class="btn btn-primary w-100 fw-semibold"
                  :disabled="loading"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Signing in...' : 'Sign In' }}
                </button>
              </form>

              <hr class="my-3" />

              <div class="text-center text-muted small">
                <p class="mb-1">New to the platform?</p>
                <router-link to="/register/student" class="btn btn-outline-secondary btn-sm me-2">
                  Register as Student
                </router-link>
                <router-link to="/register/company" class="btn btn-outline-secondary btn-sm">
                  Register as Company
                </router-link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    async handleLogin() {
      this.error = ''

      if (!this.form.email.trim() || !this.form.password) {
        this.error = 'Please enter both email and password.'
        return
      }

      this.loading = true
      try {
        const data = await api.post('/api/auth/login', {
          email: this.form.email.trim(),
          password: this.form.password
        })

        localStorage.setItem('token', data.access_token)
        localStorage.setItem('role', data.role)
        localStorage.setItem('userEmail', data.email)

        const dashboardMap = {
          admin: '/admin/dashboard',
          company: '/company/dashboard',
          student: '/student/dashboard'
        }
        this.$router.push(dashboardMap[data.role] || '/login')

      } catch (err) {
        this.error = err.data?.error || 'Login failed. Please try again.'
      } finally {
        this.loading = false
      }
    }
  }
}
