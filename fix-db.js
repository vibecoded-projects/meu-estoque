/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrmlyviorojcvjcahjmo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpybWx5dmlvcm9qY3ZqY2Foam1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA2MDY1NSwiZXhwIjoyMTA2NjM2NjU1fQ.WUcw_oDpyBhR7QHY1V3fXIqeiQ419f3eZb6JMHdajXM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Atualizando a senha da loja-carol para 9563...');
  
  // Primeiro, buscar o ID do namespace loja-carol
  const { data: namespace, error: nsError } = await supabase
    .from('namespaces')
    .select('id')
    .eq('slug', 'loja-carol')
    .single();

  if (nsError || !namespace) {
    console.error('Erro ao achar namespace:', nsError);
    return;
  }

  // Agora atualizar o código na tabela namespace_codes
  const { error: codeError } = await supabase
    .from('namespace_codes')
    .update({ code: '9563' })
    .eq('namespace_id', namespace.id);

  if (codeError) {
    console.error('Erro ao atualizar senha:', codeError);
  } else {
    console.log('Senha atualizada com sucesso para 9563!');
  }
}

run();
/* eslint-disable */

