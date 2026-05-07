import { supabase, setAuthToken, getAuthToken, clearAuthToken } from '../utils/supabase.js';

class AuthService {
  async login(email, password) {
    try {
      const { data, error } = await supabase
        .from('cliente')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        throw new Error('Usuario no encontrado');
      }

      if (data.password !== password) {
        throw new Error('Contraseña incorrecta');
      }

      setAuthToken(data.id.toString());
      return { success: true, cliente: data };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(email, password) {
    try {
      const { data, error } = await supabase
        .from('cliente')
        .insert([{ email, password, actualizacion_pagada: false }])
        .select()
        .single();

      if (error) throw error;

      setAuthToken(data.id.toString());
      return { success: true, cliente: data };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  }

  logout() {
    clearAuthToken();
  }

  getClienteId() {
    const token = getAuthToken();
    return token ? parseInt(token) : null;
  }

  isAuthenticated() {
    return !!getAuthToken();
  }

  async getEmisores(clienteId) {
    try {
      const { data, error } = await supabase
        .from('emisores')
        .select('*')
        .eq('id', clienteId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching emisores:', error);
      return [];
    }
  }

  async createEmisor(emisorData) {
    try {
      const { data, error } = await supabase
        .from('emisores')
        .insert([emisorData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating emisor:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
