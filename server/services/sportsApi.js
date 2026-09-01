// import axios from "axios";

// const getScheduledMatches = async (req, res) => {

//     const response = await axios.get(
       
//        'https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/40381/hscard',

//         {
//             headers: {
//                 "x-rapidapi-key": process.env.RAPID_API_KEY,
//                 "x-rapidapi-host": process.env.RAPID_API_HOST
//             }
//         }

//     );

//     return response.data;

// }

// export default { getScheduledMatches };

import axios from "axios";

const rapidApi = axios.create({
  baseURL: "https://cricbuzz-cricket.p.rapidapi.com",
  headers: {
    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    "x-rapidapi-host": "cricbuzz-cricket.p.rapidapi.com",
    "Content-Type": "application/json",
  },
});

export const fetchScorecardFromAPI = async (matchId) => {
  const response = await rapidApi.get(
    `/mcenter/v1/${matchId}/scard`
  );

  return response.data;
};

export const fetchTeamFromAPI = async (matchId, teamId) => {
  const response = await rapidApi.get(
    `/mcenter/v1/${matchId}/team/${teamId}`
  );

  return response.data;
};