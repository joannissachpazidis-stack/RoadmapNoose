-- =====================================================================
-- Manager-Briefing: Zeitplan (jeden Mittwoch)
-- Im Supabase SQL-Editor ausführen, NACHDEM die Edge Function "coach" deployed ist.
-- Vorher die zwei Platzhalter ersetzen:
--   <PROJEKT-REF>  = der Teil vor ".supabase.co" in eurer Project URL
--   <CRON_SECRET>  = dasselbe frei gewählte Passwort, das ihr als Secret CRON_SECRET bei der Funktion hinterlegt habt
--
-- Der Job läuft jeden Mittwoch um 15:00 UTC (= 16:00 Uhr im Winter, 17:00 Uhr im Sommer).
-- Ob wöchentlich oder alle 2 Wochen ein Briefing kommt, stellt ihr in der App ein
-- (Coach & Manager → Manager) – die Funktion überspringt Wochen automatisch.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secrets sicher im Supabase Vault ablegen – legt sie an oder aktualisiert sie (beliebig oft ausführbar)
do $do$
declare sid uuid;
begin
  select id into sid from vault.secrets where name = 'band_project_url';
  if sid is null then perform vault.create_secret('https://<PROJEKT-REF>.supabase.co', 'band_project_url');
  else perform vault.update_secret(sid, 'https://<PROJEKT-REF>.supabase.co'); end if;

  select id into sid from vault.secrets where name = 'band_manager_cron_secret';
  if sid is null then perform vault.create_secret('<CRON_SECRET>', 'band_manager_cron_secret');
  else perform vault.update_secret(sid, '<CRON_SECRET>'); end if;
end
$do$;

-- Alten Job gleichen Namens entfernen (falls vorhanden) und neu anlegen
select cron.unschedule(jobid) from cron.job where jobname = 'band-manager-briefing';

select cron.schedule(
  'band-manager-briefing',
  '0 15 * * 3',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'band_project_url') || '/functions/v1/coach',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'band_manager_cron_secret')
    ),
    body := jsonb_build_object('trigger', 'briefing-cron'),
    timeout_milliseconds := 10000
  );
  $$
);

-- Kontrolle:
--   select jobname, schedule, active from cron.job;
--   select name, decrypted_secret = '<CRON_SECRET>' as passt from vault.decrypted_secrets where name like 'band_%';
-- Letzte Läufe: select * from cron.job_run_details order by start_time desc limit 5;
-- Antworten der Funktion: select status_code, content from net._http_response order by created desc limit 5;
