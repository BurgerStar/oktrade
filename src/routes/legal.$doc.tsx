import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "@/components/site/primitives";
import { Page, button, meta } from "@/components/content/ui";
type LegalDoc = { name: string; intro: string; sections: [string, string][] };
const documents: Record<string, LegalDoc> = {
  terms: {
    name: "Terms of service",
    intro:
      "The rules for using OK Trade, protecting your account and understanding the limits of this preview experience.",
    sections: [
      [
        "Scope and acceptance",
        "These terms govern access to the OK Trade website, its interfaces and preview account features. By using these services, you agree to follow these terms and applicable law. If you do not agree, stop using the service. Individual products may carry additional conditions that are shown before you enable them. OK Trade in this environment is a preview exchange: balances, orders, yields and API credentials do not represent real assets or enforceable claims against a custodian.",
      ],
      [
        "Eligibility and access",
        "You must be an adult with legal capacity in your place of residence and must not use the service where doing so is prohibited. You are responsible for checking restrictions that apply to you, including sanctions, licensing and financial promotion rules. We may restrict access to features based on location, security concerns or operational requirements. Access to a preview feature does not establish eligibility for a regulated financial product.",
      ],
      [
        "Account security",
        "Provide accurate information when creating an account and keep your credentials confidential. Do not share access or allow another person to impersonate you. Use a unique password, secure the email account associated with your profile and sign out on shared devices. Notify support promptly if you suspect unauthorized activity. Never provide private wallet keys or recovery phrases to anyone claiming to represent OK Trade.",
      ],
      [
        "Trading and illustrative balances",
        "Market information may come from third-party sources and may be delayed, incomplete or replaced by illustrative fallback data. Orders in this preview are state transitions rather than executions on a real venue. Displayed fills, profit and loss, reserve ratios and portfolio values are illustrative. Do not transfer funds to an address shown in a preview or rely on illustrative results to predict live performance.",
      ],
      [
        "Fees and product information",
        "Published fee tables, calculators and product terms explain a modeled experience and may change. Estimates can exclude spreads, network costs, funding, taxes or third-party charges. Review the applicable confirmation screen before any action. A displayed yield or historical return is not a guaranteed future return, and a calculator output is not investment, legal or tax advice.",
      ],
      [
        "Acceptable use",
        "Do not attempt unauthorized access, introduce malicious code, exploit a vulnerability against other users, impersonate another person or disrupt service availability. Automated access must respect published limits. Do not use the service for fraud, sanctions evasion, money laundering or infringement of intellectual property. Security issues should be reported privately through support rather than publicly exploited.",
      ],
      [
        "Service changes and suspension",
        "Features may be modified, interrupted or discontinued for maintenance, security, legal or operational reasons. We may suspend an account when there is reasonable evidence of misuse, compromise or a legal obligation. Where appropriate and permitted, we will explain restrictions and provide a way to contact support. Keep independent records of information that you need; preview account state may be reset or lost.",
      ],
      [
        "Intellectual property and feedback",
        "The OK Trade name, interface, written materials and software are protected by applicable intellectual property rights. You may use the interface for its intended purpose but may not misrepresent ownership or remove attribution in a manner that violates law. You retain rights in material you submit and grant only the permissions necessary to handle your request. Do not include confidential trading strategies or third-party secrets in unsolicited feedback.",
      ],
      [
        "Liability and mandatory rights",
        "The preview is provided on an as-available basis without a promise of continuous access, accurate pricing or fitness for a trading strategy. To the extent permitted by law, OK Trade is not responsible for losses arising from reliance on illustrative outcomes, third-party outages or insecure user devices. Nothing in these terms excludes liability that cannot legally be excluded or limits mandatory consumer rights.",
      ],
      [
        "Updates, disputes and support",
        "Material revisions will be reflected in the date on this page and, where appropriate, a notice in the service. Review changes before continuing to use affected features. Contact the help center with a description of any dispute and relevant records so it can be investigated. Any binding jurisdiction, arbitration arrangement or contracting entity for a future live product must be disclosed in that product’s actual agreement; this preview does not create those arrangements.",
      ],
    ],
  },
  privacy: {
    name: "Privacy policy",
    intro: "How information is used, how long it is needed and the choices available to you.",
    sections: [
      [
        "Scope and context",
        "This policy explains information handling in the OK Trade preview interface. It covers information you enter, local account preferences and technical information needed to deliver the experience. It does not cover independent websites or market-data providers. This preview does not claim to be a licensed custodian and should not receive real identity documents, bank details, private keys or sensitive financial records.",
      ],
      [
        "Information you provide",
        "You may provide an account identifier, a display name, preferences and information entered into support forms or interactive tools. Preview orders and portfolio activity may be stored as account state in your browser. Enter only information needed for the preview. A reserve verification input is used to generate an illustrative result and is not checked against an actual customer ledger.",
      ],
      [
        "Device and usage information",
        "A browser request can reveal network information such as an IP address, user agent, requested resource and request time to the server receiving it. Local storage may retain settings such as theme, display currency and preview account state. The browser can also contact third parties for public market data or asset imagery. Those providers receive connection information under their own practices.",
      ],
      [
        "Purposes and legal grounds",
        "Information is used to operate requested features, preserve preferences, prevent abuse, troubleshoot failures and respond to support requests. Where a legal basis is required, the appropriate basis may be performance of a requested service, compliance with a legal obligation or a proportionate legitimate interest in security. Optional tracking that legally requires consent should not be enabled before that consent. Consent may be withdrawn without affecting prior lawful processing.",
      ],
      [
        "Sharing and external providers",
        "Network requests to market-data and infrastructure providers disclose the information needed to establish those connections. Service providers may process information only for agreed purposes where contractual arrangements apply. Information may also be disclosed when required by valid legal process or necessary to investigate abuse, subject to applicable safeguards. We do not describe illustrative reserve tools as independent identity verification services.",
      ],
      [
        "Retention and deletion",
        "Browser-stored preferences and preview account state can persist until you clear site storage or a feature resets them. Clearing this data may remove balances, order history and session state from the preview experience. Operational records held by a service provider may have separate retention schedules based on security, legal or contractual needs. Information should not be retained longer than necessary for the purpose that justified its collection.",
      ],
      [
        "Security and transfers",
        "Use a supported browser and secure device. Although reasonable safeguards can reduce unauthorized access, no network or storage system is risk-free. Do not reuse a real exchange password in a preview environment. Providers may process requests in countries other than your own; applicable transfer safeguards depend on the provider, jurisdiction and actual processing arrangement. This page does not promise a particular data-residency location.",
      ],
      [
        "Your rights and choices",
        "Depending on where you live, you may have rights to access, correct, delete, restrict or object to processing, request portability, or withdraw consent. You may also have a right to complain to a data protection authority. Contact support to explain your request; identity verification may be necessary but should be proportionate. Some requests may be limited by legal obligations or the rights of others.",
      ],
      [
        "Children and sensitive information",
        "The service is intended for adults and is not designed for children. Do not submit information about a child or upload biometric records, government identification or health information to this preview. If you believe such information was entered, contact support with enough detail to locate the issue without repeating the sensitive information unnecessarily.",
      ],
      [
        "Policy updates and contact",
        "The last-updated date identifies the current version. Material changes should be communicated through the interface where appropriate. Review this policy together with the cookie policy for browser-storage details. Use the help center for privacy requests and include the affected feature and the outcome you seek; never include a password, private key or recovery phrase in a request.",
      ],
    ],
  },
  risk: {
    name: "Risk disclosure",
    intro: "Understand the uncertainties of digital assets before making any financial decision.",
    sections: [
      [
        "Read before participating",
        "Digital assets and derivatives are high-risk products. You can lose all funds committed to a position and, for certain leveraged arrangements, owe additional amounts. This disclosure describes important risks but cannot cover every situation. The OK Trade preview does not provide personal advice, assess suitability or execute real trades. Seek independent professional advice where needed and never risk funds required for essential expenses.",
      ],
      [
        "Price volatility",
        "Digital asset prices can move sharply in seconds, including during periods when you cannot access a trading interface. Historical prices and backtested outcomes are not reliable forecasts. A token can lose most or all of its value because of technical failures, market sentiment, concentrated ownership or a loss of confidence. Stable prices in a preview should not be taken as evidence of low risk.",
      ],
      [
        "Liquidity and execution",
        "A quoted price does not guarantee that an order can be filled at that price or size. Thin order books, widening spreads and rapid cancellations can produce slippage or partial execution. Market orders prioritize execution rather than price. Stop orders may trigger after a gap and fill at a substantially worse price. Network timeouts can leave an order’s status uncertain; reconcile status before submitting another order.",
      ],
      [
        "Leverage, margin and liquidation",
        "Leverage magnifies both gains and losses. Positions may be liquidated automatically if collateral falls below required maintenance levels, without waiting for a response from you. Funding payments, fees, collateral haircuts and correlated losses can accelerate liquidation. Cross-margin arrangements can expose collateral supporting other positions. Preview liquidation behavior is simplified and cannot establish the safety of a live strategy.",
      ],
      [
        "Custody and counterparty exposure",
        "Assets held with an exchange, custodian, issuer or lending provider depend on that party’s security and ability to meet obligations. Insolvency, fraud, legal restrictions or operational failures can delay or prevent recovery. A proof-of-reserves snapshot does not necessarily show all liabilities, encumbrances or ownership rights. An inclusion proof does not guarantee withdrawal availability or ongoing solvency.",
      ],
      [
        "Technology and cyber risk",
        "Private key loss, malicious software, phishing, account takeover and smart-contract defects can cause irreversible losses. Blockchain congestion, reorganizations, validator failures and software upgrades can disrupt transfers or settlement. Transactions sent to an incorrect address or unsupported network may not be recoverable. Test transfers and independent address checks reduce some risks but cannot eliminate them.",
      ],
      [
        "Stablecoins and token-specific risks",
        "A token intended to track a currency can lose its peg. Redemption may be restricted, suspended, subject to minimums or unavailable to you. Reserve assets, issuer governance and banking relationships create additional dependencies. Tokens may be delisted or become unusable following a protocol change, legal action or community split. Asset names and symbols alone do not establish the rights attached to a token.",
      ],
      [
        "Regulatory and tax uncertainty",
        "Rules differ across jurisdictions and may change quickly. A restriction can affect access, transfers, token classification or the enforceability of a claim. You are responsible for understanding applicable reporting and tax obligations. Trading gains, rewards, airdrops and token exchanges may be taxable even when no fiat currency is received. Consult a qualified adviser rather than relying on an interface estimate.",
      ],
      [
        "Data, automation and model limitations",
        "Market feeds can be stale, incorrect or unavailable. Illustrative fallback prices and fills in this preview may differ materially from real markets. Automated strategies can amplify mistakes, overtrade, exceed limits or continue operating after conditions change. Secure API credentials, apply least-privilege access and implement independent limits and monitoring. A successful backtest can reflect overfitting, missing costs or survivorship bias.",
      ],
      [
        "Personal responsibility and risk controls",
        "Assess your objectives, financial resources, experience and ability to withstand losses before using a live product. Diversification, position limits and stop orders are risk-management tools, not guarantees. Keep records, review exposures regularly and plan for service outages. If you do not understand a product’s settlement, collateral and worst-case behavior, do not trade it. Contact support for interface questions, not individualized investment recommendations.",
      ],
    ],
  },
  cookies: {
    name: "Cookie policy",
    intro: "A clear guide to cookies, browser storage and control over your device.",
    sections: [
      [
        "What this policy covers",
        "This policy describes cookies and similar browser technologies relevant to the OK Trade preview. A cookie is a small record a website asks your browser to store and send with matching requests. Local storage and session storage hold information accessible to site code. These technologies have different lifetimes and security properties, but each can affect privacy and device preferences.",
      ],
      [
        "Essential functionality",
        "Some storage is needed to deliver a requested feature, preserve a session or protect an application against misuse. Disabling essential storage may prevent sign-in, reset account state or break an intended workflow. Essential classification depends on the purpose of a technology, not merely its name. We do not treat optional advertising or cross-site tracking as essential to viewing a market page.",
      ],
      [
        "Preferences and preview account storage",
        "OK Trade can use local storage to remember theme, currency display, privacy preferences and preview account state. This can keep illustrative balances and activity available between visits on the same browser. Unlike a cookie, local storage is not automatically included with every network request. It is still accessible to scripts running with the site’s origin and should not be used to store private wallet keys.",
      ],
      [
        "Session and persistent lifetimes",
        "Session storage generally lasts for a browser tab’s session, while persistent storage can remain until explicitly cleared. Browser settings, private browsing modes and storage pressure can shorten these lifetimes. Do not depend on preview history as a permanent financial record. If you clear site data or change devices, settings and preview account activity may not follow you.",
      ],
      [
        "Analytics and advertising",
        "This policy does not assert that optional analytics or advertising trackers are enabled. If such tools are introduced, their purposes, providers and lifetimes should be explained before deployment, and consent obtained where required. Rejecting optional tracking should not prevent access to core features. Consent must be specific enough to distinguish measurement, personalization and advertising purposes when those uses differ.",
      ],
      [
        "Third-party connections",
        "The interface can request public prices, imagery or infrastructure resources from external providers. Those requests may expose IP address and browser metadata even when no cookie is stored. A provider may apply its own storage rules to its origin. Blocking third-party cookies does not necessarily block all network requests. Review the privacy policy as well as your browser’s network and privacy controls.",
      ],
      [
        "Managing browser storage",
        "Most browsers let you inspect cookies and site storage, clear data for one site, block third-party cookies or remove all browsing data. Look for privacy or site settings in your browser. Clearing OK Trade storage can sign you out and remove the preview state saved on that device. If you share a computer, sign out and clear relevant data after use, while recognizing that this cannot remove records already received by an external provider.",
      ],
      [
        "Consent and withdrawal",
        "Where optional storage requires consent, it should remain inactive until you make an affirmative choice. You should be able to change that choice with similar ease to granting it. Browser-level deletion removes existing local records but does not automatically communicate a request to erase server-side information. For broader rights requests, contact support and describe the relevant processing rather than sharing credentials.",
      ],
      [
        "Security and shared devices",
        "Browser storage is not a substitute for encryption, strong account security or a trusted device. Malicious extensions and compromised scripts can expose accessible information. Keep your browser updated, avoid untrusted extensions and use separate profiles on shared computers. The API-key tool keeps generated keys in component memory and is not a secure production credential vault.",
      ],
      [
        "Changes and assistance",
        "This policy may change when site features, providers or legal requirements change. The date above identifies the current version. Material changes involving optional storage should be presented with appropriate controls before activation. If you need help understanding a stored item, contact the help center with the item’s name, browser and affected feature, without including its secret value.",
      ],
    ],
  },
};

export const Route = createFileRoute("/legal/$doc")({
  head: ({ params }) => {
    const doc = documents[params.doc];
    return meta(
      doc?.name ?? "Legal document not found",
      doc?.intro ?? "Find OK Trade terms, privacy, risk and cookie policies.",
    );
  },
  component: Legal,
});
function Legal() {
  const { doc } = Route.useParams();
  const document = documents[doc];
  if (!document)
    return (
      <Page
        title="This document isn't here."
        eyebrow="OK Trade Legal"
        subtitle="The address may have changed. Choose a policy below or return to the help center."
      >
        <div className="flex flex-wrap gap-3">
          {Object.entries(documents).map(([slug, d]) => (
            <Link key={slug} to="/legal/$doc" params={{ doc: slug }} className={button}>
              {d.name}
            </Link>
          ))}
          <Link to="/help" className={button}>
            Visit help center
          </Link>
        </div>
      </Page>
    );
  return (
    <Container className="py-12 md:py-20">
      <header className="mb-12 border-b border-border pb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          OK Trade Legal center
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{document.name}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{document.intro}</p>
        <p className="mt-5 text-sm text-muted-foreground">
          Last updated <time dateTime="2026-07-01">July 1, 2026</time> • Product preview service
        </p>
        <nav aria-label="Legal documents" className="mt-8 flex flex-wrap gap-2">
          {Object.entries(documents).map(([slug, d]) => (
            <Link
              key={slug}
              to="/legal/$doc"
              params={{ doc: slug }}
              aria-current={slug === doc ? "page" : undefined}
              className={`rounded-full border border-border px-5 py-2.5 text-sm font-semibold ${slug === doc ? "bg-foreground text-background" : "hover:bg-accent"}`}
            >
              {d.name}
            </Link>
          ))}
        </nav>
      </header>
      <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
        <aside>
          <nav
            aria-label="Table of contents"
            className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24"
          >
            <p className="mb-4 text-sm font-bold">On this page</p>
            <ol className="space-y-3">
              {document.sections.map(([title], i) => (
                <li key={title}>
                  <a
                    className="block text-sm leading-6 text-muted-foreground hover:text-foreground"
                    href={`#${doc}-section-${i + 1}`}
                  >
                    <span className="tabular mr-2">{String(i + 1).padStart(2, "0")}</span>
                    {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <article className="max-w-3xl space-y-10">
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm leading-7 text-muted-foreground">
            These policies describe a preview interface, not an offer of a regulated financial
            service. Do not submit real funds, identity documents or production credentials.
          </div>
          {document.sections.map(([title, text], i) => (
            <section
              key={`${doc}-${title}`}
              id={`${doc}-section-${i + 1}`}
              className="scroll-mt-28"
            >
              <h2 className="mb-4 text-2xl font-bold tracking-tight">
                <span className="tabular mr-3 text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {title}
              </h2>
              <p className="leading-8 text-muted-foreground">{text}</p>
            </section>
          ))}
          <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8">
            <div>
              <p className="font-semibold">Questions about this policy?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Our help center is your starting point.
              </p>
            </div>
            <Link to="/help" className={button}>
              Get help
            </Link>
          </footer>
        </article>
      </div>
    </Container>
  );
}
