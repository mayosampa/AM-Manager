import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mejumkybweujyofwkxwj.supabase.co';
const supabaseKey = 'sb_publishable_TvCejTmAygafBhRaltm1fw_u10C_KoI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  const { data, error } = await supabase.from('app_state').select('*').limit(1);
  if (error && error.code === '42P01') {
      console.log('Table does not exist. The user has to create it.');
  } else {
      console.log('Table might exist or other error:', error);
  }
}
createTable();
