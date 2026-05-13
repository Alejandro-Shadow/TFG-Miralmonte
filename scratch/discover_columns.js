
import { supabase } from '../src/utils/supabase.js';

async function checkColumns() {
  try {
    // Insert a minimal row to see what columns are returned
    const { data, error } = await supabase
      .from('facturas')
      .insert([{ 
        id_emisor: 1, // Need a valid ID? Let's try to get one first
        descripcion_general: 'Schema Check'
      }])
      .select()
      .single();

    if (error) {
      console.log('Error Message:', error.message);
      console.log('Error Details:', error.details);
      console.log('Error Hint:', error.hint);
    } else {
      console.log('Columns in facturas:', Object.keys(data));
      // Delete the test row
      await supabase.from('facturas').delete().eq('id', data.id);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// First get a valid emisorId
async function start() {
  const { data: emisor } = await supabase.from('emisores').select('id').limit(1).single();
  if (emisor) {
    global.emisorId = emisor.id;
    checkColumns();
  } else {
    console.log('No emisor found to test insert.');
  }
}

start();
