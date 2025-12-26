import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { CHARACTERS } from "../data/character";
import { db } from "../firebase";
import { useGameSounds } from "../hooks/useGameSounds";

const GameScreen = ({ roomId, playerId, playerRole, onLeaveRoom }) => {
  const [gameData, setGameData] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const [targetCharacter, setTargetCharacter] = useState(null);
  const [shuffledCharacters, setShuffledCharacters] = useState([]);
  const { playClick, playVictory, playDefeat } = useGameSounds();

  useEffect(() => {
    // Lắng nghe thay đổi realtime từ Firebase
    const roomRef = ref(db, `roomId/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGameData(data);

        // Lấy thông tin của player hiện tại
        const currentPlayer =
          playerRole === "player1" ? data.player1 : data.player2;
        setEliminated(currentPlayer.eliminated || []);

        // Nhân vật của CHÍNH MÌNH (để hiển thị cho mình xem)
        const myTarget =
          playerRole === "player1"
            ? data.player1.targetCharacter
            : data.player2.targetCharacter;
        setTargetCharacter(myTarget);
      }
    });

    return () => unsubscribe();
  }, [roomId, playerRole]);

  // Kiểm tra kết quả từ đối thủ mỗi 0.5s
  useEffect(() => {
    if (!gameData || gameData.winner) return;

    const checkInterval = setInterval(() => {
      // Kiểm tra nếu có winner mới
      const roomRef = ref(db, `roomId/${roomId}`);
      onValue(
        roomRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();

            // Nếu có winner và không phải do mình vừa thắng
            if (data.winner && data.winner !== playerRole) {
              clearInterval(checkInterval);
              playDefeat(); // Phát âm thanh thua
              setTimeout(() => {
                alert("😢 Đối thủ đã đoán đúng trước bạn! Bạn thua!");
              }, 100);
            }
          }
        },
        { onlyOnce: true }
      );
    }, 500);

    return () => clearInterval(checkInterval);
  }, [gameData, roomId, playerRole, playDefeat]);

  // Xáo trộn 24 nhân vật chỉ 1 lần khi mới vào phòng
  useEffect(() => {
    if (targetCharacter && shuffledCharacters.length === 0) {
      const availableChars = CHARACTERS.filter(
        (char) => char.id !== targetCharacter.id
      );
      // Xáo trộn mảng
      const shuffled = [...availableChars].sort(() => Math.random() - 0.5);
      setShuffledCharacters(shuffled.slice(0, 24));
    }
  }, [targetCharacter, shuffledCharacters.length]);

  const handleLeaveRoom = async () => {
    const confirmLeave = window.confirm("Bạn có chắc muốn thoát khỏi phòng? Game sẽ kết thúc.");
    if (!confirmLeave) return;

    try {
      const roomRef = ref(db, `roomId/${roomId}`);
      
      // Xóa dữ liệu player hiện tại
      await update(roomRef, {
        [`${playerRole}/id`]: "",
        [`${playerRole}/eliminated`]: [],
        winner: null,
        status: "waiting"
      });

      // Quay về lobby
      onLeaveRoom();
    } catch (error) {
      console.error("Lỗi khi thoát phòng:", error);
      alert("Có lỗi xảy ra khi thoát phòng!");
    }
  };

  const handleCharacterClick = async (characterId) => {
    // Nếu game đã kết thúc thì không cho click nữa
    if (gameData.winner) return;

    playClick(); // Phát âm thanh click

    const newEliminated = eliminated.includes(characterId)
      ? eliminated.filter((id) => id !== characterId) // Bỏ loại nếu đã loại rồi
      : [...eliminated, characterId]; // Thêm vào danh sách loại

    setEliminated(newEliminated);

    // Cập nhật lên Firebase
    const roomRef = ref(db, `roomId/${roomId}`);
    await update(roomRef, {
      [`${playerRole}/eliminated`]: newEliminated,
    });

    // Kiểm tra điều kiện chiến thắng: đã loại 23 nhân vật, còn 1 nhân vật
    if (newEliminated.length === 23) {
      checkWinCondition(newEliminated);
    }
  };

  const checkWinCondition = async (eliminatedList) => {
    // Tìm nhân vật duy nhất còn lại (không bị loại)
    const remainingCharacter = shuffledCharacters.find(
      (char) => !eliminatedList.includes(char.id)
    );

    if (!remainingCharacter) return;

    // Lấy target character của ĐỐI THỦ (nhân vật mà đối thủ đang giữ - cần đoán)
    const opponentPlayer =
      playerRole === "player1" ? gameData.player2 : gameData.player1;
    const opponentTarget = opponentPlayer.targetCharacter;

    const roomRef = ref(db, `roomId/${roomId}`);

    // Kiểm tra xem nhân vật còn lại có đúng là target của đối thủ không
    if (remainingCharacter.id === opponentTarget.id) {
      // THẮNG! - Đoán đúng nhân vật của đối thủ
      playVictory(); // Phát âm thanh chiến thắng
      
      await update(roomRef, {
        winner: playerRole,
        status: "finished",
      });

      setTimeout(() => {
        alert(
          `🎉 Chúc mừng! Bạn đã đoán đúng! Nhân vật của đối thủ là ${opponentTarget.name}!`
        );
      }, 300);
    } else {
      // THUA! - Đoán sai nhân vật của đối thủ
      playDefeat(); // Phát âm thanh thua cuộc
      
      const winner = playerRole === "player1" ? "player2" : "player1";

      await update(roomRef, {
        winner: winner,
        status: "finished",
      });

      setTimeout(() => {
        alert(
          `❌ Rất tiếc! Bạn đã đoán sai! Nhân vật của đối thủ là ${opponentTarget.name}, không phải ${remainingCharacter.name}.`
        );
      }, 300);
    }
  };

  if (!gameData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-center text-purple-600 flex-1">
              Who Am I? - Room {roomId}
            </h1>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
            >
              Thoát phòng
            </button>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Bạn là:{" "}
              <span className="font-semibold text-blue-600">
                {playerRole === "player1" ? "Player 1" : "Player 2"}
              </span>
            </span>
            <span className="text-gray-600">
              Trạng thái:{" "}
              <span
                className={`font-semibold ${
                  gameData.winner
                    ? gameData.winner === playerRole
                      ? "text-green-600"
                      : "text-red-600"
                    : "text-blue-600"
                }`}
              >
                {gameData.winner
                  ? gameData.winner === playerRole
                    ? "🎉 Bạn thắng!"
                    : "😢 Bạn thua!"
                  : gameData.status === "playing"
                  ? "Đang chơi"
                  : "Đợi người chơi"}
              </span>
            </span>
          </div>
          {/* Hiển thị số nhân vật đã loại */}
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600">
              Đã loại:{" "}
              <span className="font-bold text-purple-600">
                {eliminated.length}/23
              </span>{" "}
              nhân vật
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nhân vật bí mật - Đối thủ phải đoán */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4">
            <h2 className="text-xl font-bold text-center mb-4 text-purple-600">
              Nhân vật của bạn
            </h2>
            <p className="text-sm text-gray-600 text-center mb-4">
              Đối thủ phải đoán nhân vật này!
            </p>
            {targetCharacter && (
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-purple-500 shadow-xl mb-3">
                  <img
                    src={targetCharacter.image}
                    alt={targetCharacter.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {targetCharacter.name}
                </h3>
              </div>
            )}
          </div>
        </div>

        {/* Lưới 24 nhân vật */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-blue-600">
              Đoán xem đối thủ có nhân vật nào? (Click để loại bỏ)
            </h2>
            {gameData.winner && (
              <div
                className={`mb-4 p-4 rounded-lg text-center ${
                  gameData.winner === playerRole
                    ? "bg-green-100 border-2 border-green-500"
                    : "bg-red-100 border-2 border-red-500"
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    gameData.winner === playerRole
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {gameData.winner === playerRole
                    ? "🎉 Chúc mừng! Bạn đã chiến thắng!"
                    : "😢 Rất tiếc! Bạn đã thua cuộc!"}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {shuffledCharacters.map((character) => {
                const isEliminated = eliminated.includes(character.id);
                return (
                  <div
                    key={character.id}
                    onClick={() =>
                      !gameData.winner && handleCharacterClick(character.id)
                    }
                    className={`transition-all duration-300 transform ${
                      !gameData.winner
                        ? "cursor-pointer hover:scale-105"
                        : "cursor-not-allowed"
                    } ${isEliminated ? "opacity-30 grayscale" : "opacity-100"}`}
                  >
                    <div className="bg-gray-50 rounded-lg p-2 shadow-md hover:shadow-xl">
                      <div className="w-full aspect-square rounded-full overflow-hidden border-2 border-gray-300 mb-2">
                        <img
                          src={character.image}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-medium text-center text-gray-700 truncate">
                        {character.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-sm text-yellow-800">
            💡 <strong>Cách chơi:</strong> Click vào nhân vật để loại bỏ (làm
            mờ). Click lần 2 để hiện lại. Hãy đặt câu hỏi và loại trừ các nhân
            vật cho đến khi đoán ra nhân vật của đối thủ!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
