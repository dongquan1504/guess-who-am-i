import { useState } from "react";
import "./App.css";
import GameScreen from "./component/GameScreen";
import Lobby from "./component/Lobby";

function App() {
  const [gameState, setGameState] = useState({
    inGame: false,
    roomId: null,
    playerId: null,
    playerRole: null,
  });

  const handleJoinGame = (roomId, playerId, playerRole) => {
    setGameState({
      inGame: true,
      roomId,
      playerId,
      playerRole,
    });
  };

  const handleLeaveRoom = () => {
    setGameState({
      inGame: false,
      roomId: null,
      playerId: null,
      playerRole: null,
    });
  };

  return (
    <div className="App">
      {!gameState.inGame ? (
        <Lobby onJoinGame={handleJoinGame} />
      ) : (
        <GameScreen
          roomId={gameState.roomId}
          playerId={gameState.playerId}
          playerRole={gameState.playerRole}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
