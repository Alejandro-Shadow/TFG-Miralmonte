import { supabase } from '../utils/supabase.js';

class AuthService {
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  getEmisorId() {
    // Lee el id_emisor del JWT actual (síncrono desde la sesión cacheada)
    const session = supabase.auth.session?.();
    const meta = session?.user?.user_metadata;
    return meta?.id_emisor || null;
  }

  async getEmisorIdAsync() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.user_metadata?.id_emisor || null;
  }

  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }
}

export const authService = new AuthService();
