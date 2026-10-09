import { FormularioAcceso } from "./formulario";

export const metadata = { title: "Acceso · Investigación Gltec" };

export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Investigación Gltec</h1>
        <p className="mt-1 text-sm text-muted">
          Escribe tu correo y te enviamos un enlace de acceso. Ábrelo en este mismo navegador.
        </p>
        {error === "enlace" && (
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            El enlace no es válido o ya caducó. Pide uno nuevo.
          </p>
        )}
        <FormularioAcceso />
      </div>
    </main>
  );
}
