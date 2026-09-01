import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getScorecard } from "../api/sportsApi";

const Scorecard = () => {
  const { matchId } = useParams();

  const [scorecard, setScorecard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchScorecard = async () => {
      try {
        console.log("Match ID:", matchId);

        setLoading(true);
        setError("");

        const response = await getScorecard(matchId);

        console.log("API Response:", response);

        setScorecard(response.data?.scorecard || []);

      } catch (err) {
        console.error("Frontend API Error:", err);

        setError(
          err.response?.data?.message ||
          err.message ||
          "Failed to load scorecard"
        );
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchScorecard();
    } else {
      setError("Match ID not found");
      setLoading(false);
    }
  }, [matchId]);

  if (loading) {
    return <h2>Loading scorecard...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  return (
    <div>
      <h2>Scorecard</h2>

      {scorecard.map((inning, index) => (
        <div key={index}>
          <h3>Innings {inning.inningsid}</h3>

          {inning.batsman?.map((player) => (
            <div key={player.id}>
              <h4>{player.name}</h4>

              <p>
                {player.runs} runs ({player.balls} balls)
              </p>

              <p>
                4s: {player.fours} | 6s: {player.sixes}
              </p>

              <p>Strike Rate: {player.strkrate}</p>

              {player.outdec && (
                <p>Out: {player.outdec}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Scorecard;