import { get, onValue, ref, remove, update } from "firebase/database";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { CHARACTERS } from "../data/character";
import { db } from "../firebase";
import { useGameSounds } from "../hooks/useGameSounds";

const GameScreen = ({ roomId, playerId, playerRole, onLeaveRoom }) => {
  const [gameData, setGameData] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const [targetCharacter, setTargetCharacter] = useState(null);
  const [shuffledCharacters, setShuffledCharacters] = useState([]);
  const [longPressTimer, setLongPressTimer] = useState(null); // Timer cho nhấn giữ
  const [previousStatus, setPreviousStatus] = useState(null);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [hasProcessedWinner, setHasProcessedWinner] = useState(false); // Track xem đã xử lý winner chưa
  const { playClick, playVictory, playDefeat } = useGameSounds();
  console.log(shuffledCharacters);
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

  // Xử lý khi có winner (cho player bị động - người không đoán)
  useEffect(() => {
    // Chỉ xử lý khi có gameData, có winner, và chưa xử lý winner này
    if (!gameData || !gameData.winner || hasProcessedWinner) return;

    // Nếu winner là MÌNH → Mình thắng (bị động - đối thủ đoán sai)
    if (gameData.winner === playerRole) {
      setHasProcessedWinner(true); // Đánh dấu đã xử lý
      playVictory(); // Phát âm thanh thắng

      // Lấy nhân vật của đối thủ (để hiển thị)
      const opponentPlayer =
        playerRole === "player1" ? gameData.player2 : gameData.player1;
      const opponentTarget = opponentPlayer?.targetCharacter;

      setTimeout(async () => {
        // Hiển thị popup chi tiết cho người chơi bị động (thắng)
        await Swal.fire({
          icon: "success",
          title: "🎉 Chúc mừng!",
          html: `
            <div style="text-align: center;">
              <p style="font-size: 18px; margin-bottom: 20px;">Đối thủ đã đoán sai!</p>
              <img src="${opponentTarget?.image}" 
                   alt="${opponentTarget?.name}" 
                   style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 5px solid #10b981;" />
              <p style="font-size: 20px; font-weight: bold; color: #10b981; margin-top: 15px;">${opponentTarget?.name}</p>
              <p style="font-size: 16px; color: #6b7280; margin-top: 10px;">Nhân vật của đối thủ</p>
            </div>
          `,
          confirmButtonColor: "#10b981",
          confirmButtonText: "Tuyệt vời!",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        // Sau khi người chơi confirm, xóa phòng và quay về lobby
        const roomRef = ref(db, `roomId/${roomId}`);
        await remove(roomRef);
        setGameData(null);
        setEliminated([]);
        setTargetCharacter(null);
        setShuffledCharacters([]);
        setHasProcessedWinner(false); // Reset flag
        onLeaveRoom();
      }, 800);
    }
    // Nếu winner KHÔNG phải là mình → Mình thua (bị động)
    else if (gameData.winner !== playerRole) {
      setHasProcessedWinner(true); // Đánh dấu đã xử lý
      playDefeat(); // Phát âm thanh thua

      setTimeout(async () => {
        // Hiển thị popup chi tiết cho người chơi bị động (thua)
        await Swal.fire({
          icon: "error",
          title: "❌ Rất tiếc!",
          html: `
            <div style="text-align: center;">
              <p style="font-size: 18px; margin-bottom: 20px;">Đối thủ đã đoán đúng trước bạn!</p>
              <img src="${targetCharacter?.image}" 
                   alt="${targetCharacter?.name}" 
                   style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 5px solid #ef4444;" />
              <p style="font-size: 20px; font-weight: bold; color: #ef4444; margin-top: 15px;">${targetCharacter?.name}</p>
              <p style="font-size: 16px; color: #6b7280; margin-top: 10px;">Nhân vật của bạn</p>
            </div>
          `,
          confirmButtonColor: "#ef4444",
          confirmButtonText: "Thử lại lần sau",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        // Sau khi người chơi confirm, xóa phòng và quay về lobby
        const roomRef = ref(db, `roomId/${roomId}`);
        await remove(roomRef);
        setGameData(null);
        setEliminated([]);
        setTargetCharacter(null);
        setShuffledCharacters([]);
        setHasProcessedWinner(false); // Reset flag
        onLeaveRoom();
      }, 800);
    }
  }, [
    gameData,
    playerRole,
    hasProcessedWinner,
    targetCharacter,
    playDefeat,
    playVictory,
    roomId,
    onLeaveRoom,
  ]);

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

  // Theo dõi thay đổi status và reset eliminated khi chuyển về waiting
  useEffect(() => {
    if (gameData) {
      // Nếu chuyển từ playing về waiting → Reset eliminated và thông báo
      if (previousStatus === "playing" && gameData.status === "waiting") {
        setEliminated([]);

        // Cập nhật Firebase để reset eliminated
        const roomRef = ref(db, `roomId/${roomId}`);
        update(roomRef, {
          [`${playerRole}/eliminated`]: [],
        });

        // Thông báo người chơi đã thoát (chỉ khi không phải tự thoát)
        if (!isLeavingRoom) {
          Swal.fire({
            icon: "warning",
            title: "Người chơi đã thoát!",
            text: "Đang chờ người chơi mới...",
            confirmButtonColor: "#3b82f6",
          });
        }
      }

      // Cập nhật previousStatus
      setPreviousStatus(gameData.status);
    }
  }, [gameData, previousStatus, roomId, playerRole, isLeavingRoom]);

  const handleLeaveRoom = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Thoát phòng?",
      text: "Bạn có chắc muốn thoát khỏi phòng? Game sẽ kết thúc.",
      showCancelButton: true,
      confirmButtonText: "Thoát",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    // Đánh dấu đang thoát phòng để không hiển thị thông báo
    setIsLeavingRoom(true);

    try {
      const roomRef = ref(db, `roomId/${roomId}`);
      const snapshot = await get(roomRef);

      if (snapshot.exists()) {
        const currentData = snapshot.val();
        const opponentRole = playerRole === "player1" ? "player2" : "player1";
        const opponentExists =
          currentData[opponentRole]?.id && currentData[opponentRole].id !== "";

        // Nếu đang ở trạng thái waiting hoặc không còn player nào khác -> XÓA PHÒNG
        if (currentData.status === "waiting" || !opponentExists) {
          await remove(roomRef);
        } else {
          // Nếu vẫn còn đối thủ và đang playing -> CHỈ XÓA ID
          await update(roomRef, {
            [`${playerRole}/id`]: "",
            [`${playerRole}/eliminated`]: [],
            winner: null,
            status: "waiting",
          });
        }
      }

      // Reset tất cả state về mặc định
      setGameData(null);
      setEliminated([]);
      setTargetCharacter(null);
      setShuffledCharacters([]);

      // Quay về lobby
      onLeaveRoom();
    } catch (error) {
      console.error("Lỗi khi thoát phòng:", error);
      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: "Có lỗi xảy ra khi thoát phòng!",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const handleCharacterClick = async (characterId) => {
    // Chỉ cho phép click khi đang playing
    if (gameData.winner || gameData.status !== "playing") return;

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

  // Xử lý chọn nhanh nhân vật (nhấn giữ 1s hoặc click chuột phải)
  const handleQuickSelect = async (characterId) => {
    if (gameData.winner || gameData.status !== "playing") return;

    // Tìm nhân vật được chọn
    const selectedCharacter = shuffledCharacters.find(
      (char) => char.id === characterId
    );

    // Hiển thị confirm dialog với hình ảnh nhân vật
    const result = await Swal.fire({
      title: "Chọn nhanh nhân vật?",
      html: `
        <div style="text-align: center;">
          <img src="${selectedCharacter.image}" 
               alt="${selectedCharacter.name}" 
               style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 4px solid #8b5cf6;" />
          <p style="font-size: 18px; font-weight: bold; margin: 10px 0;">${selectedCharacter.name}</p>
          <p style="color: #ef4444; font-weight: bold;">Bạn chắc chắn muốn đoán nhân vật này?</p>
          <p style="font-size: 14px; color: #6b7280;">Hành động này sẽ loại bỏ tất cả nhân vật khác và kiểm tra kết quả ngay!</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đoán nhân vật này!",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#8b5cf6",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    // Loại tất cả nhân vật TRỪ nhân vật được chọn
    const allOtherCharacters = shuffledCharacters
      .filter((char) => char.id !== characterId)
      .map((char) => char.id);

    setEliminated(allOtherCharacters);

    // Cập nhật lên Firebase
    const roomRef = ref(db, `roomId/${roomId}`);
    await update(roomRef, {
      [`${playerRole}/eliminated`]: allOtherCharacters,
    });

    // Kiểm tra kết quả ngay lập tức (23 nhân vật đã loại)
    checkWinCondition(allOtherCharacters);
  };

  // Xử lý click chuột phải (giữ nguyên để hỗ trợ desktop)
  const handleContextMenu = (e, characterId) => {
    e.preventDefault(); // Ngăn menu chuột phải mặc định
    if (gameData.winner || gameData.status !== "playing") return;
    handleQuickSelect(characterId);
  };

  // Xử lý nhấn giữ cho desktop (mouse)
  const handleMouseDown = (characterId) => {
    if (gameData.winner || gameData.status !== "playing") return;

    const timer = setTimeout(() => {
      handleQuickSelect(characterId);
    }, 3000); // Nhấn giữ 3 giây

    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Xử lý nhấn giữ cho mobile (touch)
  const handleTouchStart = (characterId) => {
    if (gameData.winner || gameData.status !== "playing") return;

    const timer = setTimeout(() => {
      handleQuickSelect(characterId);
    }, 3000); // Nhấn giữ 3 giây

    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const checkWinCondition = async (eliminatedList) => {
    // Đánh dấu đang xử lý winner để tránh duplicate popup
    setHasProcessedWinner(true);

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
      await update(roomRef, {
        winner: playerRole,
        status: "finished",
      });

      playVictory(); // Phát âm thanh chiến thắng sau khi update

      setTimeout(async () => {
        await Swal.fire({
          icon: "success",
          title: "🎉 Chúc mừng!",
          html: `
            <div style="text-align: center;">
              <p style="font-size: 18px; margin-bottom: 20px;">Bạn đã đoán đúng!</p>
              <img src="${opponentTarget.image}" 
                   alt="${opponentTarget.name}" 
                   style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 5px solid #10b981;" />
              <p style="font-size: 20px; font-weight: bold; color: #10b981; margin-top: 15px;">${opponentTarget.name}</p>
              <p style="font-size: 16px; color: #6b7280; margin-top: 10px;">Nhân vật của đối thủ</p>
            </div>
          `,
          confirmButtonColor: "#10b981",
          confirmButtonText: "Tuyệt vời!",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        // Sau khi người chơi confirm, xóa phòng và quay về lobby
        const roomRef = ref(db, `roomId/${roomId}`);
        await remove(roomRef);
        setGameData(null);
        setEliminated([]);
        setTargetCharacter(null);
        setShuffledCharacters([]);
        setHasProcessedWinner(false); // Reset flag
        onLeaveRoom();
      }, 800);
    } else {
      // THUA! - Đoán sai nhân vật của đối thủ
      const winner = playerRole === "player1" ? "player2" : "player1";

      await update(roomRef, {
        winner: winner,
        status: "finished",
      });

      playDefeat(); // Phát âm thanh thua cuộc sau khi update

      setTimeout(async () => {
        await Swal.fire({
          icon: "error",
          title: "❌ Rất tiếc!",
          html: `
            <div style="text-align: center;">
              <p style="font-size: 18px; margin-bottom: 20px;">Bạn đã đoán sai!</p>
              <p style="font-size: 16px; color: #6b7280; margin-bottom: 15px;">Bạn đoán: <strong>${remainingCharacter.name}</strong></p>
              <img src="${opponentTarget.image}" 
                   alt="${opponentTarget.name}" 
                   style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 5px solid #ef4444;" />
              <p style="font-size: 20px; font-weight: bold; color: #ef4444; margin-top: 15px;">${opponentTarget.name}</p>
              <p style="font-size: 16px; color: #6b7280; margin-top: 10px;">Mới là nhân vật của đối thủ</p>
            </div>
          `,
          confirmButtonColor: "#ef4444",
          confirmButtonText: "Thử lại lần sau",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        // Sau khi người chơi confirm, xóa phòng và quay về lobby
        const roomRef = ref(db, `roomId/${roomId}`);
        await remove(roomRef);
        setGameData(null);
        setEliminated([]);
        setTargetCharacter(null);
        setShuffledCharacters([]);
        setHasProcessedWinner(false); // Reset flag
        onLeaveRoom();
      }, 800);
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
              className="px-4 py-2 text-white rounded-lg transition text-sm font-semibold bg-red-500 hover:bg-red-600"
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
                    onContextMenu={(e) => handleContextMenu(e, character.id)}
                    onMouseDown={() => handleMouseDown(character.id)}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={() => handleTouchStart(character.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className={`transition-all duration-300 transform ${
                      !gameData.winner && gameData.status === "playing"
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
            mờ). Click lần 2 để hiện lại.{" "}
            <strong className="text-red-700">
              Nhấn giữ 3 giây hoặc click chuột phải
            </strong>{" "}
            vào nhân vật để chọn nhanh (đoán luôn nhân vật đó). Hãy đặt câu hỏi
            và loại trừ các nhân vật cho đến khi đoán ra nhân vật của đối thủ!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
