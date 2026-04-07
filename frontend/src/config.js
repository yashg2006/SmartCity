// Smart City Portal - Configuration
// In production, set VITE_API_URL in your Vercel/Netlify environment variables.
// Fallback is localhost for development.

const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_URL = import.meta.env.VITE_API_URL || `http://${currentHost}:3000`;
