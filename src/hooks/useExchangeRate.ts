import { useQuery } from '@tanstack/react-query';

interface ExchangeRateData {
  rate: number;
  date: string;
  source: string;
}

async function fetchUsdBrl(): Promise<ExchangeRateData> {
  try {
    // Try AwesomeAPI (free, no auth required, Brazilian API)
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (response.ok) {
      const data = await response.json();
      const usdBrl = data.USDBRL;
      return {
        rate: parseFloat(usdBrl.bid),
        date: usdBrl.create_date,
        source: 'AwesomeAPI',
      };
    }
  } catch (error) {
    console.warn('AwesomeAPI failed, using fallback rate:', error);
  }

  // Fallback to a reasonable rate if API fails
  return {
    rate: 5.0,
    date: new Date().toISOString().split('T')[0],
    source: 'Fallback',
  };
}

export function useExchangeRate() {
  const query = useQuery({
    queryKey: ['exchangeRate', 'USD-BRL'],
    queryFn: fetchUsdBrl,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });

  return {
    usdBrl: query.data?.rate ?? 5.0,
    exchangeDate: query.data?.date ?? null,
    exchangeSource: query.data?.source ?? 'Fallback',
    isLoading: query.isLoading,
  };
}
