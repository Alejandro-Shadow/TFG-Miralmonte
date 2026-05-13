
import fetch from 'node-fetch'; // Wait, node-fetch might not be installed. Node 18+ has fetch.

async function checkSchema() {
  const url = 'https://udyqmvvlvexibygbqbcf.supabase.co/rest/v1/';
  const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeXFtdnZsdmV4aWJ5Z2JxYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTc1MTEsImV4cCI6MjA2MzY5MzUxMX0.yoLQvIDWd_dWnNrnUBtVYNzmCVMdwKUB939qql0GY4E';
  
  try {
    const response = await fetch(url, {
      headers: { 'apikey': apikey }
    });
    const schema = await response.json();
    console.log('Error Message:', schema.message);
    console.log('Error Hint:', schema.hint);
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

checkSchema();
