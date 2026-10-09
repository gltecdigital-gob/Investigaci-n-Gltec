import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

// Destino del enlace que llega por correo: cambia el código por una sesión.
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  const destino = request.nextUrl.clone();
  destino.search = "";

  if (codigo) {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) {
      destino.pathname = "/";
      return NextResponse.redirect(destino);
    }
  }
  destino.pathname = "/login";
  destino.searchParams.set("error", "enlace");
  return NextResponse.redirect(destino);
}
