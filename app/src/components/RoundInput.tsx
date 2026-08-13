import { useCallback, useEffect, useRef, useState } from "react";
import type { Discipline, FireMode, ShootingRound, StandNo, TrapSetting } from "../domain/shooting";
import { changeRoundStartStand, changeShotStand } from "../domain/shooting";
import { applyShotInput, getNextShotIndex, getShotInput, type ShotInput } from "../domain/shootingInput";
import { calculateRoundStats } from "../domain/shootingStats";
import "./RoundInput.css";
import { useLanguage } from "../i18n/LanguageContext";
import { trapPresetsForRange } from "../services/trapSettings";

interface Props { round: ShootingRound; onChange: (round: ShootingRound) => void; discipline?: Discipline; rangeName?: string; }
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

export function RoundInput({ round, onChange, discipline = "trap", rangeName = "" }: Props) {
  return discipline === "skeet" ? <SkeetRoundInput round={round} onChange={onChange} /> : <TrapRoundInput round={round} onChange={onChange} rangeName={rangeName} />;
}

function TrapRoundInput({ round, onChange, rangeName = "" }: Props) {
  const { text } = useLanguage();
  const stats = calculateRoundStats(round);
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstEmpty = round.shots.findIndex((shot) => shot.finalResult === "skip");
    return firstEmpty >= 0 ? firstEmpty : 0;
  });
  const activeCellRef = useRef<HTMLButtonElement>(null);
  const activeShot = round.shots[activeIndex] ?? round.shots[0];
  const visibleInputs = round.fireMode === "single" ? inputs.filter((item) => item.value !== "hit-on-second" && item.value !== "hit-on-first-second-fired") : inputs;
  const trapPresets = trapPresetsForRange(rangeName);

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

  function updateTrapSetting(changes: Partial<TrapSetting>) {
    const current = round.trapSetting ?? { rangeName, face: "", setType: "" };
    onChange({ ...round, trapSetting: { ...current, ...changes } });
  }

  function chooseTrapSetting(value: string) {
    if (!value) { onChange({ ...round, trapSetting: undefined }); return; }
    const preset = trapPresets.find((item) => item.id === value);
    if (preset) {
      const { id: _id, ...setting } = preset;
      void _id;
      onChange({ ...round, trapSetting: setting });
    } else if (value === "custom") updateTrapSetting({ rangeName: round.trapSetting?.rangeName || rangeName, face: round.trapSetting?.face ?? "" });
  }

  const selectedPreset = trapPresets.find((item) => item.face === round.trapSetting?.face && item.distanceMeters === round.trapSetting?.distanceMeters)?.id ?? (round.trapSetting ? "custom" : "");

  if (!activeShot) return null;
  return <section className="round-input">
    <header className="round-header">
      <div><p className="eyebrow">ROUND</p><h2>{round.roundNo}</h2></div>
      <div className="fire-mode"><button className={round.fireMode === "single" ? "selected" : ""} onClick={() => changeFireMode("single")}>{text("1発撃ち", "Single shot")}</button><button className={round.fireMode === "double" ? "selected" : ""} onClick={() => changeFireMode("double")}>{text("2発撃ち", "Two shots")}</button></div>
      <div className="round-score"><strong>{stats.score}</strong><span>/ 25</span></div>
    </header>
    <div className="round-settings"><span>{text("開始射台", "Starting stand")}</span><div>{stands.map((stand) => <button className={round.startStandNo === stand ? "selected" : ""} key={stand} onClick={() => onChange(changeRoundStartStand(round, stand))}>{stand}</button>)}</div></div>
    <section className="trap-setting-panel">
      <header><div><p className="eyebrow">TARGET SETTING</p><strong>{text("射面・クレー設定", "Field and target setting")}</strong></div><small>{text("ラウンドごとに保存", "Saved per round")}</small></header>
      <label className="trap-setting-preset"><span>{text("設定を選択", "Choose setting")}</span><select value={selectedPreset} onChange={(event) => chooseTrapSetting(event.target.value)}><option value="">{text("設定不明", "Unknown")}</option>{trapPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.face}・{preset.setType}・{preset.distanceMeters}m</option>)}<option value="custom">{text("その他・手動入力", "Other / manual")}</option></select></label>
      {round.trapSetting && <div className="trap-setting-fields">
        <label className="trap-setting-range"><span>{text("射撃場", "Shooting range")}</span><input placeholder={text("例：大井射撃場", "e.g. Ooi Shooting Range")} value={round.trapSetting.rangeName} onChange={(event) => updateTrapSetting({ rangeName: event.target.value })} /></label>
        <label><span>{text("射面", "Field")}</span><input placeholder={text("例：第1面", "e.g. Field 1")} value={round.trapSetting.face} onChange={(event) => updateTrapSetting({ face: event.target.value })} /></label>
        <label><span>{text("セット", "Set")}</span><input placeholder={text("例：ISSF国際セット", "e.g. ISSF set")} value={round.trapSetting.setType} onChange={(event) => updateTrapSetting({ setType: event.target.value })} /></label>
        <label><span>{text("飛行距離", "Distance")}</span><div><input inputMode="decimal" type="number" min="0" value={round.trapSetting.distanceMeters ?? ""} onChange={(event) => updateTrapSetting({ distanceMeters: event.target.value ? Number(event.target.value) : undefined })} /><small>m</small></div></label>
        <label><span>{text("速度目安", "Speed estimate")}</span><div><input inputMode="decimal" type="number" min="0" value={round.trapSetting.speedKmh ?? ""} onChange={(event) => updateTrapSetting({ speedKmh: event.target.value ? Number(event.target.value) : undefined })} /><small>km/h</small></div></label>
        <label><span>{text("確認日", "Confirmed")}</span><input type="date" value={round.trapSetting.confirmedOn ?? ""} onChange={(event) => updateTrapSetting({ confirmedOn: event.target.value })} /></label>
        <label className="trap-setting-note"><span>{text("補足", "Note")}</span><input value={round.trapSetting.note ?? ""} onChange={(event) => updateTrapSetting({ note: event.target.value })} /></label>
      </div>}
      {(rangeName.includes("伊勢原") || rangeName.includes("大井")) && <p>{text("登録値は設定目安です。当日の射撃場掲示を優先してください。", "Presets are estimates. Always follow the range notice for the day.")}</p>}
    </section>
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

function SkeetRoundInput({ round, onChange }: Props) {
  const { text } = useLanguage();
  const stats = calculateRoundStats(round);
  const [activeIndex, setActiveIndex] = useState(() => {
    const empty = round.shots.findIndex((shot) => shot.finalResult === "skip");
    return empty >= 0 ? empty : 0;
  });
  const active = round.shots[activeIndex];

  const enter = useCallback((result: "hit" | "miss") => {
    const shots = round.shots.map((shot, index) => index !== activeIndex ? shot : result === "hit"
      ? { ...shot, firstShotResult: "hit" as const, secondShotResult: "not-fired" as const, finalResult: "hit-on-first" as const, missDirection: undefined }
      : { ...shot, firstShotResult: "miss" as const, secondShotResult: "not-fired" as const, finalResult: "miss" as const, missDirection: undefined });
    onChange({ ...round, shots });
    setActiveIndex((current) => Math.min(round.shots.length - 1, current + 1));
  }, [activeIndex, onChange, round]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches("input, select, textarea")) return;
      if (event.key === "1" || event.key.toLowerCase() === "h") { event.preventDefault(); enter("hit"); }
      if (event.key === "0" || event.key.toLowerCase() === "m") { event.preventDefault(); enter("miss"); }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [enter]);

  if (!active) return null;
  const pairLabel = active.skeetPairId ? text(`ダブル ${active.skeetPairOrder}/2`, `Double ${active.skeetPairOrder}/2`) : text("シングル", "Single");
  const houseLabel = active.skeetHouse === "high" ? text("ハイハウス", "High house") : text("ローハウス", "Low house");
  return <section className="round-input skeet-round-input">
    <header className="round-header"><div><p className="eyebrow">SKEET PREVIEW / ROUND</p><h2>{round.roundNo}</h2></div><div className="round-score"><strong>{stats.score}</strong><span>/ 25</span></div></header>
    <aside className="skeet-preview-note"><strong>{text("スキート試作版", "Skeet preview")}</strong><span>{text("ISSF資格射撃の25枚順を使用。スキート経験者の意見を募集中です。", "Uses the 25-target ISSF qualification sequence. Feedback from skeet shooters is welcome.")}</span></aside>
    <div className="skeet-summary"><span>{text("命中", "Hits")} <b>{stats.score}</b></span><span>{text("失中", "Misses")} <b>{stats.misses}</b></span><span>{text("実包", "Shells")} <b>{stats.cartridgesUsed}</b></span></div>
    <div className="skeet-scorecard" aria-label={text("スキート25枚スコアカード", "25-target skeet scorecard")}>{round.shots.map((shot, index) => <button key={shot.id} className={`${index === activeIndex ? "active " : ""}${shot.finalResult === "hit-on-first" ? "hit" : shot.finalResult === "miss" ? "miss" : ""}`} onClick={() => setActiveIndex(index)}><small>{shot.targetNo}</small><strong>{shot.finalResult === "hit-on-first" ? "○" : shot.finalResult === "miss" ? "×" : "·"}</strong><span>S{shot.standNo} · {shot.skeetHouse === "high" ? "H" : "L"}{shot.skeetPairId ? ` ${shot.skeetPairOrder}/2` : ""}</span></button>)}</div>
    <section className="skeet-current-target"><p className="eyebrow">CURRENT TARGET</p><div className="skeet-target-heading"><div><span>{text("クレー", "Target")}</span><strong>{active.targetNo}</strong></div><div><span>{text("射台", "Station")}</span><strong>{active.standNo}</strong></div></div><div className="skeet-target-detail"><strong>{houseLabel}</strong><span>{pairLabel}</span></div><div className="skeet-result-buttons"><button className={active.finalResult === "hit-on-first" ? "selected hit" : ""} onClick={() => enter("hit")}><strong>○</strong><span>{text("命中", "Hit")}</span><kbd>1 / H</kbd></button><button className={active.finalResult === "miss" ? "selected miss" : ""} onClick={() => enter("miss")}><strong>×</strong><span>{text("失中", "Miss")}</span><kbd>0 / M</kbd></button></div><p>{text("入力すると自動で次のクレーへ進みます。", "Moves to the next target after entry.")}</p></section>
  </section>;
}
