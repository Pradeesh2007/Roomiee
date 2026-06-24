import { supabase } from './lib/supabaseClient'

export default function TestSupabase() {
  console.log('Supabase connected:', supabase)

  return (
    <div>
      Supabase connection loaded.
    </div>
  )
}
