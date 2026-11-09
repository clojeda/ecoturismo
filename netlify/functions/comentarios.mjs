import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("comentarios");

  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();
      const items = await Promise.all(
        blobs.map(async (b) => {
          try { return await store.get(b.key, { type: "json" }); }
          catch { return null; }
        })
      );
      const lista = items.filter(Boolean).sort((a, b) => b.fecha - a.fecha);
      return Response.json(lista);
    } catch {
      return Response.json([]);
    }
  }

  if (req.method === "POST") {
    let data;
    try { data = await req.json(); }
    catch { return Response.json({ error: "Datos inválidos" }, { status: 400 }); }

    const nombre = (data.nombre || "").trim().slice(0, 60);
    const comentario = (data.comentario || "").trim().slice(0, 300);

    if (!nombre || !comentario) {
      return Response.json({ error: "Faltan datos" }, { status: 400 });
    }

    const item = { nombre, comentario, fecha: Date.now() };
    const key = `c-${item.fecha}-${Math.random().toString(36).slice(2, 8)}`;
    await store.setJSON(key, item);
    return Response.json(item, { status: 201 });
  }

  return new Response("Método no permitido", { status: 405 });
};

export const config = { path: "/api/comentarios" };
