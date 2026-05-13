
import { supabase } from '../src/utils/supabase.js';

async function testQuery() {
  const { data: emisor } = await supabase.from('emisores').select('id').limit(1).single();
  if (!emisor) {
    console.log('No emisor found');
    return;
  }

  const { data: invoices, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('id_emisor', emisor.id);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample invoice:', invoices[0]);
    console.log('Total found:', invoices.length);
  }
}

testQuery();
