import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xvpudwpebfvjhxqahdxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHVkd3BlYmZ2amh4cWFoZHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAwMDAwMDAsImV4cCI6MTg0ODA2NjAwMH0.vGJXv0PcJdlqMxwhxBJJwBLLBqZhJLR2wkJP0Z3t0ps';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getCurrentUserId = () => {
  const token = localStorage.getItem('supabase_auth_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch {
    return null;
  }
};

export const setAuthToken = (token) => {
  localStorage.setItem('supabase_auth_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('supabase_auth_token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('supabase_auth_token');
};
