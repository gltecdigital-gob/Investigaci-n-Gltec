import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de Supabase para componentes de servidor y rutas. Actúa con la sesión del usuario. */
export async function clienteServidor() {
  const almacen = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          try {
            for (const { name, value, options } of lista) almacen.set(name, value, options);
          } catch {
            // En un componente de servidor no se pueden escribir cookies;
            // src/proxy.ts se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
