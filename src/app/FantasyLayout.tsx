import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowIcon, CalendarIcon, HomeIcon, PlayerIcon, TableIcon, TrophyIcon } from "../components/Icons";
import { useCreateFantasySignup, useFantasyGame, useJoinFantasyGame } from "../services/fantasy-queries";
import { storage } from "../utils/storage";

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
    return <div className="error-screen"><span className="eyebrow">Fantasy unavailable</span><h1>We could not load the prediction game.</h1><button className="button button--primary" onClick={() => void gameQuery.refetch()}>Try again</button></div>;
  }

  const data = { ...gameQuery.data, activeParticipantId: identity.participantId };
  const { tournament } = data;
  const activeParticipant = data.participants.find((participant) => participant.id === identity.participantId);

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
            <div className="fantasy-nav-group">
              <span>Admin</span>
              {fantasyAdminNav.map((item) => <FantasyNavLink key={item.path} {...item} />)}
            </div>
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
            <Outlet context={{ data }} />
          </main>
        </div>
      </div>
      <nav className="bottom-nav fantasy-bottom-nav" aria-label="Fantasy mobile navigation">
        {fantasyNav.map((item) => <FantasyNavLink key={item.path} bottom {...item} />)}
      </nav>
    </div>
  );
};

const FantasyJoinScreen = ({ onJoined }: { onJoined: (identity: { participantId: string; nickname: string }) => void }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [favoriteTeamId, setFavoriteTeamId] = useState("");
  const joinFantasy = useJoinFantasyGame();
  const createSignup = useCreateFantasySignup();
  const previewGame = useFantasyGame(undefined);
  const teams = previewGame.data?.teams ?? [];
  const selectedFavoriteTeamId = favoriteTeamId || teams[0]?.id || "";

  const saveIdentity = (participant: { id: string; nickname: string }) => {
    const nextIdentity = { participantId: participant.id, nickname: participant.nickname };
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
          <h1>World Cup prediction game</h1>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              joinFantasy.mutate({ inviteCode }, {
                onSuccess: ({ participant }) => saveIdentity(participant),
              });
            }}
          >
            <label htmlFor="fantasy-invite-code">Invite code</label>
            <input
              autoComplete="one-time-code"
              className="fantasy-invite-input"
              id="fantasy-invite-code"
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="SANOOP2026"
              value={inviteCode}
            />
            <button className="button button--primary" disabled={joinFantasy.isPending || inviteCode.trim().length === 0} type="submit">
              {joinFantasy.isPending ? "Joining..." : "Join league"}
            </button>
          </form>
          {joinFantasy.isError && <p role="alert">{joinFantasy.error.message}</p>}
          <div className="fantasy-join-divider"><span>or</span></div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createSignup.mutate({ favoriteTeamId: selectedFavoriteTeamId, name, nickname }, {
                onSuccess: ({ participant }) => saveIdentity(participant),
              });
            }}
          >
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
            <div className="fantasy-join-actions">
              <button className="button button--primary" disabled={createSignup.isPending || !name.trim() || !nickname.trim() || !selectedFavoriteTeamId} type="submit">
                {createSignup.isPending ? "Creating..." : "Create player"}
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
