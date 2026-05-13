
import { supabase } from '../src/utils/supabase.js';

async function listColumns() {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns in facturas:', Object.keys(data[0] || {}));
  }
}

listColumns();
