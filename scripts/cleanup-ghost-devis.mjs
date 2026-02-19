/**
 * Cleanup script: Remove ghost/empty devis records from Supabase
 *
 * These are devis with:
 *  - 0€ total (no lignes or empty lignes)
 *  - No numero or empty numero
 *  - No client_id
 *  - Created around 08/02/2026
 *  - statut = 'brouillon'
 *
 * Usage: node scripts/cleanup-ghost-devis.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kofsbgxkrmryfetevetn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZnNiZ3hrcm1yeWZldGV2ZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ2ODEsImV4cCI6MjA4MzIwMDY4MX0.qHP3xdKI4ZhrcaIiCfKxoMoZqKiGAm75jXPA_ZCne_w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔍 Searching for ghost devis...${isDryRun ? ' (DRY RUN)' : ''}\n`);

  // Fetch all brouillon devis
  const { data: allDevis, error } = await supabase
    .from('devis')
    .select('id, numero, type, statut, client_id, lignes, objet, date, created_at, total_ht, total_ttc')
    .eq('statut', 'brouillon')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching devis:', error.message);
    process.exit(1);
  }

  console.log(`📋 Found ${allDevis.length} brouillon devis total.\n`);

  // Identify ghost devis: empty numero, no client, no/empty lignes, ~0€
  const ghosts = allDevis.filter(d => {
    const hasNoNumero = !d.numero || d.numero.trim() === '';
    const hasNoClient = !d.client_id;
    const hasNoLignes = !d.lignes || (Array.isArray(d.lignes) && d.lignes.length === 0);
    const hasNoObjet = !d.objet || d.objet.trim() === '';
    const isZeroTotal = (!d.total_ht || d.total_ht === 0) && (!d.total_ttc || d.total_ttc === 0);

    // Ghost = at least 3 of these conditions
    const score = [hasNoNumero, hasNoClient, hasNoLignes, hasNoObjet, isZeroTotal].filter(Boolean).length;
    return score >= 3;
  });

  if (ghosts.length === 0) {
    console.log('✅ No ghost devis found. Database is clean!');
    process.exit(0);
  }

  console.log(`🗑️  Found ${ghosts.length} ghost devis:\n`);
  ghosts.forEach((d, i) => {
    console.log(`  ${i + 1}. ID: ${d.id}`);
    console.log(`     numero: "${d.numero || ''}" | client: ${d.client_id || 'none'} | lignes: ${Array.isArray(d.lignes) ? d.lignes.length : '?'}`);
    console.log(`     date: ${d.date} | created: ${d.created_at}`);
    console.log(`     total_ht: ${d.total_ht ?? 0} | total_ttc: ${d.total_ttc ?? 0}`);
    console.log('');
  });

  if (isDryRun) {
    console.log('🏁 Dry run complete. Run without --dry-run to delete.');
    process.exit(0);
  }

  // Delete ghost devis
  const ids = ghosts.map(d => d.id);
  console.log(`🗑️  Deleting ${ids.length} ghost devis...`);

  const { error: deleteError, count } = await supabase
    .from('devis')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('❌ Error deleting:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${ids.length} ghost devis.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
