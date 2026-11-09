import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });

  let data;
  try { data = await req.json(); }
  catch { return Response.json({ error: "Datos inválidos" }, { status: 400 }); }

  const nombre = (data.nombre || "").trim().slice(0, 60);
  const email = (data.email || "").trim().toLowerCase().slice(0, 120);

  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Revisá el nombre y el email" }, { status: 400 });
  }

  const store = getStore("suscriptores");
  await store.setJSON(`s-${email}`, { nombre, email, fecha: Date.now() });
  return Response.json({ ok: true }, { status: 201 });
};

export const config = { path: "/api/suscribir" };
