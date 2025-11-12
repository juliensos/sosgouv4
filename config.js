// ============================================
// SOSGOUV - Configuration Supabase
// ============================================

const SUPABASE_CONFIG = {
  url: 'https://lbcmwivxvzeortvftxsi.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY213aXZ4dnplb3J0dmZ0eHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mzc2MTgsImV4cCI6MjA3ODAxMzYxOH0.RN431cCTPF2D_1xH8HJX7Eey-s4STlU3F-ZZ8sxoE7I'
};

// Initialiser le client Supabase
const supabase = window.supabase?.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Vérifier que Supabase est chargé
if (!supabase) {
  console.error('❌ Supabase n\'est pas chargé correctement');
}
