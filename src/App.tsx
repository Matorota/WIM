import { useGameStore } from "./store/gameStore";
import { GameSetup } from "./components/GameSetup";
import { GameView } from "./components/GameView";
import "./App.css";

function App() {
  const { isGameStarted, startGame } = useGameStore();

  return (
    <div className="App">
      {!isGameStarted ? <GameSetup onStartGame={startGame} /> : <GameView />}
    </div>
  );
}

export default App;
