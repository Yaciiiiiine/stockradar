import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalLayout,
  LegalSection,
  LegalField,
} from "@/components/LegalLayout";
import { LEGAL, HOST, AMF_DISCLAIMER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales — StockRadar",
  description:
    "Éditeur, hébergeur et conditions d'utilisation du site StockRadar.",
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      title="Mentions légales"
      intro="Informations requises par l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN)."
    >
      <LegalSection title="Éditeur du site">
        <dl className="mt-2">
          <LegalField label="Nom / raison sociale" value={LEGAL.editorName} />
          <LegalField label="Forme juridique" value={LEGAL.editorLegalForm} />
          <LegalField label="Adresse" value={LEGAL.editorAddress} />
          <LegalField label="SIREN / SIRET" value={LEGAL.editorSiren} />
          <LegalField label="TVA intracommunautaire" value={LEGAL.editorVat} />
          <LegalField
            label="Directeur de la publication"
            value={LEGAL.publicationDirector}
          />
          <LegalField label="Contact" value={LEGAL.contactEmail} />
        </dl>
      </LegalSection>

      <LegalSection title="Hébergeur">
        <p>
          Le site est hébergé par <strong className="text-[#f5f5f7]">{HOST.name}</strong>,{" "}
          {HOST.address}.
        </p>
        <p>
          Site web :{" "}
          <a
            href={HOST.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[#f5f5f7] underline underline-offset-4 decoration-[#3a3a3e] hover:decoration-[#86868b] transition-colors"
          >
            vercel.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Nature du service">
        <p>
          StockRadar publie chaque jour ouvré une sélection d&apos;actions
          françaises et américaines accompagnée d&apos;éléments de contexte, ainsi
          qu&apos;un compte-rendu de séance. Le service est gratuit et diffusé
          sur le site et, sur inscription, par courrier électronique.
        </p>
        <p>
          Les cours et données de marché proviennent de fournisseurs tiers
          (Finnhub, Yahoo Finance). Ils sont fournis à titre indicatif, peuvent
          être différés, incomplets ou erronés, et ne sauraient engager la
          responsabilité de l&apos;éditeur.
        </p>
      </LegalSection>

      <LegalSection title="Avertissement — services d'investissement">
        <div className="border border-[#3a3a3e] rounded-2xl p-6 bg-[#1c1c1e]">
          <p className="text-[#f5f5f7]">{AMF_DISCLAIMER}</p>
        </div>
        <p>
          L&apos;éditeur n&apos;est ni agréé ni enregistré auprès de
          l&apos;Autorité des marchés financiers (AMF) ou de l&apos;Autorité de
          contrôle prudentiel et de résolution (ACPR). Aucun contenu publié ne
          constitue une sollicitation, une offre, un conseil personnalisé ni une
          incitation à acheter ou vendre un instrument financier.
        </p>
        <p>
          Investir en bourse comporte un risque de perte en capital. Les
          performances passées ne préjugent pas des performances futures. Toute
          décision d&apos;investissement relève de la seule responsabilité du
          lecteur, qui est invité à consulter un professionnel agréé.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les textes, la charte graphique et le code source du site sont la
          propriété de l&apos;éditeur, à l&apos;exception des données de marché
          et des marques citées, qui restent la propriété de leurs titulaires
          respectifs. Toute reproduction intégrale ou substantielle sans
          autorisation préalable est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link
            href="/confidentialite"
            className="text-[#f5f5f7] underline underline-offset-4 decoration-[#3a3a3e] hover:decoration-[#86868b] transition-colors"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
