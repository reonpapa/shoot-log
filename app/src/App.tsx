import { useState } from "react";
import "./App.css";
import { RoundInput } from "./components/RoundInput";
import {
  SessionForm,
  type SessionDraft,
} from "./components/SessionForm";
import {
  createEmptyRound,
  type ShootingRound,
} from "./domain/shooting";

function App() {
  const [session, setSession] = useState<SessionDraft | null>(null);
  const [round, setRound] = useState<ShootingRound>(
    () => createEmptyRound(1),
  );

  function startSession(sessionDraft: SessionDraft): void {
    setSession(sessionDraft);
    setRound(createEmptyRound(1));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-kicker">CLAY SHOOTING ANALYSIS</p>
          <h1>Shoot Log</h1>
        </div>

        <p className="version">Version 0.1.0</p>
      </header>

      {session === null ? (
        <SessionForm onStart={startSession} />
      ) : (
        <>
          <section className="session-summary">
            <div>
              <strong>{session.date}</strong>
              <span>{session.rangeName}</span>
            </div>

            <div>
              <span>{session.discipline.toUpperCase()}</span>
              <span>{session.ammunitionName}</span>
            </div>

            <button
              onClick={() => setSession(null)}
              type="button"
            >
              セッションを戻る
            </button>
          </section>

          <RoundInput
            onChange={setRound}
            round={round}
          />
        </>
      )}
    </main>
  );
}

export default App;