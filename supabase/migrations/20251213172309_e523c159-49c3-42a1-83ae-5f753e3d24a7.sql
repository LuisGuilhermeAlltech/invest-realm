
-- Add conta_destino_id to proventos table (required for cash transaction)
ALTER TABLE public.proventos ADD COLUMN IF NOT EXISTS conta_destino_id uuid REFERENCES public.accounts(id);

-- Add cash_transaction_id to link provento to its cash transaction
ALTER TABLE public.proventos ADD COLUMN IF NOT EXISTS cash_transaction_id uuid REFERENCES public.cash_transactions(id);

-- Create function to sync proventos with cash_transactions
CREATE OR REPLACE FUNCTION public.sync_provento_cash_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_cash_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only create cash transaction if conta_destino_id is provided
    IF NEW.conta_destino_id IS NOT NULL THEN
      INSERT INTO public.cash_transactions (
        user_id, tipo, data, valor, moeda, conta_destino_id, ativo_id, descricao
      ) VALUES (
        NEW.user_id, 'PROVENTO', NEW.data, NEW.valor, NEW.moeda::text, 
        NEW.conta_destino_id, NEW.ativo_id, 'Gerado via Proventos'
      )
      RETURNING id INTO new_cash_id;
      
      -- Update the provento with the cash_transaction_id
      NEW.cash_transaction_id := new_cash_id;
    END IF;
    
    -- Update ativo dates
    UPDATE public.ativos
    SET 
      data_ultimo_provento = GREATEST(COALESCE(data_ultimo_provento, NEW.data), NEW.data),
      data_ultima_atualizacao_proventos = CURRENT_DATE
    WHERE id = NEW.ativo_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update linked cash transaction if exists
    IF NEW.cash_transaction_id IS NOT NULL THEN
      UPDATE public.cash_transactions
      SET 
        data = NEW.data,
        valor = NEW.valor,
        moeda = NEW.moeda::text,
        conta_destino_id = NEW.conta_destino_id,
        ativo_id = NEW.ativo_id
      WHERE id = NEW.cash_transaction_id;
    ELSIF NEW.conta_destino_id IS NOT NULL AND OLD.conta_destino_id IS NULL THEN
      -- Create new cash transaction if conta was added
      INSERT INTO public.cash_transactions (
        user_id, tipo, data, valor, moeda, conta_destino_id, ativo_id, descricao
      ) VALUES (
        NEW.user_id, 'PROVENTO', NEW.data, NEW.valor, NEW.moeda::text, 
        NEW.conta_destino_id, NEW.ativo_id, 'Gerado via Proventos'
      )
      RETURNING id INTO new_cash_id;
      
      NEW.cash_transaction_id := new_cash_id;
    END IF;
    
    -- Update ativo dates
    UPDATE public.ativos
    SET 
      data_ultimo_provento = GREATEST(COALESCE(data_ultimo_provento, NEW.data), NEW.data),
      data_ultima_atualizacao_proventos = CURRENT_DATE
    WHERE id = NEW.ativo_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete linked cash transaction
    IF OLD.cash_transaction_id IS NOT NULL THEN
      DELETE FROM public.cash_transactions WHERE id = OLD.cash_transaction_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for proventos sync
DROP TRIGGER IF EXISTS sync_provento_cash ON public.proventos;
CREATE TRIGGER sync_provento_cash
  BEFORE INSERT OR UPDATE OR DELETE ON public.proventos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_provento_cash_transaction();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_proventos_cash_transaction_id ON public.proventos(cash_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_descricao ON public.cash_transactions(descricao);
