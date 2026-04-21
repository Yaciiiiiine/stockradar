import { prisma } from "@/lib/prisma";
import { sendConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    const existing = await prisma.subscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.verified) {
        return Response.json(
          { message: "Vous êtes déjà abonné à StockRadar." },
          { status: 200 }
        );
      }
      await sendConfirmationEmail(email, existing.token);
      return Response.json(
        { message: "Un email de confirmation vous a été renvoyé." },
        { status: 200 }
      );
    }

    const subscriber = await prisma.subscriber.create({
      data: { email },
    });

    await sendConfirmationEmail(email, subscriber.token);

    return Response.json(
      { message: "Vérifiez votre boîte mail pour confirmer votre inscription." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Subscribe error:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
