
import { supabase } from '../src/utils/supabase.js';

async function listColumns() {
  const { data, error } = await supabase
    .from('clientesEmisor')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns in clientesEmisor:', Object.keys(data[0] || {}));
  }
}

listColumns();
