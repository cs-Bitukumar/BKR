import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { get, put } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import "./ProfilePage.css";
import "./ProfilePageResponsive.css";
import { profileAchievements } from "./profileData";
import { formatCurrency, readWalletState } from "../../utils/wallet";

const matchName = (bet) =>
  typeof bet?.match === "string"
    ? bet.match
    : bet?.match && typeof bet.match === "object"
      ? `${bet.match.homeTeam || "Team A"} vs ${bet.match.awayTeam || "Team B"}`
      : bet?.selection || "Bet record";
const getInitials = (name = "BKR User") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function ProfilePage() {
  const { user, token, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", phone: "", profileImage: "" });

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!token) return setLoading(false);
      try {
        const [profileData, betsData] = await Promise.all([
          get("/api/users/me", token),
          get("/api/bets", token),
        ]);
        if (cancelled) return;
        setProfile(profileData.user || profileData);
        const nextProfile = profileData.user || profileData;
        setForm({
          username: nextProfile.username || "",
          phone: nextProfile.phone || "",
          profileImage: nextProfile.profileImage || "",
        });
        setBets(Array.isArray(betsData) ? betsData : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const safeUser = profile || user || {};
  const walletState = readWalletState(safeUser);
  const name = safeUser.username || "BKR User";
  const profileMetrics = useMemo(() => {
    const level = Math.max(1, Math.floor(bets.length / 10) + 1);
    const levelBets = bets.length % 10;
    const progress = Math.round((levelBets / 10) * 100);
    return {
      level,
      progress,
      rank: safeUser.role === "admin" ? "Admin Rank" : level >= 10 ? "Elite Rank" : "Rising Rank",
      xp: `${bets.length * 100} / ${(level * 10) * 100} XP`,
    };
  }, [bets.length, safeUser.role]);
  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await put("/api/users/me", form, token);
      const updatedUser = updated.user || updated;
      setProfile(updatedUser);
      refreshUser(updatedUser);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 500 * 1024) {
      setError("Profile image must be 500 KB or smaller");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, profileImage: reader.result }));
      setError(null);
    };
    reader.onerror = () => setError("Unable to read the selected image");
    reader.readAsDataURL(file);
  }
  const stats = useMemo(() => {
    const total = bets.length;
    const wins = bets.filter((bet) => bet.status === "won").length;
    const losses = bets.filter((bet) => bet.status === "lost").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;

    return [
      { label: "Total Bets", value: total.toLocaleString("en-IN"), icon: "analytics" },
      { label: "Wins", value: wins.toLocaleString("en-IN"), icon: "check_circle" },
      { label: "Losses", value: losses.toLocaleString("en-IN"), icon: "cancel" },
      { label: "Win Rate", value: `${winRate}%`, icon: "insights" },
    ];
  }, [bets]);
  const recentBets = useMemo(
    () =>
      bets.slice(0, 4).map((bet) => ({
        match: matchName(bet),
        result: String(bet.status || "pending").toUpperCase(),
        category: bet.match?.status
          ? String(bet.match.status).toUpperCase()
          : "LIVE MARKET",
        amount:
          bet.status === "won"
            ? `+${formatCurrency(bet.amount * bet.odds)}`
            : bet.status === "lost"
              ? `-${formatCurrency(bet.amount)}`
              : formatCurrency(bet.amount),
        time: bet.placedAt
          ? new Date(bet.placedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "Recent",
        icon: bet.match?.homeTeam?.toLowerCase().includes("cricket")
          ? "sports_cricket"
          : "sports_soccer",
        tone:
          bet.status === "won"
            ? "positive"
            : bet.status === "lost"
              ? "negative"
              : "pending",
      })),
    [bets],
  );

  return (
    <main className="profile-page">
      <header className="profile-topbar">
        <div className="profile-topbar-inner">
          <Link className="profile-brand" to="/dashboard">
            <span className="profile-brand-mark">BKR</span>
            <span>
              BKR <small>TRADING DESK</small>
            </span>
          </Link>
          <div className="profile-topbar-actions">
            <Link className="profile-header-link" to="/notifications">
              <span className="material-symbols-outlined">notifications</span>{" "}
              Notifications
            </Link>
            <button
              className="profile-settings-btn"
              type="button"
              onClick={logout}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <div className="profile-shell">
        <div className="profile-page-heading">
          <div>
            <p className="profile-eyebrow">ACCOUNT CENTER / PROFILE</p>
            <h1>Your betting profile</h1>
            <p className="profile-heading-copy">
              Track your progress, performance and betting activity in one
              place.
            </p>
          </div>
          <Link className="profile-edit-btn" to="/dashboard">
            <span className="material-symbols-outlined">arrow_back</span> Back
            to desk
          </Link>
        </div>
        {error && <div className="profile-alert glass">{error}</div>}
        <section className="profile-hero glass">
          <div className="profile-hero-main">
            <div className="profile-avatar">
              {safeUser.profileImage ? (
                <img src={safeUser.profileImage} alt={`${name} profile`} />
              ) : getInitials(name)}
              <span className="profile-online-dot" />
            </div>
            <div className="profile-identity">
              <span className="profile-member-pill">
                <span className="chip-dot" /> VERIFIED MEMBER
              </span>
              <h2>{loading ? "Loading profile…" : name}</h2>
              <p>{safeUser.email || "Your BKR account"}</p>
              {safeUser.phone && <p className="profile-phone">{safeUser.phone}</p>}
              <div className="profile-rank-row">
                <span>LEVEL {profileMetrics.level}</span>
                <i />
                <span>{profileMetrics.rank}</span>
              </div>
            </div>
          </div>
          <div className="profile-level-box">
            <div className="profile-level-top">
              <span>Level progress</span>
              <strong>{profileMetrics.progress}%</strong>
            </div>
            <div className="profile-progress-track">
              <div
                className="profile-progress-bar"
                style={{ width: `${profileMetrics.progress}%` }}
              />
            </div>
            <div className="profile-progress-meta">
              <span>{profileMetrics.xp}</span>
              <span>Next level</span>
            </div>
          </div>
        </section>
        <section className="profile-edit-panel glass">
          <div className="profile-section-header">
            <div>
              <p className="profile-eyebrow">PERSONAL DETAILS</p>
              <h3>Profile information</h3>
            </div>
            {!editing && <button className="profile-secondary-btn" type="button" onClick={() => setEditing(true)}>Edit profile</button>}
          </div>
          {editing ? (
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <label>Username<input value={form.username} minLength={3} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
              <label>Mobile number<input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></label>
              <label className="profile-image-field">Profile image <span>(JPG, PNG, WEBP — max 500 KB)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} /></label>
              <div className="profile-form-actions"><button className="profile-topup-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button><button className="profile-secondary-btn" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
            </form>
          ) : (
            <div className="profile-details-grid"><div><span>Email</span><strong>{safeUser.email || "Not added"}</strong></div><div><span>Mobile</span><strong>{safeUser.phone || "Not added"}</strong></div><div><span>Profile image</span><strong>{safeUser.profileImage ? "Added" : "Not added"}</strong></div></div>
          )}
        </section>
        <div className="profile-content-grid">
          <div className="profile-main-column">
            <section className="profile-wallet-card glass">
              <div>
                <p className="profile-section-kicker">Available balance</p>
                <h3>{formatCurrency(walletState.balance)}</h3>
                <p className="profile-wallet-note">
                  <span className="material-symbols-outlined">trending_up</span>{" "}
                  Ready to play
                </p>
              </div>
              <div className="profile-wallet-actions">
                <Link className="profile-topup-btn" to="/wallet/deposit">
                  <span className="material-symbols-outlined">add</span> Add
                  funds
                </Link>
                <Link className="profile-secondary-btn" to="/wallet">
                  Wallet
                </Link>
              </div>
            </section>
            <section className="profile-section">
              <div className="profile-section-header">
                <div>
                  <p className="profile-eyebrow">PERFORMANCE</p>
                  <h3>Betting overview</h3>
                </div>
                <span className="profile-period">ALL TIME</span>
              </div>
              <div className="profile-stats-grid">
                {stats.map((stat) => (
                  <article className="profile-stat-card glass" key={stat.label}>
                    <span className="profile-stat-icon">
                      <span className="material-symbols-outlined">
                        {stat.icon}
                      </span>
                    </span>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                    <small>
                      {stat.label === "Win Rate"
                        ? "+4.8% this month"
                        : "Updated live"}
                    </small>
                  </article>
                ))}
              </div>
            </section>
            <section className="profile-section">
              <div className="profile-section-header">
                <div>
                  <p className="profile-eyebrow">ACTIVITY</p>
                  <h3>Recent bets</h3>
                </div>
                <Link to="/history" className="profile-view-all">
                  View all{" "}
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <div className="profile-bets-list">
                {recentBets.length ? (
                  recentBets.map((bet) => (
                    <article
                      className={`profile-bet-card glass is-${bet.tone}`}
                      key={`${bet.match}-${bet.time}`}
                    >
                      <div className="profile-bet-left">
                        <div className="profile-bet-icon">
                          <span className="material-symbols-outlined">
                            {bet.icon}
                          </span>
                        </div>
                        <div>
                          <h5>{bet.match}</h5>
                          <p>
                            {bet.result} · {bet.category}
                          </p>
                        </div>
                      </div>
                      <div className="profile-bet-right">
                        <strong>{bet.amount}</strong>
                        <span>{bet.time}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="profile-empty glass">
                    <span className="material-symbols-outlined">history</span>
                    <div>
                      <h5>No recent bets yet</h5>
                      <p>Your betting activity will appear here.</p>
                    </div>
                  </article>
                )}
              </div>
            </section>
          </div>
          <aside className="profile-side-column">
            <section className="profile-section">
              <div className="profile-section-header">
                <div>
                  <p className="profile-eyebrow">MILESTONES</p>
                  <h3>Achievements</h3>
                </div>
              </div>
              <div className="profile-achievement-list">
                {profileAchievements.map((badge) => (
                  <article
                    className={`profile-achievement-card glass is-${badge.tone}`}
                    key={badge.label}
                  >
                    <div className="profile-achievement-icon">
                      <span className="material-symbols-outlined">
                        {badge.icon}
                      </span>
                    </div>
                    <div>
                      <strong>{badge.label}</strong>
                      <p>
                        {badge.tone === "locked"
                          ? "Keep playing to unlock"
                          : "Achievement unlocked"}
                      </p>
                    </div>
                    {badge.tone !== "locked" && (
                      <span className="material-symbols-outlined profile-check">
                        check_circle
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <section className="profile-tip glass">
              <span className="material-symbols-outlined">auto_awesome</span>
              <div>
                <h4>Pro tip</h4>
                <p>
                  Review your win rate by sport to find where your edge is
                  strongest.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <nav className="profile-bottom-nav glass" aria-label="Profile navigation">
        <Link to="/dashboard">
          <span className="material-symbols-outlined">sports_esports</span>
          <span>Lobby</span>
        </Link>
        <Link to="/live-cricket">
          <span className="material-symbols-outlined">sensors</span>
          <span>Live</span>
        </Link>
        <Link to="/wallet">
          <span className="material-symbols-outlined">
            account_balance_wallet
          </span>
          <span>Wallet</span>
        </Link>
        <Link className="is-active" to="/profile">
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </Link>
      </nav>
    </main>
  );
}

export default ProfilePage;
