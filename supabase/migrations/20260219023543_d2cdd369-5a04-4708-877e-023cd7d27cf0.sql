
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  year_str TEXT;
  seq_num INT;
  new_number TEXT;
  max_retries INT := 5;
  attempt INT := 0;
BEGIN
  year_str := to_char(now(), 'YYYY');
  
  LOOP
    attempt := attempt + 1;
    
    -- Lock the invoices table rows for this year to prevent race conditions
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 8) AS INT)), 0) + 1
      INTO seq_num
      FROM public.invoices
      WHERE invoice_number LIKE 'INV' || year_str || '%'
      FOR UPDATE;
    
    new_number := 'INV' || year_str || LPAD(seq_num::TEXT, 4, '0');
    
    -- Check if this number already exists
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = new_number) THEN
      NEW.invoice_number := new_number;
      RETURN NEW;
    END IF;
    
    IF attempt >= max_retries THEN
      RAISE EXCEPTION 'Could not generate unique invoice number after % attempts', max_retries;
    END IF;
  END LOOP;
END;
$function$;
