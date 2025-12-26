import { get, ref, set, update } from "firebase/database";
import { useState } from "react";
import { CHARACTERS } from "../data/character"; // Danh sách 25 nhân vật đã tạo ở bước trước
import { db } from "../firebase";
import { useGameSounds } from "../hooks/useGameSounds";

const Lobby = ({ onJoinGame }) => {
  const [roomIdInput, setRoomIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { playButton } = useGameSounds();

  const handleJoinOrCreate = async () => {
    if (!roomIdInput.trim()) return alert("Vui lòng nhập mã phòng!");

    playButton(); // Phát âm thanh khi click nút
    setLoading(true);

    try {
      // Tạo reference đến phòng trong Realtime Database
      const roomRef = ref(db, `roomId/${roomIdInput}`);
      const roomSnapshot = await get(roomRef);

      if (roomSnapshot.exists()) {
        // TRƯỜNG HỢP: Phòng đã tồn tại -> Vào phòng với tư cách Player 2
        const gameData = roomSnapshot.val();

        if (gameData.player2?.id && gameData.player1?.id) {
          alert("Phòng này đã đủ 2 người rồi!");
          setLoading(false);
          return;
        }

        // Cập nhật Player 2 vào Realtime Database
        const p2Id = "user_" + Math.random().toString(36).substring(7);
        await update(roomRef, {
          "player2/id": p2Id,
          status: "playing", // Khi p2 vào thì bắt đầu chơi
        });

        onJoinGame(roomIdInput, p2Id, "player2");
      } else {
        // TRƯỜNG HỢP: Phòng chưa có -> Tạo mới và là Player 1
        const p1Id = "user_" + Math.random().toString(36).substring(7);

        // Random 2 nhân vật khác nhau từ danh sách 25 người
        const shuffled = [...CHARACTERS].sort(() => 0.5 - Math.random());
        const p1Target = shuffled[0]; // Nhân vật P2 phải đoán
        const p2Target = shuffled[1]; // Nhân vật P1 phải đoán

        const newGame = {
          roomID: roomIdInput,
          player1: {
            id: p1Id,
            targetCharacter: p1Target,
            eliminated: [],
          },
          player2: {
            id: "", // Đợi người thứ 2
            targetCharacter: p2Target,
            eliminated: [],
          },
          status: "waiting",
          winner: null,
        };

        await set(roomRef, newGame);
        onJoinGame(roomIdInput, p1Id, "player1");
      }
    } catch (error) {
      console.error("Lỗi khi xử lý phòng:", error);
      alert("Có lỗi xảy ra! Vui lòng thử lại.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">
        Who Am I? Guess It!
      </h1>
      <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
        <input
          type="text"
          placeholder="Nhập mã phòng (VD: 1234)"
          className="w-1/2 p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
        />
        <br />
        <button
          onClick={handleJoinOrCreate}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:bg-gray-400"
        >
          {loading ? "Đang xử lý..." : "Vào phòng"}
        </button>
      </div>

      <p className="mt-4 text-gray-500 text-sm italic text-center">
        Gửi mã phòng này cho bạn bè để chơi cùng nhau trên thiết bị khác!
      </p>
    </div>
  );
};

export default Lobby;
