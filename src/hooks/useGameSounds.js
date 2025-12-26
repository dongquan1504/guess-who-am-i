import useSound from "use-sound";

// Sử dụng các âm thanh miễn phí từ Pixabay hoặc các nguồn khác
// Bạn có thể thay thế bằng file âm thanh của riêng mình

export const useGameSounds = () => {
  // Click sound - âm thanh nhẹ khi click
  const [playClick] = useSound(
    "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    {
      volume: 0.5,
    }
  );

  // Button click - khi click nút
  const [playButton] = useSound(
    "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3",
    {
      volume: 0.6,
    }
  );

  // Victory sound - khi thắng
  const [playVictory] = useSound(
    "https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3",
    {
      volume: 0.7,
    }
  );

  // Defeat sound - khi thua
  const [playDefeat] = useSound(
    "https://assets.mixkit.co/active_storage/sfx/213/213-preview.mp3",
    {
      volume: 0.5,
    }
  );

  return {
    playClick,
    playButton,
    playVictory,
    playDefeat,
  };
};
