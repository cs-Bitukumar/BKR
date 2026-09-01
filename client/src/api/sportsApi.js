import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000/api",
});

export const getScorecard = async (matchId) => {
  const response = await API.get(
    `/sports/scorecard/${matchId}`
  );

  return response.data;
};

