import { supabase } from '../utils/supabase.js';

export async function seedDatabase() {
  try {
    // Verificar si ya hay datos
    const { count } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true });

    if (count > 0) {
      console.log('Database already has data, skipping seed');
      return;
    }

    // Insertar cliente de prueba
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .insert([{
        email: 'demo@facturapp.es',
        password: 'demo123',
        actualizacion_pagada: true
      }])
      .select()
      .single();

    if (clienteError) throw clienteError;
    console.log('Cliente demo creado:', cliente);

    // Insertar emisor de prueba
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

    if (emisorError) throw emisorError;
    console.log('Emisor creado:', emisor);

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

    if (serieError) throw serieError;
    console.log('Serie creada:', serie);

    // Insertar clientes de prueba
    const { data: clientes, error: clientesError } = await supabase
      .from('clientesEmisor')
      .insert([
        {
          nombre: 'Tech Solutions S.A.',
          cif_nif_nie: 'A87654321',
          direccion_completa: 'Av. de la Tecnología 42, Barcelona',
          correo_electronico: 'admin@techsolutions.es',
          telefono: '+34 933 456 789',
          condiciones_pago: 'Neto 30'
        },
        {
          nombre: 'Innovatech Labs',
          cif_nif_nie: 'B11223344',
          direccion_completa: 'Calle Innovación 15, Valencia',
          correo_electronico: 'contacto@innovatech.es',
          telefono: '+34 961 234 567',
          condiciones_pago: 'Neto 15'
        }
      ])
      .select();

    if (clientesError) throw clientesError;
    console.log('Clientes creados:', clientes);

    // Insertar facturas de prueba
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .insert([
        {
          id_emisor: emisor.id,
          id_cliente: clientes[0].id,
          numero_factura: 1,
          fecha_emision: '2026-03-01',
          tipo_factura: 'factura',
          descripcion_general: 'Servicios de desarrollo web',
          subtotal_sin_iva: 5400,
          porcentaje_iva: 21,
          importe_iva: 1134,
          total_factura: 6534,
          estado_pago: 'pagado',
          estado_verifactu: 'emitida'
        },
        {
          id_emisor: emisor.id,
          id_cliente: clientes[1].id,
          numero_factura: 2,
          fecha_emision: '2026-03-05',
          tipo_factura: 'factura',
          descripcion_general: 'Consultoría técnica y soporte',
          subtotal_sin_iva: 2900,
          porcentaje_iva: 21,
          importe_iva: 609,
          total_factura: 3509,
          estado_pago: 'pendiente',
          estado_verifactu: null
        }
      ])
      .select();

    if (facturasError) throw facturasError;
    console.log('Facturas creadas:', facturas);

    console.log('✅ Database seeded successfully!');
    return { cliente, emisor, serie, clientes, facturas };
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}
