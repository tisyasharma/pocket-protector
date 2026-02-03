import axios from 'axios'

// API client (env URL in prod, localhost in dev)
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json'
  }
})

export default client
