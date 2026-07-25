import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection, LegalField } from "@/components/LegalLayout";
import { LEGAL, UNCONFIRMED_RETENTION_MONTHS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité — StockRadar",
  description:
    "Quelles données StockRadar collecte, pourquoi, combien de temps, et comment exercer vos droits RGPD.",
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      title="Confidentialité"
      intro="Comment StockRadar traite vos données personnelles, en application du règlement (UE) 2016/679 (RGPD) et de la loi Informatique et Libertés."
    >
      <LegalSection title="Responsable de traitement">
        <dl className="mt-2">
          <LegalField label="Responsable" value={LEGAL.editorName} />
          <LegalField label="Adresse" value={LEGAL.editorAddress} />
          <LegalField
            label="Contact (exercice des droits)"
            value={LEGAL.contactEmail}
          />
        </dl>
        <p>
          Le traitement ne relève pas des cas imposant la désignation d&apos;un délégué
          à la protection des données (article 37 du RGPD).
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <p>
          <strong className="text-[#f5f5f7]">
            Une seule donnée personnelle est collectée : votre adresse email
          </strong>
          , et uniquement si vous vous inscrivez volontairement à la newsletter. Elle
          est accompagnée de la date d&apos;inscription, d&apos;un identifiant technique
          aléatoire servant à la confirmation et à la désinscription, et de l&apos;état
          de votre confirmation.
        </p>
        <p>
          La consultation du site ne requiert aucune inscription. Le site n&apos;utilise
          ni cookie de mesure d&apos;audience, ni cookie publicitaire, ni traceur tiers
          : aucun bandeau de consentement n&apos;est donc nécessaire.
        </p>
      </LegalSection>

      <LegalSection title="Finalité et base légale">
        <p>
          Votre adresse email sert exclusivement à vous envoyer le briefing boursier
          quotidien et le compte-rendu du soir. Elle n&apos;est jamais utilisée à
          d&apos;autres fins.
        </p>
        <p>
          La base légale du traitement est votre{" "}
          <strong className="text-[#f5f5f7]">
            consentement, au sens de l&apos;article 6.1.a du RGPD
          </strong>
          . Ce consentement est recueilli par un double opt-in : après soumission du
          formulaire, l&apos;inscription n&apos;est active qu&apos;une fois le lien de
          confirmation reçu par email cliqué. Tant que cette confirmation n&apos;a pas
          eu lieu, aucun briefing n&apos;est envoyé.
        </p>
        <p>
          Vous pouvez retirer votre consentement à tout moment, aussi facilement que
          vous l&apos;avez donné, via le lien de désinscription présent en bas de chaque
          email. Le retrait ne remet pas en cause la licéité des envois effectués avant
          celui-ci.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Votre adresse est conservée{" "}
          <strong className="text-[#f5f5f7]">tant que vous restez abonné</strong>. La
          désinscription entraîne la suppression immédiate et définitive de
          l&apos;enregistrement de la base : aucune liste de suppression n&apos;est
          conservée.
        </p>
        <p>
          Les inscriptions non confirmées sont supprimées au plus tard{" "}
          {UNCONFIRMED_RETENTION_MONTHS} mois après leur création, faute de consentement
          valablement recueilli.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <p>
          Vos données ne sont ni vendues, ni louées, ni transmises à des tiers à des
          fins commerciales. Elles sont accessibles à l&apos;éditeur et aux prestataires
          techniques strictement nécessaires au service :
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-[#48484a]">
          <li>
            <strong className="text-[#f5f5f7]">Vercel Inc.</strong> — hébergement du
            site et exécution des tâches planifiées.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">Neon</strong> — hébergement de la base de
            données PostgreSQL contenant les adresses.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">Resend</strong> — routage des emails de
            confirmation et des briefings.
          </li>
        </ul>
        <p>
          Certains de ces prestataires sont établis aux États-Unis. Les transferts
          éventuels hors Union européenne s&apos;appuient sur les clauses contractuelles
          types de la Commission européenne et, le cas échéant, sur la certification au
          Data Privacy Framework du prestataire concerné.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>Vous disposez, sur les données vous concernant, des droits suivants :</p>
        <ul className="list-disc pl-5 space-y-2 marker:text-[#48484a]">
          <li>
            <strong className="text-[#f5f5f7]">Droit d&apos;accès</strong> (art. 15) —
            obtenir la confirmation que vos données sont traitées et en recevoir une
            copie.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">Droit de rectification</strong> (art. 16)
            — faire corriger une adresse inexacte.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">Droit à l&apos;effacement</strong> (art.
            17) — obtenir la suppression de vos données ; le lien de désinscription le
            fait immédiatement.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">
              Droit à la limitation du traitement
            </strong>{" "}
            (art. 18).
          </li>
          <li>
            <strong className="text-[#f5f5f7]">Droit à la portabilité</strong> (art. 20)
            — recevoir vos données dans un format structuré et lisible par machine, ou
            les faire transmettre à un autre responsable.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">Droit d&apos;opposition</strong> (art.
            21) — vous opposer à tout moment au traitement.
          </li>
          <li>
            <strong className="text-[#f5f5f7]">
              Droit de retirer votre consentement
            </strong>{" "}
            (art. 7.3), à tout moment.
          </li>
        </ul>
        <p>
          Ces droits s&apos;exercent par email auprès du responsable de traitement, à
          l&apos;adresse indiquée en haut de cette page. Une réponse vous sera apportée
          dans un délai d&apos;un mois. Pour la seule suppression, le lien de
          désinscription en bas de chaque email est immédiat et ne nécessite aucune
          démarche.
        </p>
      </LegalSection>

      <LegalSection title="Réclamation">
        <p>
          Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
          respectés, vous pouvez introduire une réclamation auprès de la Commission
          nationale de l&apos;informatique et des libertés (CNIL), 3 place de Fontenoy,
          TSA 80715, 75334 Paris Cedex 07 —{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[#f5f5f7] underline underline-offset-4 decoration-[#3a3a3e] hover:decoration-[#86868b] transition-colors"
          >
            cnil.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les échanges avec le site sont chiffrés en HTTPS. L&apos;accès à la base de
          données est restreint et authentifié. Les routes techniques (tâches
          planifiées, diagnostic) sont protégées par un secret partagé.
        </p>
      </LegalSection>

      <LegalSection title="Informations sur l'éditeur">
        <p>
          Les coordonnées complètes de l&apos;éditeur figurent dans les{" "}
          <Link
            href="/mentions-legales"
            className="text-[#f5f5f7] underline underline-offset-4 decoration-[#3a3a3e] hover:decoration-[#86868b] transition-colors"
          >
            mentions légales
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
