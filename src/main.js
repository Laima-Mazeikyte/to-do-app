import './style.css'
import { supabase } from './lib/supabase.js'
import { initListView } from './views/list-view.js'

initListView(supabase)
