import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(unsubscribePage("Token manquant."), {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  try {
    const subscriber = await prisma.subscriber.findUnique({ where: { token } });

    if (!subscriber) {
      return new Response(unsubscribePage("Lien invalide ou déjà utilisé."), {
        headers: { "Content-Type": "text/html" },
        status: 404,
      });
    }

    await prisma.subscriber.delete({ where: { token } });

    return new Response(unsubscribePage(null), {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new Response(unsubscribePage("Erreur serveur."), {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
}

function unsubscribePage(error: string | null): string {
  const isSuccess = error === null;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StockRadar — Désinscription</title>
<style>
  body { margin:0; background:#000; color:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .card { max-width:400px; text-align:center; padding:48px 32px; }
  h1 { font-size:28px; font-weight:700; letter-spacing:-0.5px; margin:0 0 16px; }
  p { font-size:16px; color:#86868b; line-height:1.6; margin:0 0 32px; }
  a { color:#f5f5f7; text-decoration:none; border-bottom:1px solid #3a3a3e; }
</style>
</head>
<body>
  <div class="card">
    <h1>${isSuccess ? "Désinscription confirmée." : "Erreur"}</h1>
    <p>${isSuccess ? "Vous avez été retiré de la liste StockRadar. Vous ne recevrez plus de briefings." : error}</p>
    <a href="/">Retour à StockRadar</a>
  </div>
</body>
</html>`;
}
