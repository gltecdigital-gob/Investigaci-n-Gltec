import { createClient } from "@supabase/supabase-js";

export function requerir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta la variable de entorno ${nombre}. Revisa .env.local (ver .env.example).`);
    process.exit(1);
  }
  return valor;
}

/** Cliente con la clave secreta: salta las políticas de seguridad. Solo para scripts. */
export function clienteAdmin() {
  return createClient(requerir("NEXT_PUBLIC_SUPABASE_URL"), requerir("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
