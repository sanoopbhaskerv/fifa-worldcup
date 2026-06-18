import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowIcon, CalendarIcon, HomeIcon, PlayerIcon, TableIcon, TrophyIcon } from "../components/Icons";
import { PasswordField } from "../components/PasswordField";
import { useCreateFantasySignup, useFantasyGame, useJoinFantasyGame, useLoginFantasyParticipant } from "../services/fantasy-queries";
import { storage, type StoredFantasyIdentity } from "../utils/storage";

const fantasyNav = [
  { label: "Home", path: "/fantasy", icon: HomeIcon, end: true },
  { label: "Polls", path: "/fantasy/polls", icon: CalendarIcon },
  { label: "Create", path: "/fantasy/create-poll", icon: CalendarIcon },
  { label: "Mine", path: "/fantasy/predictions", icon: PlayerIcon },
  { label: "Table", path: "/fantasy/leaderboard", icon: TableIcon },
  { label: "Results", path: "/fantasy/results", icon: TrophyIcon },
];

const fantasyAdminNav = [
  { label: "Tournament", path: "/fantasy/admin/tournament", icon: TrophyIcon },
  { label: "Participants", path: "/fantasy/admin/participants", icon: PlayerIcon },
  { label: "Fixtures", path: "/fantasy/admin/fixtures", icon: CalendarIcon },
  { label: "Squads", path: "/fantasy/admin/squads", icon: PlayerIcon },
  { label: "Templates", path: "/fantasy/admin/templates", icon: CalendarIcon },
  { label: "AI settings", path: "/fantasy/admin/ai-settings", icon: CalendarIcon },
  { label: "Poll drafts", path: "/fantasy/admin/polls", icon: CalendarIcon },
  { label: "Submitted polls", path: "/fantasy/admin/submitted-polls", icon: CalendarIcon },
  { label: "Result entry", path: "/fantasy/admin/results", icon: TrophyIcon },
];

/**
 * Owns loading and navigation for the fantasy prediction game routes.
 *
 * @returns Fantasy route shell with desktop and mobile navigation.
 */
export const FantasyLayout = () => {
  const [identity, setIdentity] = useState(() => storage.getFantasyIdentity());
  const gameQuery = useFantasyGame(identity?.participantId, Boolean(identity));

  if (!identity) return <FantasyJoinScreen onJoined={setIdentity} />;

  if (gameQuery.isPending) {
    return <div className="loading-screen" role="status"><span className="loading-mark">F</span><strong>Loading fantasy game…</strong></div>;
  }
  if (gameQuery.isError || !gameQuery.data) {
    return <div className="error-screen"><span className="eyebrow">Fantasy unavailable</span><h1>We could not load the prediction game.</h1><p>{gameQuery.error?.message ?? "Please check the backend connection and retry."}</p><button className="button button--primary" onClick={() => void gameQuery.refetch()}>Try again</button></div>;
  }

  const data = { ...gameQuery.data, activeParticipantId: identity.participantId };
  const { tournament } = data;
  const activeParticipant = data.participants.find((participant) => participant.id === identity.participantId);
  const isAdmin = activeParticipant?.role === "ADMIN";

  return (
    <div className="app fantasy-app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="app-scroll">
        <header className="topbar fantasy-topbar">
          <div className="topbar__inner">
            <NavLink className="brand" to="/"><span className="brand__mark">F</span><span>FULL TIME</span></NavLink>
            <div className="fantasy-title">
              <small>Prediction game</small>
              <strong>{tournament.name}</strong>
            </div>
            <NavLink className="fantasy-player-chip" to="/fantasy/profile"><span>{activeParticipant?.avatar ?? "P"}</span><strong>{activeParticipant?.nickname ?? identity.nickname}</strong></NavLink>
            <NavLink className="fantasy-home-link" to="/competitions/world-cup/2026">Scores <ArrowIcon /></NavLink>
          </div>
        </header>
        <div className="app-frame fantasy-frame">
          <aside className="desktop-nav fantasy-sidebar" aria-label="Fantasy sections">
            <div className="desktop-nav__identity">
              <span className="competition-emblem competition-emblem--large">WC</span>
              <div><strong>{tournament.name}</strong><span>{activeParticipant?.nickname ?? tournament.scoringRulesVersion}</span></div>
            </div>
            <nav>{fantasyNav.map((item) => <FantasyNavLink key={item.path} {...item} />)}</nav>
            {isAdmin && (
              <div className="fantasy-nav-group">
                <span>Admin</span>
                {fantasyAdminNav.map((item) => <FantasyNavLink key={item.path} {...item} />)}
              </div>
            )}
            <NavLink className="section-link" to="/fantasy/rules"><TrophyIcon /><span>Rules</span></NavLink>
            <div className="desktop-nav__footer">
              <span>Friends league</span>
              <small>Polls lock {tournament.pollCloseMinutesBeforeKickoff} min before kickoff</small>
              <button
                className="fantasy-link-button"
                onClick={() => {
                  storage.clearFantasyIdentity();
                  setIdentity(null);
                }}
                type="button"
              >
                Change player
              </button>
              <NavLink className="fantasy-link-button" to="/fantasy/profile">Edit display name</NavLink>
            </div>
          </aside>
          <main id="main-content" className="main-content">
            <div className="mobile-tabs fantasy-tabs" aria-label="Fantasy sections">{fantasyNav.map((item) => <FantasyNavLink key={item.path} compact {...item} />)}</div>
            <Outlet context={{ data, isAdmin }} />
          </main>
        </div>
      </div>
      <nav className="bottom-nav fantasy-bottom-nav" aria-label="Fantasy mobile navigation">
        {fantasyNav.map((item) => <FantasyNavLink key={item.path} bottom {...item} />)}
      </nav>
    </div>
  );
};

const FantasyJoinScreen = ({ onJoined }: { onJoined: (identity: StoredFantasyIdentity) => void }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [favoriteTeamId, setFavoriteTeamId] = useState("");
  const joinFantasy = useJoinFantasyGame();
  const loginFantasy = useLoginFantasyParticipant();
  const createSignup = useCreateFantasySignup();
  const previewGame = useFantasyGame(undefined);
  const teams = previewGame.data?.teams ?? [];
  const selectedFavoriteTeamId = favoriteTeamId || teams[0]?.id || "";
  const signupPasswordsMatch = password.length > 0 && password === passwordConfirm;

  const saveIdentity = (participant: { id: string; nickname: string; role?: "ADMIN" | "PLAYER"; email?: string; phone?: string }) => {
    const nextIdentity = { participantId: participant.id, nickname: participant.nickname, role: participant.role, email: participant.email, phone: participant.phone };
    storage.setFantasyIdentity(nextIdentity);
    onJoined(nextIdentity);
  };

  const createGuest = () => {
    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const guestNickname = `Guest ${guestNumber}`;
    createSignup.mutate({
      favoriteTeamId: selectedFavoriteTeamId,
      name: guestNickname,
      nickname: guestNickname,
      role: "PLAYER",
    }, {
      onSuccess: ({ participant }) => saveIdentity(participant),
    });
  };

  return (
    <div className="app fantasy-app">
      <main className="fantasy-join-screen">
        <section className="fantasy-join-panel">
          <span className="competition-emblem competition-emblem--large">WC</span>
          <span className="eyebrow">Friends league</span>
          <h1>Login or sign up</h1>
          {previewGame.isError && (
            <div className="data-notice" role="alert">
              Fantasy setup could not be loaded. <button className="fantasy-link-button" onClick={() => void previewGame.refetch()} type="button">Retry</button>
            </div>
          )}
          <form
            aria-label="Email or phone login"
            onSubmit={(event) => {
              event.preventDefault();
              loginFantasy.mutate({ emailOrPhone: loginIdentifier, password: loginPassword }, {
                onSuccess: ({ participant }) => saveIdentity(participant),
              });
            }}
          >
            <label htmlFor="fantasy-login-id">Email or phone</label>
            <input
              autoComplete="username"
              id="fantasy-login-id"
              onChange={(event) => setLoginIdentifier(event.target.value)}
              placeholder="you@example.com"
              value={loginIdentifier}
            />
            <PasswordField
              autoComplete="current-password"
              id="fantasy-login-password"
              label="Password"
              onChange={setLoginPassword}
              placeholder="Your password"
              value={loginPassword}
            />
            <button className="button button--primary" disabled={loginFantasy.isPending || !loginIdentifier.trim() || loginPassword.length < 8} type="submit">
              {loginFantasy.isPending ? "Logging in..." : "Login"}
            </button>
          </form>
          {loginFantasy.isError && <p role="alert">{loginFantasy.error.message}</p>}
          <div className="fantasy-join-divider"><span>or invite</span></div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              joinFantasy.mutate({ inviteCode }, {
                onSuccess: ({ participant }) => saveIdentity(participant),
              });
            }}
          >
            <label htmlFor="fantasy-invite-code">Login with invite code</label>
            <input
              autoComplete="one-time-code"
              className="fantasy-invite-input"
              id="fantasy-invite-code"
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="SANOOP2026"
              value={inviteCode}
            />
            <button className="button button--primary" disabled={joinFantasy.isPending || inviteCode.trim().length === 0} type="submit">
              {joinFantasy.isPending ? "Logging in..." : "Login"}
            </button>
          </form>
          {joinFantasy.isError && <p role="alert">{joinFantasy.error.message}</p>}
          <div className="fantasy-join-divider"><span>or sign up</span></div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!signupPasswordsMatch) return;
              createSignup.mutate({ emailOrPhone, favoriteTeamId: selectedFavoriteTeamId, name, nickname, password, role: "PLAYER" }, {
                onSuccess: ({ participant }) => {
                  setPasswordConfirm("");
                  saveIdentity(participant);
                },
              });
            }}
          >
            <label htmlFor="fantasy-signup-contact">Email or phone</label>
            <input
              autoComplete="username"
              id="fantasy-signup-contact"
              onChange={(event) => setEmailOrPhone(event.target.value)}
              placeholder="you@example.com"
              value={emailOrPhone}
            />
            <label htmlFor="fantasy-signup-name">Name</label>
            <input
              autoComplete="name"
              id="fantasy-signup-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              value={name}
            />
            <label htmlFor="fantasy-signup-nickname">Display name</label>
            <input
              autoComplete="nickname"
              id="fantasy-signup-nickname"
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Leaderboard name"
              value={nickname}
            />
            <label htmlFor="fantasy-signup-team">Favorite team</label>
            <select
              id="fantasy-signup-team"
              onChange={(event) => setFavoriteTeamId(event.target.value)}
              value={selectedFavoriteTeamId}
            >
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
            <PasswordField
              autoComplete="new-password"
              id="fantasy-signup-password"
              label="Password"
              minLength={8}
              onChange={setPassword}
              placeholder="At least 8 characters"
              value={password}
            />
            <PasswordField
              autoComplete="new-password"
              id="fantasy-signup-password-confirm"
              label="Confirm password"
              minLength={8}
              onChange={setPasswordConfirm}
              placeholder="Repeat password"
              value={passwordConfirm}
            />
            {passwordConfirm.length > 0 && !signupPasswordsMatch && <p role="alert">Passwords do not match.</p>}
            <div className="fantasy-join-actions">
              <button className="button button--primary" disabled={createSignup.isPending || !emailOrPhone.trim() || !name.trim() || !nickname.trim() || password.length < 8 || !signupPasswordsMatch || !selectedFavoriteTeamId} type="submit">
                {createSignup.isPending ? "Creating..." : "Sign up"}
              </button>
              <button disabled={createSignup.isPending || !selectedFavoriteTeamId} onClick={createGuest} type="button">
                Play as guest
              </button>
            </div>
          </form>
          {createSignup.isError && <p role="alert">{createSignup.error.message}</p>}
        </section>
      </main>
    </div>
  );
};

const FantasyNavLink = ({ label, path, icon: Icon, end, compact, bottom }: { label: string; path: string; icon: typeof HomeIcon; end?: boolean; compact?: boolean; bottom?: boolean }) => (
  <NavLink end={end} className={({ isActive }) => `section-link ${isActive ? "section-link--active" : ""} ${compact ? "section-link--compact" : ""} ${bottom ? "section-link--bottom" : ""}`} to={path}>
    <Icon />
    <span>{label}</span>
  </NavLink>
);
