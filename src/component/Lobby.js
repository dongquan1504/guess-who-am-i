import { get, ref, set, update } from "firebase/database";
import { useState } from "react";
import Swal from "sweetalert2";
import { CHARACTERS } from "../data/character"; // Danh sách 25 nhân vật đã tạo ở bước trước
import { db } from "../firebase";
import { useGameSounds } from "../hooks/useGameSounds";

const Lobby = ({ onJoinGame }) => {
  const [roomIdInput, setRoomIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { playButton } = useGameSounds();

  const handleJoinOrCreate = async () => {
    if (!roomIdInput.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin!",
        text: "Vui lòng nhập mã phòng!",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    playButton(); // Phát âm thanh khi click nút
    setLoading(true);

    try {
      // Tạo reference đến phòng trong Realtime Database
      const roomRef = ref(db, `roomId/${roomIdInput}`);
      const roomSnapshot = await get(roomRef);

      if (roomSnapshot.exists()) {
        // TRƯỜNG HỢP: Phòng đã tồn tại
        const gameData = roomSnapshot.val();

        // Kiểm tra xem còn chỗ trống không
        const player1Exists =
          gameData.player1?.id && gameData.player1.id !== "";
        const player2Exists =
          gameData.player2?.id && gameData.player2.id !== "";

        if (player1Exists && player2Exists) {
          Swal.fire({
            icon: "info",
            title: "Phòng đầy!",
            text: "Phòng này đã đủ 2 người rồi!",
            confirmButtonColor: "#3b82f6",
          });
          setLoading(false);
          return;
        }

        // Tạo ID cho người chơi mới
        const newPlayerId = "user_" + Math.random().toString(36).substring(7);

        // Vào vị trí còn trống
        if (!player1Exists) {
          // Vào với tư cách Player 1 - Random nhân vật mới
          const shuffled = [...CHARACTERS].sort(() => 0.5 - Math.random());
          const newP1Target = shuffled[0];

          await update(roomRef, {
            "player1/id": newPlayerId,
            "player1/targetCharacter": newP1Target,
            "player1/eliminated": [],
            status: player2Exists ? "playing" : "waiting",
          });
          onJoinGame(roomIdInput, newPlayerId, "player1");
        } else if (!player2Exists) {
          // Vào với tư cách Player 2 - Random nhân vật mới
          const shuffled = [...CHARACTERS].sort(() => 0.5 - Math.random());
          const newP2Target = shuffled[0];

          await update(roomRef, {
            "player2/id": newPlayerId,
            "player2/targetCharacter": newP2Target,
            "player2/eliminated": [],
            status: "playing", // Khi p2 vào thì bắt đầu chơi
          });
          onJoinGame(roomIdInput, newPlayerId, "player2");
        }
      } else {
        // TRƯỜNG HỢP: Phòng chưa có -> Tạo mới và là Player 1
        const p1Id = "user_" + Math.random().toString(36).substring(7);

        // Random 2 nhân vật khác nhau từ danh sách 25 người
        const shuffled = [...CHARACTERS].sort(() => 0.5 - Math.random());
        const p1Target = shuffled[0]; // Nhân vật P2 phải đoán
        const p2Target = shuffled[1]; // Nhân vật P1 phải đoán

        const newGame = {
          roomID: roomIdInput,
          createdAt: Date.now(), // Timestamp tạo phòng
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
      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: "Có lỗi xảy ra! Vui lòng thử lại.",
        confirmButtonColor: "#3b82f6",
      });
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
