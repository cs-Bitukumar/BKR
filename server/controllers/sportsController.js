import {
  getCache,
  setCache,
  getPendingRequest,
  setPendingRequest,
} from "../utils/cache.js";

import {
  fetchScorecardFromAPI,
  fetchTeamFromAPI,
} from "../services/sportsApi.js";


// =====================================================
// GET SCORECARD
// GET /api/sports/scorecard/:matchId
// =====================================================

export const getScorecard = async (req, res) => {
  const { matchId } = req.params;

  // Validate Match ID
  if (!matchId) {
    return res.status(400).json({
      success: false,
      message: "Match ID is required",
    });
  }

  // Separate cache for each match
  const cacheKey = `scorecard:${matchId}`;

  try {
    // =================================================
    // 1. CHECK CACHE
    // =================================================

    const cachedData = getCache(cacheKey);

    if (cachedData) {
      console.log(
        `CACHE HIT → Scorecard → Match ${matchId}`
      );

      return res.status(200).json({
        success: true,
        source: "cache",
        matchId,
        data: cachedData,
      });
    }

    console.log(
      `CACHE MISS → Scorecard → Match ${matchId}`
    );

    // =================================================
    // 2. CHECK PENDING REQUEST
    // =================================================

    let request = getPendingRequest(cacheKey);

    if (request) {
      console.log(
        `WAITING FOR EXISTING REQUEST → Scorecard → Match ${matchId}`
      );

      const data = await request;

      return res.status(200).json({
        success: true,
        source: "shared-request",
        matchId,
        data,
      });
    }

    // =================================================
    // 3. CALL RAPIDAPI
    // =================================================

    request = fetchScorecardFromAPI(matchId);

    // Store pending request
    setPendingRequest(cacheKey, request);

    const data = await request;

    // =================================================
    // 4. SAVE RESPONSE IN CACHE
    // =================================================

    const ttl = Number(
      process.env.SCORECARD_CACHE_TTL || 21600000
    );

    setCache(cacheKey, data, ttl);

    console.log(
      `SCORECARD CACHED → Match ${matchId} → ${ttl}ms`
    );

    // =================================================
    // 5. SEND RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      source: "rapidapi",
      matchId,
      data,
    });

  } catch (error) {
    console.error(
      `Scorecard API Error → Match ${matchId}:`,
      error.response?.data || error.message
    );

    return res.status(
      error.response?.status || 500
    ).json({
      success: false,
      message: "Failed to fetch scorecard",
      error:
        error.response?.data ||
        error.message,
    });
  }
};


// =====================================================
// GET TEAM
// GET /api/sports/team/:matchId/:teamId
// =====================================================

export const getTeam = async (req, res) => {
  const { matchId, teamId } = req.params;

  // Validate parameters
  if (!matchId || !teamId) {
    return res.status(400).json({
      success: false,
      message: "Match ID and Team ID are required",
    });
  }

  // Separate cache for each match + team
  const cacheKey = `team:${matchId}:${teamId}`;

  try {
    // =================================================
    // 1. CHECK CACHE
    // =================================================

    const cachedData = getCache(cacheKey);

    if (cachedData) {
      console.log(
        `TEAM CACHE HIT → Match ${matchId} → Team ${teamId}`
      );

      return res.status(200).json({
        success: true,
        source: "cache",
        matchId,
        teamId,
        data: cachedData,
      });
    }

    console.log(
      `TEAM CACHE MISS → Match ${matchId} → Team ${teamId}`
    );

    // =================================================
    // 2. CHECK PENDING REQUEST
    // =================================================

    let request = getPendingRequest(cacheKey);

    if (request) {
      console.log(
        `WAITING FOR EXISTING REQUEST → Team ${teamId}`
      );

      const data = await request;

      return res.status(200).json({
        success: true,
        source: "shared-request",
        matchId,
        teamId,
        data,
      });
    }

    // =================================================
    // 3. CALL RAPIDAPI
    // =================================================

    request = fetchTeamFromAPI(
      matchId,
      teamId
    );

    // Store pending request
    setPendingRequest(cacheKey, request);

    const data = await request;

    // =================================================
    // 4. SAVE TEAM DATA IN CACHE
    // =================================================

    const ttl = Number(
      process.env.TEAM_CACHE_TTL || 86400000
    );

    setCache(
      cacheKey,
      data,
      ttl
    );

    console.log(
      `TEAM DATA CACHED → Match ${matchId} → Team ${teamId} → ${ttl}ms`
    );

    // =================================================
    // 5. SEND RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      source: "rapidapi",
      matchId,
      teamId,
      data,
    });

  } catch (error) {
    console.error(
      `Team API Error → Match ${matchId} → Team ${teamId}:`,
      error.response?.data || error.message
    );

    return res.status(
      error.response?.status || 500
    ).json({
      success: false,
      message: "Failed to fetch team data",
      error:
        error.response?.data ||
        error.message,
    });
  }
};