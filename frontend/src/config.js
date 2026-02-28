// Smart City Portal - Configuration
// In production, set VITE_API_URL in your Vercel/Netlify environment variables.
// Fallback is localhost for development.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
