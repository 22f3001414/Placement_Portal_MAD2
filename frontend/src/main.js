const { createApp } = Vue

// Centralised fetch wrapper — replaces Axios
// Usage: await api.post('/api/auth/login', { email, password })
//        await api.get('/api/admin/dashboard')
window.api = {
  _base: 'http://localhost:5000',

  _headers() {
    const h = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('token')
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  },

  async _request(method, path, body) {
    const options = { method, headers: this._headers() }
    if (body) options.body = JSON.stringify(body)

    const res = await fetch(this._base + path, options)

    // Auto-logout on 401
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('userEmail')
      router.push('/login')
    }

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const err = new Error(data.error || 'Request failed')
      err.status = res.status
      err.data = data
      throw err
    }
    return data
  },

  get(path)         { return this._request('GET',    path) },
  post(path, body)  { return this._request('POST',   path, body) },
  put(path, body)   { return this._request('PUT',    path, body) },
  delete(path)      { return this._request('DELETE', path) },
}

const App = {
  template: `<div><router-view></router-view></div>`
}

const app = createApp(App)
app.use(router)
app.mount('#app')
