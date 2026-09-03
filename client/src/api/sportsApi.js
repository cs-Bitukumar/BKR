import axios from "axios";
import { API_BASE_URL } from './api';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export const getScorecard = async (matchId) => {
  const response = await API.get(
    `/sports/scorecard/${matchId}`
  );

  return response.data;
};

