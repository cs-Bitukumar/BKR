import { useState } from 'react'
import { Link } from 'react-router-dom'
import { post } from '../../api/api'
import './PolicyPage.css'

const categories = [['account', 'Account and login'], ['wallet', 'Wallet and virtual coins'], ['game', 'Game bug or technical issue'], ['abuse', 'Cheating or abusive behavior'], ['privacy', 'Privacy complaint'], ['other', 'Other']]
const contacts = {
  support: import.meta.env.VITE_BKR_SUPPORT_EMAIL?.trim() || '[Configure official support email]',
  officer: import.meta.env.VITE_BKR_GRIEVANCE_OFFICER_NAME?.trim() || '[Configure officer name]',
  designation: import.meta.env.VITE_BKR_GRIEVANCE_OFFICER_DESIGNATION?.trim() || '[Configure designation]',
  email: import.meta.env.VITE_BKR_GRIEVANCE_OFFICER_EMAIL?.trim() || '[Configure official contact email]',
  address: import.meta.env.VITE_BKR_BUSINESS_ADDRESS?.trim() || '[Configure registered business address]',
}
const contactConfigured = Object.values(contacts).every((value) => !value.startsWith('[Configure'))

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', category: 'account', subject: '', details: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setReferenceId('')
    try {
      const result = await post('/api/complaints', form)
      setReferenceId(result.referenceId)
      setForm((current) => ({ ...current, subject: '', details: '' }))
    } catch (err) { setError(err.message || 'Unable to submit complaint.') }
    finally { setBusy(false) }
  }
  return (
    <main className="policy-page">
      <header className="policy-topbar"><Link to="/" className="policy-brand">BKR <span>GAMING</span></Link><Link to="/policies/terms">Terms & Conditions</Link></header>
      <article className="policy-document contact-document">
        <span className="policy-eyebrow">We’re here to listen</span><h1>Contact & Grievance Redressal</h1>
        <p className="policy-intro">Use the form for account, wallet, gameplay, abuse, or privacy complaints. Keep your reference ID for follow-up.</p>
        <p className="policy-dates">Effective date: 3 November 2026 <span>·</span> Last updated: 3 November 2026</p>
        {!contactConfigured && <div className="policy-review-notice"><strong>Official contact details need configuration</strong><p>Set the public VITE_BKR_* contact values in the client deployment environment. The form below creates a private support case, but these placeholders must be replaced before publication.</p></div>}
        <section><h2>Support channels</h2><div className="contact-config-grid"><div><span>General support</span><strong>{contacts.support}</strong></div><div><span>Grievance officer</span><strong>{contacts.officer}</strong></div><div><span>Designation</span><strong>{contacts.designation}</strong></div><div><span>Officer email</span><strong>{contacts.email}</strong></div><div className="contact-address"><span>Business address</span><strong>{contacts.address}</strong></div></div></section>
        <section><h2>Submit a complaint</h2>
          {referenceId && <p className="complaint-success" role="status">Your complaint was submitted. Reference ID: <strong>{referenceId}</strong>. Save this ID for follow-up.</p>}
          {error && <p className="complaint-error" role="alert">{error}</p>}
          <form className="complaint-form" onSubmit={submit}>
            <label>Your name<input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Registered email<input required type="email" maxLength="254" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Complaint category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Subject<input required maxLength="160" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="complaint-wide">Detailed complaint<textarea required minLength="10" maxLength="5000" rows="7" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></label>
            <p className="complaint-wide attachment-note">Attachments are not currently supported. Do not include passwords, login tokens, or payment credentials.</p>
            <button className="complaint-submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit complaint'}</button>
          </form>
        </section>
        <section><h2>Acknowledgment and resolution</h2><p>BKR aims to acknowledge complaints within 24 hours and provide a response within 15 days. The Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 set 24-hour acknowledgment and 15-day resolution requirements for covered intermediaries. BKR’s legal classification and applicability must be confirmed by counsel. The Promotion and Regulation of Online Gaming Rules, 2026 provide an appeal to the Online Gaming Authority within 30 days in the circumstances stated in Rule 20; see the current <a href="https://www.meity.gov.in/static/uploads/2026/04/7e0b02d37fd07f81fa48578a9996aa85.pdf" target="_blank" rel="noreferrer">official rules</a>.</p><p>These are service targets and a summary of rules checked on 3 November 2026, not a guarantee of legal compliance. Obtain Indian legal review before publication.</p></section>
        <nav className="policy-related" aria-label="Related policies"><Link to="/policies/privacy">Privacy</Link><Link to="/policies/refunds">Refunds</Link><Link to="/policies/terms">Terms</Link><Link to="/policies/responsible">Responsible Gaming</Link></nav>
      </article>
    </main>
  )
}

export default ContactPage
