import { useCallback, useEffect, useRef, useState } from "react";
import type { FireMode, ShootingRound, StandNo } from "../domain/shooting";
import { changeRoundStartStand, changeShotStand } from "../domain/shooting";
import { applyShotInput, getShotInput, type ShotInput } from "../domain/shootingInput";
import { calculateRoundStats } from "../domain/shootingStats";
import "./RoundInput.css";

interface Props { round: ShootingRound; onChange: (round: ShootingRound) => void; }
const stands: StandNo[] = [1, 2, 3, 4, 5];
const inputs: { value: ShotInput; label: string; title: string; shortcut: string }[] = [
  { value: "hit-on-first", label: "1", title: "初矢命中", shortcut: "1" },
  { value: "hit-on-second", label: "2", title: "二の矢命中", shortcut: "2" },
  { value: "miss-left", label: "←", title: "左失中", shortcut: "←" },
  { value: "miss-center", label: "↑", title: "中央失中", shortcut: "↑" },
  { value: "miss-right", label: "→", title: "右失中", shortcut: "→" },
];
const scoreLabels: Record<ShotInput, string> = {
  "hit-on-first": "1", "hit-on-second": "2", "miss-left": "←",
  "miss-center": "↑", "miss-right": "→", skip: "",
};

export function RoundInput({ round, onChange }: Props) {
  const stats = calculateRoundStats(round);
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstEmpty = round.shots.findIndex((shot) => shot.finalResult === "skip");
    return firstEmpty >= 0 ? firstEmpty : 0;
  });
  const activeCellRef = useRef<HTMLButtonElement>(null);
  const activeShot = round.shots[activeIndex] ?? round.shots[0];
  const visibleInputs = round.fireMode === "single" ? inputs.filter((item) => item.value !== "hit-on-second") : inputs;

  useEffect(() => { activeCellRef.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [activeIndex]);

  const updateShot = useCallback((input: ShotInput) => {
    onChange({ ...round, shots: round.shots.map((shot, index) => index === activeIndex ? applyShotInput(shot, input) : shot) });
  }, [activeIndex, onChange, round]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.target as HTMLElement | null)?.matches("input, select, textarea")) return;
      if (event.key === "Enter") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(24, Math.max(0, current + (event.shiftKey ? -1 : 1))));
        return;
      }
      const shortcut: Record<string, ShotInput | undefined> = {
        "1": "hit-on-first", "2": round.fireMode === "double" ? "hit-on-second" : undefined,
        ArrowLeft: "miss-left", ArrowUp: "miss-center", ArrowRight: "miss-right",
      };
      const input = shortcut[event.key];
      if (!input) return;
      event.preventDefault();
      updateShot(input);
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [activeIndex, round, updateShot]);

  function changeFireMode(fireMode: FireMode) {
    if (fireMode === round.fireMode) return;
    let shots = round.shots;
    if (fireMode === "single" && shots.some((shot) => shot.finalResult === "hit-on-second")) {
      if (!window.confirm("二の矢命中を未入力へ戻して、1発撃ちに変更しますか？")) return;
      shots = shots.map((shot) => shot.finalResult === "hit-on-second" ? applyShotInput(shot, "skip") : shot);
    }
    onChange({ ...round, fireMode, shots });
  }

  function updateActualCartridges(value: string) {
    const actualCartridgesUsed = value === "" ? undefined : Math.max(0, Number(value));
    onChange({ ...round, actualCartridgesUsed });
  }

  if (!activeShot) return null;
  return <section className="round-input">
    <header className="round-header">
      <div><p className="eyebrow">ROUND</p><h2>{round.roundNo}</h2></div>
      <div className="fire-mode"><button className={round.fireMode === "single" ? "selected" : ""} onClick={() => changeFireMode("single")}>1発撃ち</button><button className={round.fireMode === "double" ? "selected" : ""} onClick={() => changeFireMode("double")}>2発撃ち</button></div>
      <div className="round-score"><strong>{stats.score}</strong><span>/ 25</span></div>
    </header>
    <div className="round-settings"><span>開始射台</span><div>{stands.map((stand) => <button className={round.startStandNo === stand ? "selected" : ""} key={stand} onClick={() => onChange(changeRoundStartStand(round, stand))}>{stand}</button>)}</div></div>
    <div className="round-summary"><span>初矢 {stats.firstShotHits}</span><span>二の矢 {stats.secondShotHits}</span><span>失中 {stats.misses}</span><span>実包 {stats.cartridgesUsed}発</span></div>
    <div className="cartridge-adjust"><span>実包消費</span><small>自動計算 {stats.expectedCartridgesUsed}発</small><label>実数<input min="0" inputMode="numeric" placeholder={String(stats.expectedCartridgesUsed)} type="number" value={round.actualCartridgesUsed ?? ""} onChange={(event) => updateActualCartridges(event.target.value)} /></label>{round.actualCartridgesUsed !== undefined && <button onClick={() => updateActualCartridges("")}>自動に戻す</button>}</div>

    <div className="scorecard-wrap">
      <div className="scorecard" aria-label="25枚のスコアカード">
        {round.shots.map((shot, index) => <button ref={index === activeIndex ? activeCellRef : undefined} className={`score-cell${index === activeIndex ? " active" : ""}${shot.finalResult === "miss" ? " miss" : ""}`} key={shot.id} onClick={() => setActiveIndex(index)}>
          <span>{shot.targetNo}</span><strong>{scoreLabels[getShotInput(shot)] || "·"}</strong><small>射台{shot.standNo}</small>
        </button>)}
      </div>
    </div>

    <section className="current-shot">
      <header><div><span>現在のクレー</span><strong>{activeShot.targetNo}</strong></div><label>射台<select value={activeShot.standNo} onChange={(event) => onChange(changeShotStand(round, activeShot.id, Number(event.target.value) as StandNo))}>{stands.map((stand) => <option key={stand}>{stand}</option>)}</select></label></header>
      <div className={`current-shot-buttons ${round.fireMode}`}>{visibleInputs.map((input) => <button className={getShotInput(activeShot) === input.value ? "selected" : ""} key={input.value} onClick={() => updateShot(input.value)}><strong>{input.label}</strong><span>{input.title}</span><kbd>{input.shortcut}</kbd></button>)}</div>
      <p>Enterで次へ　Shift＋Enterで前へ</p>
    </section>
  </section>;
}
