import fetch from "node-fetch";

export async function liveMatches(req, res) {
  try {
    const cricApiKey = process.env.CRIC_API_KEY;

    if (!cricApiKey) {
      return res.status(500).json({
        message: "CRIC_API_KEY not found in .env",
      });
    }

   const response = await fetch(
  `https://api.cricapi.com/v1/currentMatches?apikey=${cricApiKey}&offset=0`
);

    if (!response.ok) return res.status(response.status).json({ message: 'Cricket provider request failed' });
    const result = await response.json();

  const matches = (result.data || []).map((m) => ({
  id: m.id,

  title:
    m.teams?.length >= 2
      ? `${m.teams[0]} vs ${m.teams[1]}`
      : m.name,

  league: m.name?.split(",")[1]?.trim() || m.matchType?.toUpperCase(),

  date: m.dateTimeGMT || "",

  status: m.status || "",
  isLive: /live|in progress|innings break|day \d|stumps/i.test(m.status || ""),
  minute: m.status || "",

  score:
    Array.isArray(m.score)
      ? m.score
          .map((s) => `${s.r}/${s.w} (${s.o})`)
          .join(" | ")
      : "",

  currentBall: m.currentBall || m.ball || "",
  bowler: m.bowler || m.currentBowler || "",
  recentBalls: m.recentBalls || m.balls || [],

  odds: [
    {
      label: m.teams?.[0] || "Team 1",
      value: "1.85",
    },
    {
      label: m.teams?.[1] || "Team 2",
      value: "2.10",
    },
  ],
}));

    res.json(matches);
  } catch (err) {
    console.error("CricAPI Error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
}

// Football Matches
export async function liveFootballMatches(req, res) {
  try {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "ODDS_API_KEY not found in .env",
      });
    }

   const url =
  `https://api.the-odds-api.com/v4/sports/soccer_brazil_serie_b/odds` +
  `?apiKey=${apiKey}&regions=uk&markets=h2h`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(response.status).json({
        message: "Failed to fetch football odds",
        error: errorText,
      });
    }

    const data = await response.json();

    const normalized = data.map((match) => {
      const outcomes =
        match.bookmakers?.[0]?.markets?.[0]?.outcomes || [];

      return {
        id: match.id || `${match.home_team}-${match.away_team}-${match.commence_time}`,
        title: `${match.home_team} vs ${match.away_team}`,
        league: match.sport_title || "Football",
        date: match.commence_time || "",
        minute: match.completed ? "Finished" : "Upcoming",
        score: "",
        odds: outcomes.map((o) => ({
          label: o.name,
          value: String(o.price),
        })),
      };
    });

    return res.json(normalized);
  } catch (err) {
    console.error("Football Error:", err);

    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
}
