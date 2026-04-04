import { supabase } from '../supabase'

export async function logActivity(action, mural, detail = '') {
  await supabase.from('mural_activity').insert({
    action,
    mural_id: mural.mural_id || mural.id,
    mural_title: mural.title,
    detail,
  })
}