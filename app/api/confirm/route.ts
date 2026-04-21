import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Token manquant." }, { status: 400 });
  }

  try {
    const subscriber = await prisma.subscriber.findUnique({ where: { token } });

    if (!subscriber) {
      return Response.json({ error: "Token invalide." }, { status: 404 });
    }

    if (!subscriber.verified) {
      await prisma.subscriber.update({
        where: { token },
        data: { verified: true },
      });
    }

    redirect("/?confirmed=1");
  } catch {
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
