import { getStore } from "@netlify/blobs";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const store = getStore("comentarios");

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export default async (req) => {

  // MOSTRAR COMENTARIOS
  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();

      const items = await Promise.all(
        blobs.map(async (b) => {
          const item = await store.get(b.key, { type: "json" });

          if (!item) return null;

          return {
            id: b.key,
            nombre: item.nombre,
            comentario: item.comentario,
            fecha: item.fecha
          };
        })
      );

      const lista = items
        .filter(Boolean)
        .sort((a, b) => b.fecha - a.fecha);

      return Response.json(lista);

    } catch (error) {
      console.error(error);
      return Response.json(
        { error: "No se pudieron cargar los comentarios" },
        { status: 500 }
      );
    }
  }

  // PUBLICAR COMENTARIO
  if (req.method === "POST") {
    let data;

    try {
      data = await req.json();
    } catch {
      return Response.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const nombre = (data.nombre || "").trim().slice(0, 60);
    const comentario = (data.comentario || "").trim().slice(0, 300);

    if (!nombre || !comentario) {
      return Response.json({ error: "Faltan datos" }, { status: 400 });
    }

    const token = randomBytes(32).toString("hex");
    const fecha = Date.now();
    const key = `c-${fecha}-${randomBytes(6).toString("hex")}`;

    await store.setJSON(key, {
      nombre,
      comentario,
      fecha,
      tokenHash: hashToken(token)
    });

    return Response.json(
      { id: key, nombre, comentario, fecha, token },
      { status: 201 }
    );
  }

  // ELIMINAR COMENTARIO
  if (req.method === "DELETE") {
    let data;

    try {
      data = await req.json();
    } catch {
      return Response.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const id = data.id;
    const token = data.token;

    if (
      typeof id !== "string" ||
      !/^c-[a-zA-Z0-9-]+$/.test(id) ||
      typeof token !== "string"
    ) {
      return Response.json({ error: "Solicitud inválida" }, { status: 400 });
    }

    const item = await store.get(id, { type: "json" });

    if (!item || !item.tokenHash) {
      return Response.json({ error: "No se encontró el comentario" }, { status: 404 });
    }

    const recibido = Buffer.from(hashToken(token));
    const guardado = Buffer.from(item.tokenHash);

    if (
      recibido.length !== guardado.length ||
      !timingSafeEqual(recibido, guardado)
    ) {
      return Response.json({ error: "No tenés permiso para eliminarlo" }, { status: 403 });
    }

    await store.delete(id);

    return Response.json({ ok: true });
  }

  return new Response("Método no permitido", { status: 405 });
};

export const config = { path: "/api/comentarios" };
