import { get, ref, remove } from "firebase/database";
import { useEffect, useState } from "react";
import "./App.css";
import GameScreen from "./component/GameScreen";
import Lobby from "./component/Lobby";
import { db } from "./firebase";

function App() {
  const [gameState, setGameState] = useState({
    inGame: false,
    roomId: null,
    playerId: null,
    playerRole: null,
  });

  // Cleanup các phòng cũ (>10m) khi vào web lần đầu
  useEffect(() => {
    const cleanupOldRooms = async () => {
      try {
        const roomsRef = ref(db, "roomId");
        const snapshot = await get(roomsRef);

        if (snapshot.exists()) {
          const rooms = snapshot.val();
          const now = Date.now();
          const tenMinutesInMs = 10 * 60 * 1000; // 10 phút

          for (const roomId in rooms) {
            const room = rooms[roomId];

            // Kiểm tra nếu phòng có lastUpdate
            let roomAge = 0;

            // Nếu không có lastUpdate, coi như phòng đã cũ và xóa
            if (!room.lastUpdate) {
              // Xóa phòng không có timestamp (phòng cũ)
              const roomRef = ref(db, `roomId/${roomId}`);
              await remove(roomRef);
              console.log(`Đã xóa phòng cũ: ${roomId}`);
            } else {
              roomAge = now - room.lastUpdate;

              // Xóa phòng nếu không có hoạt động quá 10 phút
              if (roomAge > tenMinutesInMs) {
                const roomRef = ref(db, `roomId/${roomId}`);
                await remove(roomRef);
                console.log(`Đã xóa phòng không hoạt động hơn 10 phút: ${roomId}`);
              }
            }
          }
        }
      } catch (error) {
        console.error("Lỗi khi cleanup rooms:", error);
      }
    };

    // Chỉ chạy 1 lần khi component mount
    cleanupOldRooms();
  }, []);

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
