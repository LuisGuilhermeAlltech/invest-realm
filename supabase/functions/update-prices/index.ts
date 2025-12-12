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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
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
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Updating prices for user: ${user.id}`);

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
          const brapiResponse = await fetch(`https://brapi.dev/api/quote/${ativo.ticker}?token=demo`);
          if (brapiResponse.ok) {
            const brapiData = await brapiResponse.json();
            if (brapiData.results && brapiData.results.length > 0 && brapiData.results[0].regularMarketPrice) {
              preco = brapiData.results[0].regularMarketPrice;
              fonte = 'brapi';
              console.log(`BRAPI: ${ativo.ticker} = ${preco}`);
            }
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
          
          const cgResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`);
          if (cgResponse.ok) {
            const cgData = await cgResponse.json();
            if (cgData[coinId] && cgData[coinId][currency]) {
              preco = cgData[coinId][currency];
              fonte = 'coingecko';
              console.log(`CoinGecko: ${ativo.ticker} = ${preco}`);
            }
          }
        } else if (ativo.classe === 'acoes_eua') {
          // Skip US stocks for now
          results.push({
            ticker: ativo.ticker,
            success: false,
            error: 'Ações EUA: funcionalidade em breve',
          });
          continue;
        }

        if (preco !== null && preco > 0) {
          // Upsert price
          const { data: existing } = await supabase
            .from('precos_ativos')
            .select('id')
            .eq('user_id', user.id)
            .eq('ativo_id', ativo.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('precos_ativos')
              .update({
                preco_atual: preco,
                moeda: ativo.moeda_base,
                atualizado_em: new Date().toISOString(),
                fonte,
              })
              .eq('id', existing.id);
          } else {
            await supabase.from('precos_ativos').insert({
              user_id: user.id,
              ativo_id: ativo.id,
              preco_atual: preco,
              moeda: ativo.moeda_base,
              atualizado_em: new Date().toISOString(),
              fonte,
            });
          }

          results.push({ ticker: ativo.ticker, success: true, preco });
        } else {
          results.push({
            ticker: ativo.ticker,
            success: false,
            error: 'Cotação não encontrada',
          });
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

    console.log(`Updated ${atualizados} prices, ${falhas.length} failures`);

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
