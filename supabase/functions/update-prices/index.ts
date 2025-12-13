import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AtivoResult {
  ticker: string;
  ticker_normalizado: string;
  classe: string;
  provider: string;
  success: boolean;
  preco?: number;
  error?: string;
}

// Yahoo Finance API (free, no auth required)
async function fetchYahooPrice(ticker: string): Promise<{ price: number | null; error?: string }> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    console.log(`[Yahoo] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`[Yahoo] HTTP ${response.status}: ${text.substring(0, 200)}`);
      return { price: null, error: `Yahoo HTTP ${response.status}` };
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      console.error(`[Yahoo] No result for ${ticker}`);
      return { price: null, error: 'Ticker não encontrado no Yahoo Finance' };
    }
    
    // Get the most recent price
    const price = result.meta?.regularMarketPrice || 
                  result.indicators?.quote?.[0]?.close?.slice(-1)?.[0];
    
    if (price && price > 0) {
      console.log(`[Yahoo] SUCCESS: ${ticker} = ${price}`);
      return { price };
    }
    
    return { price: null, error: 'Preço não disponível' };
  } catch (error) {
    console.error(`[Yahoo] Error for ${ticker}:`, error);
    return { price: null, error: `Erro Yahoo: ${error instanceof Error ? error.message : 'desconhecido'}` };
  }
}

// CoinGecko API (free, limited rate)
async function fetchCoinGeckoPrice(coinId: string, currency: string): Promise<{ price: number | null; error?: string }> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;
    console.log(`[CoinGecko] Fetching: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return { price: null, error: `CoinGecko HTTP ${response.status}` };
    }
    
    const data = await response.json();
    const price = data?.[coinId]?.[currency];
    
    if (price && price > 0) {
      console.log(`[CoinGecko] SUCCESS: ${coinId} = ${price} ${currency.toUpperCase()}`);
      return { price };
    }
    
    return { price: null, error: `Crypto "${coinId}" não encontrada` };
  } catch (error) {
    console.error(`[CoinGecko] Error:`, error);
    return { price: null, error: `Erro CoinGecko: ${error instanceof Error ? error.message : 'desconhecido'}` };
  }
}

// Normalize ticker based on asset class
function normalizeTicker(ticker: string, classe: string): { normalized: string; provider: string } {
  const cleanTicker = ticker.trim().toUpperCase();
  
  switch (classe) {
    case 'acoes_br':
    case 'fii':
      // Brazilian assets need .SA suffix for Yahoo
      const brTicker = cleanTicker.replace('.SA', '');
      return { normalized: `${brTicker}.SA`, provider: 'yahoo' };
    
    case 'acoes_eua':
      // US assets use ticker as-is for Yahoo
      return { normalized: cleanTicker, provider: 'yahoo' };
    
    case 'cripto':
      return { normalized: cleanTicker, provider: 'coingecko' };
    
    case 'renda_fixa':
      return { normalized: cleanTicker, provider: 'manual' };
    
    default:
      return { normalized: cleanTicker, provider: 'unknown' };
  }
}

// Map crypto tickers to CoinGecko IDs
function getCoinGeckoId(ticker: string): string {
  const map: Record<string, string> = {
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
    'BNB': 'binancecoin',
    'USDT': 'tether',
    'USDC': 'usd-coin',
  };
  return map[ticker.toUpperCase()] || ticker.toLowerCase();
}

// Process assets in batches to avoid rate limiting
async function processBatch<T>(
  items: T[],
  batchSize: number,
  delayMs: number,
  processor: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
    
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
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

    const { data: ativos, error: ativosError } = await supabase
      .from('ativos')
      .select('id, ticker, classe, moeda_base')
      .eq('user_id', user.id)
      .eq('ativo', true);

    if (ativosError) {
      console.error('Error fetching ativos:', ativosError);
      throw ativosError;
    }

    console.log(`Found ${ativos?.length || 0} active assets:`, ativos?.map(a => `${a.ticker}(${a.classe})`));

    if (!ativos || ativos.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nenhum ativo encontrado',
        atualizados: 0,
        falhas: [],
        detalhes: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: AtivoResult[] = [];

    // Process assets
    const processAtivo = async (ativo: typeof ativos[0]) => {
      const { normalized, provider } = normalizeTicker(ativo.ticker, ativo.classe);
      
      console.log(`Processing: ${ativo.ticker} → ${normalized} (${provider})`);
      
      // Handle manual-only assets
      if (provider === 'manual') {
        results.push({
          ticker: ativo.ticker,
          ticker_normalizado: normalized,
          classe: ativo.classe,
          provider,
          success: false,
          error: 'Renda Fixa: atualize o preço manualmente na tabela',
        });
        return;
      }

      let preco: number | null = null;
      let error: string | undefined;

      if (provider === 'yahoo') {
        const result = await fetchYahooPrice(normalized);
        preco = result.price;
        error = result.error;
      } else if (provider === 'coingecko') {
        const coinId = getCoinGeckoId(ativo.ticker);
        const currency = ativo.moeda_base === 'USD' ? 'usd' : 'brl';
        const result = await fetchCoinGeckoPrice(coinId, currency);
        preco = result.price;
        error = result.error;
      }

      if (preco !== null && preco > 0) {
        // Upsert price
        const { data: existing } = await supabase
          .from('precos_ativos')
          .select('id')
          .eq('user_id', user.id)
          .eq('ativo_id', ativo.id)
          .maybeSingle();

        const priceData = {
          preco_atual: preco,
          moeda: ativo.moeda_base,
          atualizado_em: new Date().toISOString(),
          fonte: provider,
        };

        let saveError: string | null = null;

        if (existing) {
          const { error: updateError } = await supabase
            .from('precos_ativos')
            .update(priceData)
            .eq('id', existing.id);
          
          if (updateError) {
            saveError = updateError.message;
          }
        } else {
          const { error: insertError } = await supabase.from('precos_ativos').insert({
            user_id: user.id,
            ativo_id: ativo.id,
            ...priceData,
          });
          
          if (insertError) {
            saveError = insertError.message;
          }
        }

        if (saveError) {
          results.push({
            ticker: ativo.ticker,
            ticker_normalizado: normalized,
            classe: ativo.classe,
            provider,
            success: false,
            error: `Erro ao salvar: ${saveError}`,
          });
        } else {
          results.push({
            ticker: ativo.ticker,
            ticker_normalizado: normalized,
            classe: ativo.classe,
            provider,
            success: true,
            preco,
          });
          console.log(`✓ Saved: ${ativo.ticker} = ${preco}`);
        }
      } else {
        results.push({
          ticker: ativo.ticker,
          ticker_normalizado: normalized,
          classe: ativo.classe,
          provider,
          success: false,
          error: error || 'Preço não disponível',
        });
      }
    };

    // Process in batches of 5 with 500ms delay between batches
    await processBatch(ativos, 5, 500, processAtivo);

    const atualizados = results.filter(r => r.success).length;
    const falhas = results.filter(r => !r.success);

    console.log(`=== FINISHED: ${atualizados} updated, ${falhas.length} failures ===`);
    console.log('Results:', JSON.stringify(results, null, 2));

    return new Response(JSON.stringify({
      message: atualizados > 0 
        ? `${atualizados} preço(s) atualizado(s)` 
        : 'Nenhum preço atualizado',
      atualizados,
      falhas,
      detalhes: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in update-prices:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno',
      detalhes: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
