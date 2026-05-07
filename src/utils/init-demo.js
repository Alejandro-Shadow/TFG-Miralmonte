import { supabase } from './supabase.js';

export async function initDemoUser() {
  try {
    // Verificar si el usuario demo ya existe
    const { data: existing, error: checkError } = await supabase
      .from('cliente')
      .select('*')
      .eq('email', 'demo@facturapp.es')
      .single();

    if (existing) {
      console.log('Usuario demo ya existe');
      return;
    }

    // Si no existe, crear el usuario
    const { data, error } = await supabase
      .from('cliente')
      .insert([{
        email: 'demo@facturapp.es',
        password: 'demo123',
        actualizacion_pagada: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando usuario demo:', error);
      return;
    }

    console.log('✅ Usuario demo creado:', data);

    // Crear emisor demo
    const { data: emisor, error: emisorError } = await supabase
      .from('emisores')
      .insert([{
        nombre: 'Mi Empresa S.L.',
        estado: 'activo',
        nombre_comercial: 'Mi Empresa',
        cif_nif: 'B12345678',
        direccion_fiscal: 'Calle Principal 1',
        correo_contacto: 'contacto@miempresa.es',
        telefono: '+34 912 345 678',
        iban: 'ES1234567890123456789012',
        codigo_postal: '28001',
        ciudad: 'Madrid',
        provincia: 'Madrid',
        pais: 'España',
        tiene_local: 1,
        tiene_facturas: 1,
        tiene_gestion_reservas: 1
      }])
      .select()
      .single();

    if (emisorError) {
      console.error('Error creando emisor:', emisorError);
      return;
    }

    console.log('✅ Emisor demo creado:', emisor);

    // Crear serie de facturación
    const { data: serie, error: serieError } = await supabase
      .from('serieFacturacion')
      .insert([{
        serie: 'FAC',
        idEmisor: emisor.id,
        numeroActual: 1
      }])
      .select()
      .single();

    if (serieError) {
      console.error('Error creando serie:', serieError);
      return;
    }

    console.log('✅ Serie demo creada:', serie);
  } catch (error) {
    console.error('Error en initDemoUser:', error);
  }
}
