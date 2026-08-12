import { useCallback, useEffect, useRef, useState } from "react";
import type { FireMode, ShootingRound, StandNo } from "../domain/shooting";
import { changeRoundStartStand, changeShotStand } from "../domain/shooting";
import { applyShotInput, getNextShotIndex, getShotInput, type ShotInput } from "../domain/shootingInput";
import { calculateRoundStats } from "../domain/shootingStats";
import "./RoundInput.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { round: ShootingRound; onChange: (round: ShootingRound) => void; }
const stands: StandNo[] = [1, 2, 3, 4, 5];
const inputs: { value: ShotInput; label: string; title: string; shortcut: string }[] = [
  { value: "hit-on-first", label: "1", title: "初矢命中", shortcut: "1" },
  { value: "hit-on-second", label: "2", title: "二の矢命中", shortcut: "2" },
  { value: "hit-on-first-second-fired", label: "1＋", title: "初矢命中＋二発目", shortcut: "3" },
  { value: "miss-left", label: "←", title: "左失中", shortcut: "←" },
  { value: "miss-center", label: "↑", title: "中央失中", shortcut: "↑" },
  { value: "miss-right", label: "→", title: "右失中", shortcut: "→" },
];
const scoreLabels: Record<ShotInput, string> = {
  "hit-on-first": "1", "hit-on-second": "2", "hit-on-first-second-fired": "1＋", "miss-left": "←",
  "miss-center": "↑", "miss-right": "→", skip: "",
};

export function RoundInput({ round, onChange }: Props) {
  const { text } = useLanguage();
  const stats = calculateRoundStats(round);
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstEmpty = round.shots.findIndex((shot) => shot.finalResult === "skip");
    return firstEmpty >= 0 ? firstEmpty : 0;
  });
  const activeCellRef = useRef<HTMLButtonElement>(null);
  const activeShot = round.shots[activeIndex] ?? round.shots[0];
  const visibleInputs = round.fireMode === "single" ? inputs.filter((item) => item.value !== "hit-on-second" && item.value !== "hit-on-first-second-fired") : inputs;

  useEffect(() => { activeCellRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }, [activeIndex]);

  const updateShot = useCallback((input: ShotInput) => {
    onChange({ ...round, shots: round.shots.map((shot, index) => index === activeIndex ? applyShotInput(shot, input) : shot) });
    setActiveIndex((current) => getNextShotIndex(current, round.shots.length));
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
        "3": round.fireMode === "double" ? "hit-on-first-second-fired" : undefined,
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
    if (fireMode === "single" && shots.some((shot) => shot.finalResult === "hit-on-second" || shot.secondShotFiredAfterFirstHit === true)) {
      if (!window.confirm(text("二発目の記録を調整して、1発撃ちに変更しますか？\n二の矢命中は未入力へ戻り、初矢命中後の二発目発射は初矢命中として残ります。", "Change to single-shot mode and adjust second-shot records?\nSecond-shot hits will return to blank. A second shot fired after a first-shot hit will remain a first-shot hit."))) return;
      shots = shots.map((shot) => shot.finalResult === "hit-on-second"
        ? applyShotInput(shot, "skip")
        : shot.secondShotFiredAfterFirstHit === true ? applyShotInput(shot, "hit-on-first") : shot);
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
      <div className="fire-mode"><button className={round.fireMode === "single" ? "selected" : ""} onClick={() => changeFireMode("single")}>{text("1発撃ち", "Single shot")}</button><button className={round.fireMode === "double" ? "selected" : ""} onClick={() => changeFireMode("double")}>{text("2発撃ち", "Two shots")}</button></div>
      <div className="round-score"><strong>{stats.score}</strong><span>/ 25</span></div>
    </header>
    <div className="round-settings"><span>{text("開始射台", "Starting stand")}</span><div>{stands.map((stand) => <button className={round.startStandNo === stand ? "selected" : ""} key={stand} onClick={() => onChange(changeRoundStartStand(round, stand))}>{stand}</button>)}</div></div>
    <div className="round-summary"><span>{text("初矢", "First-shot hits")} {stats.firstShotHits}</span><span>{text("二の矢", "Second-shot hits")} {stats.secondShotHits}</span><span>{text("命中後2発目", "Extra shots after hit")} {stats.secondShotsAfterFirstHit}</span><span>{text("失中", "Misses")} {stats.misses}</span><span>{text("実包", "Shells")} {stats.cartridgesUsed}</span></div>
    <div className="cartridge-adjust"><span>{text("実包消費", "Shells used")}</span><small>{text("自動計算", "Calculated")} {stats.expectedCartridgesUsed}</small><label>{text("実数", "Actual")}<input min="0" inputMode="numeric" placeholder={String(stats.expectedCartridgesUsed)} type="number" value={round.actualCartridgesUsed ?? ""} onChange={(event) => updateActualCartridges(event.target.value)} /></label>{round.actualCartridgesUsed !== undefined && <button onClick={() => updateActualCartridges("")}>{text("自動に戻す", "Use calculated")}</button>}</div>

    <div className="scorecard-wrap">
      <div className="scorecard" aria-label={text("25枚のスコアカード", "25-target scorecard")}>
        {round.shots.map((shot, index) => <button ref={index === activeIndex ? activeCellRef : undefined} className={`score-cell${index === activeIndex ? " active" : ""}${shot.finalResult === "miss" ? " miss" : ""}`} key={shot.id} onClick={() => setActiveIndex(index)}>
          <span>{shot.targetNo}</span><strong>{scoreLabels[getShotInput(shot)] || "·"}</strong><small>{text("射台", "Stand ")}{shot.standNo}</small>
        </button>)}
      </div>
    </div>

    <section className="current-shot">
      <header><div><span>{text("現在のクレー", "Current target")}</span><strong>{activeShot.targetNo}</strong></div><label>{text("射台", "Stand")}<select value={activeShot.standNo} onChange={(event) => onChange(changeShotStand(round, activeShot.id, Number(event.target.value) as StandNo))}>{stands.map((stand) => <option key={stand}>{stand}</option>)}</select></label></header>
      <div className={`current-shot-buttons ${round.fireMode}`}>{visibleInputs.map((input) => <button className={getShotInput(activeShot) === input.value ? "selected" : ""} key={input.value} onClick={() => updateShot(input.value)}><strong>{input.value === "hit-on-first-second-fired" ? text("1＋", "1+") : input.label}</strong><span>{({ "hit-on-first": text("初矢命中", "First-shot hit"), "hit-on-second": text("二の矢命中", "Second-shot hit"), "hit-on-first-second-fired": text("初矢命中＋二発目", "First hit + extra shot"), "miss-left": text("左失中", "Miss left"), "miss-center": text("中央失中", "Miss center"), "miss-right": text("右失中", "Miss right"), skip: "" } as Record<ShotInput, string>)[input.value]}</span><kbd>{input.shortcut}</kbd></button>)}</div>
      <p>{text("結果入力後は自動で次へ　Enterで次へ　Shift＋Enterで前へ", "Moves to the next target after input · Enter: next · Shift + Enter: previous")}</p>
    </section>
  </section>;
}
