
import { supabase } from '../src/utils/supabase.js';

async function checkSchema() {
  const { data, error } = await supabase.from('facturas').select('*').limit(1);
  if (error) {
    console.error('Error fetching sample:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in facturas:', Object.keys(data[0]));
  } else {
    console.log('No data in facturas table to check columns.');
  }
}

checkSchema();
