
import { supabase } from '../src/utils/supabase.js';

async function listColumns() {
  const { data, error } = await supabase
    .from('facturas')
    .select('*');

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in facturas:', Object.keys(data[0]));
  } else {
    console.log('No data found in facturas');
  }
}

listColumns();
