"use client";

import { useState, type FormEvent } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

type Estado = { tipo: "inicial" | "enviando" | "enviado" } | { tipo: "error"; mensaje: string };

export function FormularioAcceso() {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEstado({ tipo: "enviando" });
    const { error } = await clienteNavegador().auth.signInWithOtp({
      email: correo.trim(),
      options: {
        // Solo entran cuentas que ya existen: se dan de alta desde el panel de Supabase.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setEstado(
      error
        ? {
            tipo: "error",
            mensaje:
              error.status === 429
                ? "Demasiados intentos. Espera un minuto y vuelve a probar."
                : "No pudimos enviar el enlace. Comprueba que tu correo esté dado de alta.",
          }
        : { tipo: "enviado" },
    );
  }

  if (estado.tipo === "enviado") {
    return (
      <p className="mt-6 rounded-md border border-line bg-surface px-3 py-3 text-sm">
        Enlace enviado a <strong>{correo}</strong>. Revisa tu bandeja de entrada.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-3">
      <label className="block text-sm font-medium" htmlFor="correo">
        Correo
      </label>
      <input
        id="correo"
        type="email"
        required
        autoComplete="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={estado.tipo === "enviando"}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {estado.tipo === "enviando" ? "Enviando…" : "Enviar enlace de acceso"}
      </button>
      {estado.tipo === "error" && <p className="text-sm text-red-600">{estado.mensaje}</p>}
    </form>
  );
}
