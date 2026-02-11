const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://zdaacvajzvusrkqxpivs.supabase.co',
  'sb_publishable_UAMPaPo9YGuXFNM2oaOpwg_Iv2Zai-Y'
)

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('*')
  console.log('Error:', error)
  console.log('Data:', data)
}

checkUsers()
