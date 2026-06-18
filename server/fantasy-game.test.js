import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "./handler.mjs";
import { getFantasyStorageRecords, resetFantasyGame } from "./fantasy-game.mjs";

describe("fantasy game API", () => {
  beforeEach(async () => {
    await resetFantasyGame();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves the local fantasy prediction game state", async () => {
    const response = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/game",
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.tournament).toMatchObject({
      id: "world-cup-friends-2026",
      name: "Friend Prediction Leaague",
    });
    expect(response.body.teams).toHaveLength(48);
    expect(response.body.squadPlayers).toHaveLength(1248);
    expect(response.body.questions.some((question) => question.type === "PLAYER")).toBe(true);
  });

  it("joins a participant by invite code", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/join",
      body: JSON.stringify({ inviteCode: "anoop2026" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.participant).toMatchObject({
      id: "p-anoop",
      nickname: "Messi Monk",
    });
    expect(response.body.game.activeParticipantId).toBe("p-anoop");
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "PARTICIPANT_JOINED",
      entityId: "p-anoop",
    });
  });

  it("rejects invalid invite codes", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/join",
      body: JSON.stringify({ inviteCode: "nope" }),
      env: {},
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_INVITE");
  });

  it("lists participants with admin invite metadata", async () => {
    const response = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/admin/participants",
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.participants).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "p-sanoop",
        invite: expect.objectContaining({ inviteCode: "SANOOP2026" }),
      }),
    ]));
  });

  it("creates an admin participant and invite", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/participants",
      body: JSON.stringify({ name: "Maya Nair", nickname: "Golden Brain", favoriteTeamId: "eng" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.participant).toMatchObject({
      id: "p-golden-brain",
      nickname: "Golden Brain",
      favoriteTeamId: "eng",
    });
    expect(response.body.invite).toMatchObject({
      participantId: "p-golden-brain",
      status: "ACTIVE",
    });
    expect(response.body.invite.inviteCode).toMatch(/^GOLDENBR/);
    expect(response.body.game.participants.some((participant) => participant.id === "p-golden-brain")).toBe(true);
    expect(response.body.game.participantInvites).toBeUndefined();
  });

  it("creates a public signup participant and returns it as active", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/participants",
      body: JSON.stringify({ name: "Guest Player", nickname: "Guest 2046", favoriteTeamId: "bra" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.participant).toMatchObject({
      id: "p-guest-2046",
      nickname: "Guest 2046",
    });
    expect(response.body.game.activeParticipantId).toBe("p-guest-2046");
    expect(response.body.game.participantInvites).toBeUndefined();
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "PARTICIPANT_CREATED",
      actorId: "self-signup",
    });
    expect(response.body.game.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "group-main" }),
    ]));
  });

  it("creates poll groups with overlapping members and generates group-specific polls", async () => {
    const groupResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/groups",
      body: JSON.stringify({
        name: "Office league",
        description: "Side group",
        participantIds: ["p-sanoop", "p-anoop"],
      }),
      env: {},
    });
    const generateResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/polls/generate",
      body: JSON.stringify({ groupId: "group-office-league", limit: 1, status: "OPEN" }),
      env: {},
    });

    expect(groupResponse.status).toBe(200);
    expect(groupResponse.body.group).toMatchObject({ id: "group-office-league", name: "Office league" });
    expect(groupResponse.body.groupMemberships).toEqual(expect.arrayContaining([
      expect.objectContaining({ groupId: "group-office-league", participantId: "p-sanoop" }),
      expect.objectContaining({ groupId: "group-office-league", participantId: "p-anoop" }),
    ]));
    expect(generateResponse.status).toBe(200);
    expect(generateResponse.body.questions.every((question) => question.groupId === "group-office-league")).toBe(true);
  });

  it("signs up and logs in with email and password", async () => {
    const signupResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/participants",
      body: JSON.stringify({
        emailOrPhone: "friend@example.com",
        favoriteTeamId: "bra",
        name: "Friend User",
        nickname: "Fixture Friend",
        password: "secret123",
      }),
      env: {},
    });
    const loginResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/login",
      body: JSON.stringify({ emailOrPhone: "friend@example.com", password: "secret123" }),
      env: {},
    });

    expect(signupResponse.status).toBe(200);
    expect(signupResponse.body.participant).toMatchObject({
      email: "friend@example.com",
      role: "PLAYER",
    });
    expect(signupResponse.body.participant.passwordHash).toBeUndefined();
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.participant.id).toBe(signupResponse.body.participant.id);
  });

  it("sets a password for an invite user and grants admin role", async () => {
    const passwordResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/participants/p-sanoop/password",
      body: JSON.stringify({ newPassword: "worldcup123" }),
      env: {},
    });
    const roleResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/participants/p-anoop/role",
      body: JSON.stringify({ role: "ADMIN" }),
      env: {},
    });

    expect(passwordResponse.status).toBe(200);
    expect(passwordResponse.body.participant.passwordChangedAt).toEqual(expect.any(String));
    expect(passwordResponse.body.participant.passwordHash).toBeUndefined();
    expect(roleResponse.status).toBe(200);
    expect(roleResponse.body.participant).toMatchObject({ id: "p-anoop", role: "ADMIN" });
  });

  it("lets an admin rotate invites and set a temporary password", async () => {
    const inviteResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/participants/p-anoop/credentials",
      body: JSON.stringify({ resetInvite: true }),
      env: {},
    });
    const oldInviteResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/join",
      body: JSON.stringify({ inviteCode: "ANOOP2026" }),
      env: {},
    });
    const passwordResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/participants/p-sanoop/credentials",
      body: JSON.stringify({ temporaryPassword: "temporary123" }),
      env: {},
    });
    const loginResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/login",
      body: JSON.stringify({ emailOrPhone: "sanoopvellangar@gmail.com", password: "temporary123" }),
      env: {},
    });

    expect(inviteResponse.status).toBe(200);
    expect(inviteResponse.body.invite.inviteCode).not.toBe("ANOOP2026");
    expect(oldInviteResponse.status).toBe(401);
    expect(passwordResponse.status).toBe(200);
    expect(passwordResponse.body.participant.passwordHash).toBeUndefined();
    expect(passwordResponse.body.participant.temporaryPasswordSetAt).toEqual(expect.any(String));
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.participant.id).toBe("p-sanoop");
  });

  it("updates a participant display profile", async () => {
    const response = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/participants/p-sanoop",
      body: JSON.stringify({ name: "Sanoop B", nickname: "Penalty Boss", favoriteTeamId: "arg" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.participant).toMatchObject({
      id: "p-sanoop",
      name: "Sanoop B",
      nickname: "Penalty Boss",
      favoriteTeamId: "arg",
      avatar: "PB",
    });
    expect(response.body.game.leaderboard.find((row) => row.participantId === "p-sanoop")).toMatchObject({
      nickname: "Penalty Boss",
      favoriteTeam: "Argentina",
    });
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "PARTICIPANT_UPDATED",
      actorId: "p-sanoop",
    });
  });

  it("lists and updates admin fixtures", async () => {
    const listResponse = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/admin/fixtures",
      env: {},
    });
    const updateResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/fixtures/bra-arg",
      body: JSON.stringify({
        importance: "KNOCKOUT",
        kickoff: "2026-06-18T21:00:00+05:30",
        pollCloseAt: "2026-06-18T20:45:00+05:30",
        stage: "Round of 16",
        status: "LOCKED",
      }),
      env: {},
    });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.fixtures.some((fixture) => fixture.id === "bra-arg")).toBe(true);
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.fixture).toMatchObject({
      id: "bra-arg",
      importance: "KNOCKOUT",
      pollCloseAt: "2026-06-18T20:45:00+05:30",
      stage: "Round of 16",
      status: "LOCKED",
    });
    expect(updateResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "FIXTURE_UPDATED",
      entityId: "bra-arg",
    });
  });

  it("updates tournament setup", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/tournament",
      body: JSON.stringify({
        name: "Friend Prediction Leaague 2026",
        status: "UPCOMING",
        startDate: "2026-06-11",
        endDate: "2026-07-19",
        pollCloseMinutesBeforeKickoff: 20,
        scoringRulesVersion: "prediction-v1",
      }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.tournament).toMatchObject({
      name: "Friend Prediction Leaague 2026",
      status: "UPCOMING",
      pollCloseMinutesBeforeKickoff: 20,
    });
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "TOURNAMENT_UPDATED",
      entityId: "world-cup-friends-2026",
      entityType: "TOURNAMENT",
    });
  });

  it("imports and edits World Cup squad reference data", async () => {
    const importResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/squads/import",
      body: JSON.stringify({
        source: [
          "teamName,fifaCode,group,playerName,position,shirtNumber,scorer,star,motm,boot,glove",
          "Brazil,BRA,Group D,Neymar,FWD,10,true,true,true,true,false",
          "Brazil,BRA,Group D,Ederson,GK,23,false,false,false,false,true",
        ].join("\n"),
      }),
      env: {},
    });
    const teamResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/teams/bra",
      body: JSON.stringify({ name: "Brazil", fifaCode: "BRA", group: "Group E", rankingSeed: 3 }),
      env: {},
    });
    const playerResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/squad-players/bra-neymar",
      body: JSON.stringify({
        name: "Neymar Jr",
        position: "FWD",
        shirtNumber: 10,
        teamId: "bra",
        isScorerCandidate: true,
        isStarCandidate: true,
        isMotmCandidate: true,
        isGoldenBootCandidate: true,
        isGoldenGloveCandidate: false,
      }),
      env: {},
    });

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.squadPlayers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "bra-neymar", name: "Neymar" }),
      expect.objectContaining({ id: "bra-ederson", isGoldenGloveCandidate: true }),
    ]));
    expect(importResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "SQUADS_IMPORTED",
      entityType: "SQUAD",
    });
    expect(teamResponse.status).toBe(200);
    expect(teamResponse.body.team).toMatchObject({ id: "bra", group: "Group E", rankingSeed: 3 });
    expect(playerResponse.status).toBe(200);
    expect(playerResponse.body.squadPlayer).toMatchObject({ id: "bra-neymar", name: "Neymar Jr" });
    expect(playerResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "SQUAD_PLAYER_UPDATED",
      entityId: "bra-neymar",
    });
  });

  it("seeds bundled World Cup squads into fantasy storage", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/squads/seed-world-cup-2026",
      body: JSON.stringify({}),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.teams).toHaveLength(48);
    expect(response.body.squadPlayers).toHaveLength(1248);
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "WORLD_CUP_SQUADS_SEEDED",
      entityType: "SQUAD",
      metadata: { teamCount: 48, playerCount: 1248 },
    });
  });

  it("syncs live provider fixtures and generates real match polls", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      const href = String(url);
      if (href.includes("/matches?season=2026")) {
        return new Response(JSON.stringify({
          matches: [
            {
              id: 100,
              utcDate: "2026-06-20T18:00:00Z",
              status: "TIMED",
              stage: "GROUP_STAGE",
              group: "GROUP_D",
              matchday: 1,
              homeTeam: { id: 1, name: "Brazil", shortName: "Brazil", tla: "BRA" },
              awayTeam: { id: 2, name: "Argentina", shortName: "Argentina", tla: "ARG" },
              score: { fullTime: { home: null, away: null } },
            },
            {
              id: 101,
              utcDate: "2026-06-21T18:00:00Z",
              status: "TIMED",
              stage: "GROUP_STAGE",
              group: "GROUP_F",
              matchday: 1,
              homeTeam: { id: 3, name: "England", shortName: "England", tla: "ENG" },
              awayTeam: { id: 4, name: "Spain", shortName: "Spain", tla: "ESP" },
              score: { fullTime: { home: null, away: null } },
            },
          ],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (href.includes("/standings?season=2026")) {
        return new Response(JSON.stringify({ standings: [] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (href.includes("/scorers?season=2026")) {
        return new Response(JSON.stringify({ scorers: [] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 404, headers: { "content-type": "application/json" } });
    }));

    const syncResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/fixtures/sync-live",
      body: JSON.stringify({ replaceExisting: true }),
      env: { FOOTBALL_DATA_API_KEY: "test-key", FOOTBALL_DATA_BASE_URL: "https://fd.test/v4" },
    });
    const generateResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/polls/generate",
      body: JSON.stringify({ limit: 1, status: "OPEN", replaceExisting: true }),
      env: {},
    });

    expect(syncResponse.status).toBe(200);
    expect(syncResponse.body.fixtures).toEqual([
      expect.objectContaining({
        id: "fd-100",
        homeTeamId: "bra",
        awayTeamId: "arg",
        pollCloseAt: "2026-06-20T17:45:00.000Z",
      }),
      expect.objectContaining({
        id: "fd-101",
        homeTeamId: "eng",
        awayTeamId: "esp",
      }),
    ]);
    expect(syncResponse.body.game.questions.some((question) => question.matchId === "bra-arg")).toBe(false);
    expect(generateResponse.status).toBe(200);
    expect(generateResponse.body.fixtures).toHaveLength(1);
    expect(generateResponse.body.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "draft-group-main-fd-100-match-result",
        matchId: "fd-100",
        status: "OPEN",
        options: ["Brazil", "Argentina", "Draw"],
      }),
      expect.objectContaining({
        matchId: "fd-100",
        type: "PLAYER",
        status: "OPEN",
      }),
    ]));
    expect(generateResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "POLLS_GENERATED_AND_PUBLISHED",
      metadata: { matchCount: 1, status: "OPEN" },
    });
  });

  it("lists and updates question templates", async () => {
    const listResponse = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/admin/question-templates",
      env: {},
    });
    const updateResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/question-templates/tpl-total-goals",
      body: JSON.stringify({
        enabled: true,
        importanceLevels: ["NORMAL", "BIG_MATCH"],
        maxOptions: "",
        name: "Total goals",
        optionMode: "TOTAL_GOALS",
        points: 4,
        sortOrder: 31,
        text: "How many total goals?",
      }),
      env: {},
    });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.questionTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "tpl-match-result", optionMode: "MATCH_RESULT" }),
    ]));
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.questionTemplate).toMatchObject({
      id: "tpl-total-goals",
      importanceLevels: ["NORMAL", "BIG_MATCH"],
      points: 4,
      text: "How many total goals?",
    });
    expect(updateResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "QUESTION_TEMPLATE_UPDATED",
      entityId: "tpl-total-goals",
      entityType: "QUESTION_TEMPLATE",
    });
  });

  it("lists and updates AI settings", async () => {
    const listResponse = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/admin/ai-settings",
      env: {},
    });
    const updateResponse = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/admin/ai-settings",
      body: JSON.stringify({
        mode: "TEMPLATE_ONLY",
        externalProviderEnabled: false,
        fallbackToTemplates: true,
        banterLevel: "NONE",
        dailyBudgetCents: 25,
        maxQuestions: { NORMAL: 4, BIG_MATCH: 6, KNOCKOUT: 7, FINAL: 9 },
        enabledCategories: ["MATCH_WINNER", "TOTAL_GOALS"],
      }),
      env: {},
    });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.aiSettings).toMatchObject({
      mode: "TEMPLATE_ONLY",
      externalProviderEnabled: false,
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.aiSettings).toMatchObject({
      banterLevel: "NONE",
      dailyBudgetCents: 25,
      enabledCategories: ["MATCH_WINNER", "TOTAL_GOALS"],
    });
    expect(updateResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "AI_SETTINGS_UPDATED",
      entityType: "AI_SETTINGS",
    });
  });

  it("generates admin AI host drafts from stored game data and hides drafts from players", async () => {
    const reminderResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/ai-messages/reminder-draft",
      body: JSON.stringify({ matchId: "bra-arg", groupId: "group-main" }),
      env: {},
    });
    const recapResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/ai-messages/recap-draft",
      body: JSON.stringify({ matchId: "eng-esp" }),
      env: {},
    });
    const leaderboardResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/ai-messages/leaderboard-draft",
      env: {},
    });
    const listResponse = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/admin/ai-messages",
      env: {},
    });
    const gameResponse = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/game",
      env: {},
    });

    expect(reminderResponse.status).toBe(200);
    expect(reminderResponse.body.message).toMatchObject({
      type: "REMINDER",
      status: "DRAFT",
      source: "TEMPLATE",
      matchId: "bra-arg",
      groupId: "group-main",
    });
    expect(reminderResponse.body.message.title).toContain("Brazil vs Argentina");
    expect(reminderResponse.body.message.body).toContain("answers are still pending");
    expect(recapResponse.status).toBe(200);
    expect(recapResponse.body.message).toMatchObject({
      type: "RECAP",
      matchId: "eng-esp",
    });
    expect(recapResponse.body.message.body).toContain("England 1-2 Spain");
    expect(leaderboardResponse.status).toBe(200);
    expect(leaderboardResponse.body.message).toMatchObject({
      type: "LEADERBOARD_SUMMARY",
      title: "Leaderboard pulse",
    });
    expect(listResponse.body.aiMessages).toHaveLength(3);
    expect(listResponse.body.aiMessages.every((message) => message.contextHash)).toBe(true);
    expect(gameResponse.body.aiMessages).toEqual([]);
    expect(listResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "AI_MESSAGE_DRAFTED",
      entityType: "AI_MESSAGE",
    });
  });

  it("saves generated question drafts as open polls", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/questions/bra-arg/drafts",
      body: JSON.stringify({
        status: "OPEN",
        questions: [
          {
            id: "draft-bra-arg-total-goals",
            tournamentId: "world-cup-friends-2026",
            matchId: "bra-arg",
            category: "TOTAL_GOALS",
            type: "SCORE_RANGE",
            text: "Total goals in the match?",
            options: ["0-1", "2-3", "4+"],
            points: 3,
            status: "DRAFT",
            closeAt: "2026-06-18T20:15:00+05:30",
          },
        ],
      }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.questions).toEqual([
      expect.objectContaining({ id: "draft-group-main-bra-arg-total-goals", status: "OPEN" }),
    ]);
    expect(response.body.game.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "draft-group-main-bra-arg-total-goals", status: "OPEN" }),
    ]));
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "QUESTIONS_PUBLISHED",
      entityId: "bra-arg",
    });
  });

  it("creates a user poll with player options from the selected match squads", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "bra-arg",
        kind: "FIRST_GOAL_SCORER",
      }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.question).toMatchObject({
      matchId: "bra-arg",
      createdByParticipantId: "p-sanoop",
      source: "USER",
      category: "FIRST_GOAL_SCORER",
      status: "OPEN",
      text: "Who scores the first goal?",
    });
    expect(response.body.question.createdAt).toEqual(expect.any(String));
    expect(response.body.question.options).toEqual(expect.arrayContaining(["Vinicius Jr", "Lionel Messi", "Own Goal", "No goal", "Other"]));
    expect(response.body.game.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: response.body.question.id }),
    ]));
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "USER_POLL_CREATED",
      actorId: "p-sanoop",
      metadata: { matchId: "bra-arg", kind: "FIRST_GOAL_SCORER" },
    });
  });

  it("creates a user poll with selected first scorer player options", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "bra-arg",
        kind: "FIRST_GOAL_SCORER",
        options: ["Lionel Messi", "Vinicius Jr"],
      }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.question.options).toEqual(["Lionel Messi", "Vinicius Jr", "Own Goal", "No goal", "Other"]);
  });

  it("creates exact score, first goal time, and penalty goal user polls", async () => {
    const exactScoreResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "bra-arg",
        kind: "TOTAL_GOALS",
      }),
      env: {},
    });
    const firstGoalTimeResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "bra-arg",
        kind: "FIRST_GOAL_TIME",
      }),
      env: {},
    });
    const penaltyGoalResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "bra-arg",
        kind: "PENALTY_GOAL",
      }),
      env: {},
    });

    expect(exactScoreResponse.status).toBe(200);
    expect(exactScoreResponse.body.question).toMatchObject({
      category: "EXACT_SCORE",
      type: "EXACT_SCORE",
      options: [],
    });
    expect(firstGoalTimeResponse.status).toBe(200);
    expect(firstGoalTimeResponse.body.question.options).toEqual(["Before 10", "11-45", "46-60", "60-90", "90+"]);
    expect(penaltyGoalResponse.status).toBe(200);
    expect(penaltyGoalResponse.body.question).toMatchObject({
      category: "PENALTY_GOAL",
      options: ["Yes", "No"],
    });
  });

  it("accepts exact score prediction answers", async () => {
    const pollResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "bra-arg",
        kind: "TOTAL_GOALS",
      }),
      env: {},
    });
    const response = await handleApiRequest({
      method: "PUT",
      url: `/api/fantasy/predictions/${pollResponse.body.question.id}`,
      body: JSON.stringify({ participantId: "p-sanoop", answer: "Brazil 3 Argentina 4" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.prediction).toMatchObject({
      questionId: pollResponse.body.question.id,
      answer: "Brazil 3 Argentina 4",
    });
  });

  it("rejects user polls for completed matches", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/polls",
      body: JSON.stringify({
        participantId: "p-sanoop",
        matchId: "eng-esp",
        kind: "MATCH_WINNER",
      }),
      env: {},
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("MATCH_NOT_UPCOMING");
  });

  it("rejects generated player options outside squad data", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/questions/bra-arg/drafts",
      body: JSON.stringify({
        status: "DRAFT",
        questions: [
          {
            id: "draft-bra-arg-fake-scorer",
            tournamentId: "world-cup-friends-2026",
            matchId: "bra-arg",
            category: "FIRST_GOAL_SCORER",
            type: "PLAYER",
            text: "Who scores first?",
            options: ["Fake Striker", "Other"],
            points: 8,
            status: "DRAFT",
            closeAt: "2026-06-18T20:15:00+05:30",
          },
        ],
      }),
      env: {},
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUESTION_DRAFT");
  });

  it("serves the fantasy game for the selected participant", async () => {
    const response = await handleApiRequest({
      method: "GET",
      url: "/api/fantasy/game?participantId=p-anoop",
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.activeParticipantId).toBe("p-anoop");
  });

  it("saves one open prediction for the active participant", async () => {
    const response = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/predictions/q-bra-arg-winner",
      body: JSON.stringify({ answer: "Argentina" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.prediction).toMatchObject({
      questionId: "q-bra-arg-winner",
      participantId: "p-sanoop",
      answer: "Argentina",
    });
    expect(response.body.game.predictions.filter((prediction) => (
      prediction.questionId === "q-bra-arg-winner" && prediction.participantId === "p-sanoop"
    ))).toHaveLength(1);
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "PREDICTION_SUBMITTED",
      actorId: "p-sanoop",
      entityId: "q-bra-arg-winner",
    });
  });

  it("saves changed open predictions in one request", async () => {
    const response = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/predictions",
      body: JSON.stringify({
        predictions: [
          { questionId: "q-bra-arg-winner", answer: "Argentina" },
          { questionId: "q-bra-arg-first-goal-time", answer: "11-45" },
        ],
      }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.predictions).toHaveLength(2);
    expect(response.body.game.predictions).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionId: "q-bra-arg-winner", answer: "Argentina" }),
      expect.objectContaining({ questionId: "q-bra-arg-first-goal-time", answer: "11-45" }),
    ]));
    expect(response.body.game.auditRecords.at(-1)).toMatchObject({
      action: "PREDICTION_SUBMITTED",
      entityId: "bulk-p-sanoop",
      metadata: { count: 2 },
    });
  });

  it("rejects writes against scored polls", async () => {
    const response = await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/predictions/q-eng-esp-winner",
      body: JSON.stringify({ answer: "Spain" }),
      env: {},
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("POLL_LOCKED");
  });

  it("saves a result draft and publishes match scores", async () => {
    await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/predictions/q-bra-arg-winner",
      body: JSON.stringify({ answer: "Argentina" }),
      env: {},
    });
    await handleApiRequest({
      method: "PUT",
      url: "/api/fantasy/predictions/q-bra-arg-first-goal",
      body: JSON.stringify({ answer: "Lionel Messi" }),
      env: {},
    });

    const resultResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/results/bra-arg",
      body: JSON.stringify({
        homeScore: 1,
        awayScore: 2,
        winnerTeamId: "arg",
        firstGoalScorer: "Lionel Messi",
      }),
      env: {},
    });
    const scoreResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/results/bra-arg/publish-scores",
      env: {},
    });
    const republishResponse = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/results/bra-arg/publish-scores",
      env: {},
    });

    expect(resultResponse.status).toBe(200);
    expect(resultResponse.body.result.totalGoalsRange).toBe("2-3");
    expect(scoreResponse.status).toBe(200);
    expect(scoreResponse.body.predictions).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionId: "q-bra-arg-winner", pointsAwarded: 5 }),
      expect.objectContaining({ questionId: "q-bra-arg-first-goal", pointsAwarded: 8 }),
    ]));
    expect(scoreResponse.body.game.leaderboard[0]).toMatchObject({
      participantId: "p-sanoop",
      rank: 1,
      totalPoints: 21,
      todayPoints: 13,
      correctWinners: 1,
      streak: 1,
    });
    expect(republishResponse.body.game.leaderboard[0]).toMatchObject({
      participantId: "p-sanoop",
      totalPoints: 21,
    });
    expect(scoreResponse.body.game.auditRecords.at(-1)).toMatchObject({
      action: "SCORES_PUBLISHED",
      entityId: "bra-arg",
    });
  });

  it("clears existing match polls and publishes the new poll set", async () => {
    const response = await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/polls/reset",
      body: JSON.stringify({ limit: 1, status: "OPEN" }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "EXACT_SCORE", type: "EXACT_SCORE" }),
      expect.objectContaining({ category: "FIRST_GOAL_TIME", type: "TIME_WINDOW" }),
      expect.objectContaining({ category: "PENALTY_GOAL", options: ["Yes", "No"] }),
      expect.objectContaining({ category: "FIRST_GOAL_SCORER", type: "PLAYER" }),
    ]));
    expect(response.body.game.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "group-main-tournament-winner", category: "TOURNAMENT_WINNER" }),
      expect.objectContaining({ id: "group-main-tournament-finalists", category: "TOURNAMENT_FINALISTS" }),
      expect.objectContaining({ id: "group-main-tournament-golden-boot", category: "GOLDEN_BOOT" }),
      expect.objectContaining({ id: "group-main-tournament-golden-ball", category: "GOLDEN_BALL" }),
      expect.objectContaining({ id: "group-main-tournament-mvp", category: "TOURNAMENT_MVP" }),
    ]));
    expect(response.body.game.predictions).toHaveLength(0);
  });

  it("maps the local game into DynamoDB-style storage records", async () => {
    await handleApiRequest({
      method: "POST",
      url: "/api/fantasy/admin/ai-messages/leaderboard-draft",
      env: {},
    });

    const records = await getFantasyStorageRecords();

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({ PK: "TOURNAMENT#world-cup-friends-2026", SK: "PROFILE", type: "TOURNAMENT" }),
      expect.objectContaining({ PK: "TOURNAMENT#world-cup-friends-2026", SK: "AI_SETTINGS", type: "AI_SETTINGS" }),
      expect.objectContaining({ PK: "TOURNAMENT#world-cup-friends-2026", SK: expect.stringMatching(/^AI_MESSAGE#/), type: "AI_MESSAGE" }),
      expect.objectContaining({ PK: "TOURNAMENT#world-cup-friends-2026", SK: "QUESTION#q-bra-arg-winner", type: "QUESTION" }),
      expect.objectContaining({ PK: "TOURNAMENT#world-cup-friends-2026", SK: "QUESTION_TEMPLATE#tpl-match-result", type: "QUESTION_TEMPLATE" }),
      expect.objectContaining({ PK: "TOURNAMENT#world-cup-friends-2026", SK: "INVITE#p-sanoop", type: "PARTICIPANT_INVITE" }),
      expect.objectContaining({ PK: "QUESTION#q-bra-arg-winner", SK: "PREDICTION#p-sanoop", type: "PREDICTION" }),
      expect.objectContaining({ PK: "MATCH#eng-esp", SK: "RESULT#latest", type: "RESULT" }),
    ]));
  });
});
