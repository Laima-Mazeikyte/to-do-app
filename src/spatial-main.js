import './style.css'
import './spatial.css'
import { supabase } from './lib/supabase.js'
import { initSpatialView } from './views/spatial-view.js'

initSpatialView(supabase)
