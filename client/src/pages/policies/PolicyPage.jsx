import { Link, useParams } from 'react-router-dom'
import './PolicyPage.css'

const updated = '3 November 2026'

const pages = {
  privacy: {
    title: 'Privacy Policy', eyebrow: 'Your data, explained', intro: 'This policy describes how BKR Gaming handles information when you use its Ludo and related website features.', sections: [
      ['Information we collect', ['Registration and profile information may include username, email address, optional phone number, profile image, and account credentials. Passwords are stored as hashes. The browser stores the current bearer authentication token in local storage; the server records the active session and may process session status, account security events, and support messages.', 'When you use the service, game rooms, match outcomes, gameplay history, wallet ledger entries, reward credits, and technical diagnostics may be recorded. The application infrastructure may also process IP address, browser, device, and request data for security and operation.']],
      ['How information is used', ['We use information to operate accounts and games, maintain game history and virtual balances, provide daily login rewards where enabled, prevent fraud and abuse, troubleshoot faults, respond to complaints, and meet lawful requests.', 'BKR should collect only information needed for those purposes and restrict access to staff who need it.']],
      ['Storage, security, and providers', ['Account and game records are stored in the project database. Security measures include password hashing, access controls, authenticated APIs, and session validation. No online service can promise absolute security.', 'Hosting, database, analytics, email, or other providers may process information to provide the service. The operator must publish the providers actually used and any applicable cross-border processing before launch.']],
      ['Wallet and virtual credits', ['Virtual coins are non-monetary gameplay records. They have no monetary value and cannot be purchased, redeemed, transferred, sold, or withdrawn. The virtual coin ledger records free rewards and permitted in-game use.']],
      ['Retention and deletion', ['Information is kept only as long as needed for account operation, security, complaint handling, dispute resolution, and legal obligations. Retention periods, account deletion procedures, and exceptions must be set by the operator and reviewed against applicable law.', 'To request access, correction, or deletion, use the Contact & Grievance page. We may need to verify your identity and retain records where the law requires.']],
      ['Your choices and complaints', ['You may request information about your personal data, ask for correction or deletion where available, and raise a privacy complaint. Contact details for the privacy/grievance officer are configuration placeholders until the operator supplies official details.']],
    ],
  },
  refunds: {
    title: 'Refund & Cancellation Policy', eyebrow: 'Credits, matches, and corrections', intro: 'This policy covers free virtual coins, game records, and technical corrections. BKR does not offer coin purchases or payment processing.', sections: [
      ['Virtual coins', ['Free promotional or gameplay credits have no monetary value. They cannot be purchased, redeemed for cash, withdrawn, transferred, sold, or exchanged for monetary rewards. No monetary refund is available for free virtual credits.']],
      ['Duplicate rewards and ledger errors', ['If a login reward is credited more than once, or a technical fault shows an incorrect balance, support can review the relevant account and transaction records. Confirmed errors may be corrected in the ledger. A correction is not a cash refund.']],
      ['Cancelled or interrupted matches', ['If a match is cancelled before play or interrupted by a verified technical issue, the game record and wallet ledger should be reviewed. Where the system incorrectly deducted a free gameplay credit, support may restore the incorrect deduction after verification.', 'A player leaving voluntarily, violating game rules, or losing a completed match does not by itself establish a technical balance error. Match settlement rules displayed in the game apply, subject to applicable law and operator review.']],
      ['How to contact support', ['Submit a Wallet & Credits complaint using the Contact & Grievance form. Include the approximate match time and room code if available. Do not include passwords, authentication tokens, or payment credentials. Attachments are not currently supported by this form.']],
    ],
  },
  terms: {
    title: 'User Terms & Conditions', eyebrow: 'Rules for using BKR', intro: 'By using BKR Gaming, you agree to use the service lawfully and follow the rules below. These terms require review by qualified Indian counsel before publication.', sections: [
      ['Eligibility and accounts', ['Provide accurate registration details, keep your credentials private, and use an account only for yourself. Eligibility, minimum age, and any parental controls must be confirmed by the operator for the markets where the service is offered.', 'BKR currently enforces one active authenticated device session per account. Log out on the active device before signing in elsewhere. Recovery must use a verified contact and one-time passcode; if that recovery feature is not configured, contact support.']],
      ['Fair play and private rooms', ['Do not cheat, use bots or automation, exploit bugs, collude, harass other players, manipulate match outcomes, or interfere with the service. Private room codes are for invited players; do not publish them without the host’s permission.', 'Report cheating or abusive behavior through Contact & Grievance. BKR may investigate using relevant game and security records.']],
      ['Ludo modes and turn rules', ['Time mode ends when its selected match timer expires. Move mode ends when its configured move limit is reached. Full Play has no overall time or move limit. The server enforces a twenty-second turn timer.', 'Tokens leave home on a six, follow the track and home lane, and require the exact remaining dice count to finish. A six or capture can grant an extra turn under the game rules. Safe cells protect tokens from capture. The current in-game rules and server behavior control if a display differs.']],
      ['Wallet and rewards', ['Daily login rewards are free promotional gameplay credits. Virtual coins have no monetary value and cannot be purchased, redeemed, transferred, sold, or withdrawn. BKR does not support paid entry, real-money wagering, cash winnings, or coin transfers.']],
      ['Suspension, intellectual property, and liability', ['We may restrict or suspend access for suspected fraud, abuse, cheating, security risks, or legal obligations, with review where appropriate. BKR names, software, artwork, and content are protected by their respective rights holders; users receive a limited right to use the service.', 'To the extent permitted by law, the service is provided without guarantees of uninterrupted availability. Nothing in these terms limits rights or remedies that cannot lawfully be excluded.']],
      ['Changes and disputes', ['We may update these terms and will show the latest revision date. Continued use after a change takes effect may require acceptance where applicable.', 'Governing law, competent courts, and dispute procedures must be completed by the operator with Indian counsel; no business address or jurisdictional facts have been supplied for this project.']],
    ],
  },
  responsible: {
    title: 'Responsible Gaming Policy', eyebrow: 'Play at your pace', intro: 'Games should be entertainment. Take breaks, stop when play is no longer enjoyable, and ask for help if gaming is affecting your wellbeing.', sections: [
      ['Healthy play', ['Set a time limit before you start, take regular breaks, and balance gaming with sleep, work, study, and time with others. Avoid playing when distressed or when it interferes with daily responsibilities.', 'BKR does not sell coins or offer monetary wagering, real-money stakes, or cash prizes.']],
      ['Safety and reporting', ['Use the report form to describe cheating, harassment, or other unsafe conduct. Include the match or room reference where possible. Do not share another person’s private information publicly.', 'Account restriction and self-exclusion controls are not currently implemented in this project. Contact the operator through the grievance form to request an account restriction while such controls are being developed.']],
      ['Support', ['If gameplay is causing concern, pause play and speak with someone you trust or a qualified local support professional. The operator must configure an official support contact before launch; this page does not invent one.']],
    ],
  },
}

function PolicyPage() {
  const { slug } = useParams()
  const page = pages[slug]
  if (!page) return null
  return (
    <main className="policy-page">
      <header className="policy-topbar"><Link to="/" className="policy-brand">BKR <span>GAMING</span></Link><Link to="/contact">Contact & Grievance</Link></header>
      <article className="policy-document">
        <span className="policy-eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p className="policy-intro">{page.intro}</p>
        <div className="policy-review-notice"><strong>Operator review required</strong><p>These policies are product information, not legal advice. Confirm the operator details, service availability, and applicable legal requirements with qualified counsel before publication.</p></div>
        <p className="policy-dates">Effective date: 3 November 2026 <span>·</span> Last updated: {updated}</p>
        {page.sections.map(([heading, paragraphs]) => <section key={heading}><h2>{heading}</h2>{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
        {slug === 'privacy' && <p className="policy-source">Indian privacy law reference: <a href="https://www.meity.gov.in/data-governance/digital-personal-data-protection-act-2023" target="_blank" rel="noreferrer">MeitY Digital Personal Data Protection Act materials</a>. Commencement is phased; counsel should confirm the provisions in force and applicable to BKR.</p>}
        {slug === 'terms' && <p className="policy-source">Online gaming regulation reference: <a href="https://www.meity.gov.in/documents/act-and-policies/promotion-andregulation-of-online-gaming-act-2025-and-its-corrigenda-kTMxQjMtQWa" target="_blank" rel="noreferrer">Promotion and Regulation of Online Gaming Act and current rules</a>. Game classification and obligations need legal review.</p>}
        {slug === 'responsible' && <p className="policy-source">The Promotion and Regulation of Online Gaming Rules, 2026 include user safety and grievance requirements for covered online social games. Applicability and product classification need legal review.</p>}
        <nav className="policy-related" aria-label="Related policies"><Link to="/policies/privacy">Privacy</Link><Link to="/policies/refunds">Refunds</Link><Link to="/policies/terms">Terms</Link><Link to="/policies/responsible">Responsible Gaming</Link><Link to="/contact">Contact</Link></nav>
      </article>
    </main>
  )
}

export default PolicyPage
