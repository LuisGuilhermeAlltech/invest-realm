import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetMaster {
  asset_code: string;
  asset_type: string;
  symbol_public: string | null;
  currency: string;
}

interface SyncRequest {
  asset_codes?: string[];
  force?: boolean;
}

interface SyncResult {
  ok: boolean;
  updated: { prices: number; fx: number };
  errors: { asset_code: string; message: string }[];
}

// Fetch price from Yahoo Finance (works for BR stocks with .SA suffix, US stocks, and ETFs)
async function fetchYahooPrice(symbol: string): Promise<{ close: number; open?: number; high?: number; low?: number; volume?: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`Yahoo Finance error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const quote = data?.chart?.result?.[0];
    
    if (!quote) return null;
    
    const meta = quote.meta;
    const indicators = quote.indicators?.quote?.[0];
    
    return {
      close: meta?.regularMarketPrice ?? indicators?.close?.[0] ?? null,
      open: indicators?.open?.[0] ?? null,
      high: indicators?.high?.[0] ?? null,
      low: indicators?.low?.[0] ?? null,
      volume: indicators?.volume?.[0] ?? null,
    };
  } catch (error) {
    console.error(`Error fetching Yahoo price for ${symbol}:`, error);
    return null;
  }
}

// Fetch crypto price from CoinGecko
async function fetchCryptoPrice(symbol: string): Promise<{ close: number } | null> {
  try {
    // Map common symbols to CoinGecko IDs
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'AVAX': 'avalanche-2',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
    };
    
    const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const price = data[coinId]?.brl;
    
    return price ? { close: price } : null;
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error);
    return null;
  }
}

// Fetch USD/BRL exchange rate
async function fetchFxRate(): Promise<{ rate: number; date: string } | null> {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (!response.ok) return null;
    
    const data = await response.json();
    const rate = parseFloat(data.USDBRL?.bid);
    const date = data.USDBRL?.create_date?.split(' ')[0];
    
    return rate ? { rate, date: date || new Date().toISOString().split('T')[0] } : null;
  } catch (error) {
    console.error('Error fetching FX rate:', error);
    return null;
  }
}

// Infer public symbol based on asset type
function inferSymbol(assetCode: string, assetType: string): string | null {
  switch (assetType) {
    case 'acao_br':
    case 'fii':
      return `${assetCode}.SA`;
    case 'acao_us':
    case 'etf':
      return assetCode;
    case 'cripto':
      return assetCode; // Will use CoinGecko mapping
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const body: SyncRequest = await req.json().catch(() => ({}));
    const { asset_codes, force = false } = body;

    const today = new Date().toISOString().split('T')[0];
    const result: SyncResult = { ok: true, updated: { prices: 0, fx: 0 }, errors: [] };

    // Fetch assets from asset_master
    let query = supabase
      .from('asset_master')
      .select('asset_code, asset_type, symbol_public, currency')
      .eq('active', true);

    if (asset_codes && asset_codes.length > 0) {
      query = query.in('asset_code', asset_codes);
    }

    const { data: assets, error: assetsError } = await query;

    if (assetsError) {
      throw new Error(`Failed to fetch assets: ${assetsError.message}`);
    }

    // Process each asset
    for (const asset of (assets as AssetMaster[]) || []) {
      try {
        // Check if we already have today's price (unless force=true)
        if (!force) {
          const { data: existingPrice } = await supabase
            .from('market_prices_daily')
            .select('id')
            .eq('asset_code', asset.asset_code)
            .eq('ref_date', today)
            .maybeSingle();

          if (existingPrice) {
            continue; // Skip, already have today's price
          }
        }

        // Determine symbol to use
        const symbol = asset.symbol_public || inferSymbol(asset.asset_code, asset.asset_type);
        
        if (!symbol && asset.asset_type !== 'renda_fixa') {
          result.errors.push({
            asset_code: asset.asset_code,
            message: 'Simbolo publico nao configurado',
          });
          continue;
        }

        // Skip renda_fixa (no public price)
        if (asset.asset_type === 'renda_fixa') {
          continue;
        }

        // Fetch price based on asset type
        let priceData: { close: number; open?: number; high?: number; low?: number; volume?: number } | null = null;
        
        if (asset.asset_type === 'cripto') {
          priceData = await fetchCryptoPrice(symbol!);
        } else {
          priceData = await fetchYahooPrice(symbol!);
        }

        if (!priceData || priceData.close === null) {
          result.errors.push({
            asset_code: asset.asset_code,
            message: `Falha ao buscar preco para ${symbol}`,
          });
          continue;
        }

        // Upsert price
        const { error: upsertError } = await supabase
          .from('market_prices_daily')
          .upsert({
            user_id: userId,
            asset_code: asset.asset_code,
            ref_date: today,
            close: priceData.close,
            open: priceData.open ?? null,
            high: priceData.high ?? null,
            low: priceData.low ?? null,
            volume: priceData.volume ?? null,
            currency: asset.currency,
            source: asset.asset_type === 'cripto' ? 'coingecko' : 'yahoo_finance',
          }, {
            onConflict: 'user_id,asset_code,ref_date',
          });

        if (upsertError) {
          result.errors.push({
            asset_code: asset.asset_code,
            message: upsertError.message,
          });
        } else {
          result.updated.prices++;
        }
      } catch (error) {
        result.errors.push({
          asset_code: asset.asset_code,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // Update FX rate
    const fxData = await fetchFxRate();
    if (fxData) {
      const { error: fxError } = await supabase
        .from('fx_rates_daily')
        .upsert({
          user_id: userId,
          pair: 'USD/BRL',
          ref_date: today,
          rate: fxData.rate,
          source: 'awesomeapi',
        }, {
          onConflict: 'user_id,pair,ref_date',
        });

      if (!fxError) {
        result.updated.fx++;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
