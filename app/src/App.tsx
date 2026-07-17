import { useState } from "react";
import "./App.css";
import { RoundInput } from "./components/RoundInput";
import {
  createEmptyRound,
  type ShootingRound,
} from "./domain/shooting";

function App() {
  const [round, setRound] = useState<ShootingRound>(
    () => createEmptyRound(1),
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-kicker">CLAY SHOOTING ANALYSIS</p>
          <h1>Shoot Log</h1>
        </div>

        <p className="version">Version 0.1.0</p>
      </header>

      <RoundInput
        onChange={setRound}
        round={round}
      />
    </main>
  );
}

export default App;
