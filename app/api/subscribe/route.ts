import { prisma } from "@/lib/prisma";
import { sendConfirmationEmail, MissingApiKeyError } from "@/lib/email";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";
import { writeAlert } from "@/lib/logger";

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
      data: { email, token: generateUnsubscribeToken() },
    });

    await sendConfirmationEmail(email, subscriber.token);

    return Response.json(
      { message: "Vérifiez votre boîte mail pour confirmer votre inscription." },
      { status: 201 }
    );
  } catch (err) {
    // Sans clé Resend, le double opt-in ne peut jamais aboutir. Annoncer
    // "vérifiez votre boîte mail" serait un mensonge : on le dit.
    if (err instanceof MissingApiKeyError) {
      writeAlert(
        "CONFIG_MISSING",
        `subscribe — ${err.message} L'inscription ne peut pas être confirmée.`
      );
      return Response.json(
        {
          error:
            "L'envoi d'emails est indisponible pour le moment. Réessayez plus tard.",
        },
        { status: 503 }
      );
    }
    console.error("Subscribe error:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
