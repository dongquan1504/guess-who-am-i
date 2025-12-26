import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import { CHARACTERS } from '../data/character';

const GameScreen = ({ roomId, playerId, playerRole }) => {
  const [gameData, setGameData] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const [targetCharacter, setTargetCharacter] = useState(null);

  useEffect(() => {
    // Lắng nghe thay đổi realtime từ Firebase
    const roomRef = ref(db, `roomId/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGameData(data);
        
        // Lấy thông tin của player hiện tại
        const currentPlayer = playerRole === 'player1' ? data.player1 : data.player2;
        setEliminated(currentPlayer.eliminated || []);
        
        // Nhân vật mà player này phải đoán (là target của đối thủ)
        const opponentTarget = playerRole === 'player1' ? data.player2.targetCharacter : data.player1.targetCharacter;
        setTargetCharacter(opponentTarget);
      }
    });

    return () => unsubscribe();
  }, [roomId, playerRole]);

  const handleCharacterClick = async (characterId) => {
    const newEliminated = eliminated.includes(characterId)
      ? eliminated.filter(id => id !== characterId) // Bỏ loại nếu đã loại rồi
      : [...eliminated, characterId]; // Thêm vào danh sách loại

    setEliminated(newEliminated);

    // Cập nhật lên Firebase
    const roomRef = ref(db, `roomId/${roomId}`);
    await update(roomRef, {
      [`${playerRole}/eliminated`]: newEliminated
    });
  };

  if (!gameData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Đang tải dữ liệu...</p>
      </div>
    );
  }

  // Lọc ra 24 nhân vật (loại bỏ nhân vật bí mật của mình)
  const availableCharacters = CHARACTERS.filter(
    char => char.id !== targetCharacter?.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h1 className="text-2xl font-bold text-center text-purple-600 mb-2">
            Who Am I? - Room {roomId}
          </h1>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Bạn là: <span className="font-semibold text-blue-600">{playerRole === 'player1' ? 'Player 1' : 'Player 2'}</span>
            </span>
            <span className="text-gray-600">
              Trạng thái: <span className="font-semibold text-green-600">{gameData.status === 'playing' ? 'Đang chơi' : 'Đợi người chơi'}</span>
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
                <h3 className="text-xl font-bold text-gray-800">{targetCharacter.name}</h3>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {availableCharacters.slice(0, 24).map((character) => {
                const isEliminated = eliminated.includes(character.id);
                return (
                  <div
                    key={character.id}
                    onClick={() => handleCharacterClick(character.id)}
                    className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                      isEliminated ? 'opacity-30 grayscale' : 'opacity-100'
                    }`}
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
            💡 <strong>Cách chơi:</strong> Click vào nhân vật để loại bỏ (làm mờ). Click lần 2 để hiện lại. 
            Hãy đặt câu hỏi và loại trừ các nhân vật cho đến khi đoán ra nhân vật của đối thủ!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
