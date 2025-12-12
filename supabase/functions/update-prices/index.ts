import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AtivoResult {
  ticker: string;
  success: boolean;
  preco?: number;
  error?: string;
}

serve(async (req) => {
  console.log('=== UPDATE-PRICES FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User authenticated: ${user.id}`);

    // Fetch all active assets for the user
    const { data: ativos, error: ativosError } = await supabase
      .from('ativos')
      .select('id, ticker, classe, moeda_base')
      .eq('user_id', user.id)
      .eq('ativo', true);

    if (ativosError) {
      console.error('Error fetching ativos:', ativosError);
      throw ativosError;
    }

    console.log(`Found ${ativos?.length || 0} active assets:`, ativos?.map(a => a.ticker));

    if (!ativos || ativos.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nenhum ativo encontrado',
        atualizados: 0,
        falhas: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: AtivoResult[] = [];

    for (const ativo of ativos) {
      try {
        let preco: number | null = null;
        let fonte = '';

        if (ativo.classe === 'acoes_br' || ativo.classe === 'fii') {
          // Use BRAPI for Brazilian stocks and FIIs
          // Remove .SA suffix if present, BRAPI uses just the ticker
          const ticker = ativo.ticker.replace('.SA', '').toUpperCase();
          const brapiUrl = `https://brapi.dev/api/quote/${ticker}`;
          console.log(`Fetching BRAPI: ${brapiUrl}`);
          
          const brapiResponse = await fetch(brapiUrl);
          const brapiText = await brapiResponse.text();
          console.log(`BRAPI response status: ${brapiResponse.status}, body: ${brapiText.substring(0, 500)}`);
          
          if (brapiResponse.ok) {
            try {
              const brapiData = JSON.parse(brapiText);
              if (brapiData.results && brapiData.results.length > 0 && brapiData.results[0].regularMarketPrice) {
                preco = brapiData.results[0].regularMarketPrice;
                fonte = 'brapi';
                console.log(`BRAPI SUCCESS: ${ticker} = R$ ${preco}`);
              } else {
                console.log(`BRAPI: No price data in response for ${ticker}`, brapiData);
                results.push({
                  ticker: ativo.ticker,
                  success: false,
                  error: `Ticker "${ticker}" não encontrado na BRAPI. Verifique se o código está correto.`,
                });
                continue;
              }
            } catch (parseError) {
              console.error(`BRAPI parse error for ${ticker}:`, parseError);
              results.push({
                ticker: ativo.ticker,
                success: false,
                error: `Erro ao processar resposta da BRAPI`,
              });
              continue;
            }
          } else {
            console.error(`BRAPI HTTP error for ${ticker}: ${brapiResponse.status} - ${brapiText}`);
            results.push({
              ticker: ativo.ticker,
              success: false,
              error: `Erro HTTP ${brapiResponse.status} da BRAPI`,
            });
            continue;
          }
        } else if (ativo.classe === 'cripto') {
          // Use CoinGecko for crypto - map common tickers
          const tickerMap: Record<string, string> = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'ADA': 'cardano',
            'DOT': 'polkadot',
            'LINK': 'chainlink',
            'MATIC': 'matic-network',
            'AVAX': 'avalanche-2',
            'XRP': 'ripple',
            'DOGE': 'dogecoin',
            'SHIB': 'shiba-inu',
            'LTC': 'litecoin',
          };
          
          const coinId = tickerMap[ativo.ticker.toUpperCase()] || ativo.ticker.toLowerCase();
          const currency = ativo.moeda_base === 'USD' ? 'usd' : 'brl';
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;
          console.log(`Fetching CoinGecko: ${cgUrl}`);
          
          const cgResponse = await fetch(cgUrl);
          const cgText = await cgResponse.text();
          console.log(`CoinGecko response status: ${cgResponse.status}, body: ${cgText}`);
          
          if (cgResponse.ok) {
            try {
              const cgData = JSON.parse(cgText);
              if (cgData[coinId] && cgData[coinId][currency]) {
                preco = cgData[coinId][currency];
                fonte = 'coingecko';
                console.log(`CoinGecko SUCCESS: ${ativo.ticker} = ${preco}`);
              } else {
                results.push({
                  ticker: ativo.ticker,
                  success: false,
                  error: `Crypto "${coinId}" não encontrada no CoinGecko`,
                });
                continue;
              }
            } catch (parseError) {
              results.push({
                ticker: ativo.ticker,
                success: false,
                error: `Erro ao processar resposta do CoinGecko`,
              });
              continue;
            }
          } else {
            results.push({
              ticker: ativo.ticker,
              success: false,
              error: `Erro HTTP ${cgResponse.status} do CoinGecko`,
            });
            continue;
          }
        } else if (ativo.classe === 'acoes_eua') {
          results.push({
            ticker: ativo.ticker,
            success: false,
            error: 'Ações EUA: cotação automática em breve',
          });
          continue;
        } else if (ativo.classe === 'renda_fixa') {
          results.push({
            ticker: ativo.ticker,
            success: false,
            error: 'Renda Fixa: atualize o preço manualmente',
          });
          continue;
        }

        if (preco !== null && preco > 0) {
          console.log(`Saving price for ${ativo.ticker}: ${preco}`);
          
          // Upsert price
          const { data: existing } = await supabase
            .from('precos_ativos')
            .select('id')
            .eq('user_id', user.id)
            .eq('ativo_id', ativo.id)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await supabase
              .from('precos_ativos')
              .update({
                preco_atual: preco,
                moeda: ativo.moeda_base,
                atualizado_em: new Date().toISOString(),
                fonte,
              })
              .eq('id', existing.id);
            
            if (updateError) {
              console.error(`Error updating price for ${ativo.ticker}:`, updateError);
              results.push({
                ticker: ativo.ticker,
                success: false,
                error: `Erro ao salvar: ${updateError.message}`,
              });
              continue;
            }
          } else {
            const { error: insertError } = await supabase.from('precos_ativos').insert({
              user_id: user.id,
              ativo_id: ativo.id,
              preco_atual: preco,
              moeda: ativo.moeda_base,
              atualizado_em: new Date().toISOString(),
              fonte,
            });
            
            if (insertError) {
              console.error(`Error inserting price for ${ativo.ticker}:`, insertError);
              results.push({
                ticker: ativo.ticker,
                success: false,
                error: `Erro ao salvar: ${insertError.message}`,
              });
              continue;
            }
          }

          results.push({ ticker: ativo.ticker, success: true, preco });
          console.log(`Successfully saved price for ${ativo.ticker}`);
        }
      } catch (error) {
        console.error(`Error processing ${ativo.ticker}:`, error);
        results.push({
          ticker: ativo.ticker,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    const atualizados = results.filter(r => r.success).length;
    const falhas = results.filter(r => !r.success);

    console.log(`=== FINISHED: ${atualizados} updated, ${falhas.length} failures ===`);
    console.log('Results:', JSON.stringify(results, null, 2));

    return new Response(JSON.stringify({
      message: atualizados > 0 ? 'Preços atualizados' : 'Nenhum preço atualizado',
      atualizados,
      falhas,
      detalhes: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in update-prices:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
