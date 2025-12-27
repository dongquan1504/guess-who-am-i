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

  // Cleanup các phòng cũ (>24h) khi vào web lần đầu
  useEffect(() => {
    const cleanupOldRooms = async () => {
      try {
        const roomsRef = ref(db, "roomId");
        const snapshot = await get(roomsRef);

        if (snapshot.exists()) {
          const rooms = snapshot.val();
          const now = Date.now();
          const oneDayInMs = 24 * 60 * 60 * 1000; // 24 giờ

          for (const roomId in rooms) {
            const room = rooms[roomId];

            // Kiểm tra nếu phòng có timestamp hoặc tạo timestamp từ dữ liệu hiện có
            let roomAge = 0;

            // Nếu không có createdAt, coi như phòng đã cũ và xóa
            if (!room.createdAt) {
              // Xóa phòng không có timestamp (phòng cũ)
              const roomRef = ref(db, `roomId/${roomId}`);
              await remove(roomRef);
              console.log(`Đã xóa phòng cũ: ${roomId}`);
            } else {
              roomAge = now - room.createdAt;

              // Xóa phòng nếu tồn tại quá 24 giờ
              if (roomAge > oneDayInMs) {
                const roomRef = ref(db, `roomId/${roomId}`);
                await remove(roomRef);
                console.log(`Đã xóa phòng cũ hơn 24h: ${roomId}`);
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
