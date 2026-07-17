import type {
  ShootingRound,
  StandNo,
} from "../domain/shooting";
import {
  changeRoundStartStand,
  changeShotStand,
} from "../domain/shooting";
import {
  applyShotInput,
  getShotInput,
  type ShotInput,
} from "../domain/shootingInput";
import { calculateRoundStats } from "../domain/shootingStats";

interface RoundInputProps {
  round: ShootingRound;
  onChange: (round: ShootingRound) => void;
}

const standNumbers: StandNo[] = [1, 2, 3, 4, 5];

const inputButtons: Array<{
  value: ShotInput;
  label: string;
  title: string;
}> = [
  {
    value: "hit-on-first",
    label: "○",
    title: "初矢命中",
  },
  {
    value: "hit-on-second",
    label: "◎",
    title: "二の矢命中",
  },
  {
    value: "miss-left",
    label: "←",
    title: "左失中",
  },
  {
    value: "miss-center",
    label: "｜",
    title: "中失中",
  },
  {
    value: "miss-right",
    label: "→",
    title: "右失中",
  },
  {
    value: "no-bird",
    label: "NB",
    title: "ノーバード",
  },
];

export function RoundInput({
  round,
  onChange,
}: RoundInputProps) {
  const stats = calculateRoundStats(round);

  function updateShot(
    shotId: string,
    input: ShotInput,
  ): void {
    onChange({
      ...round,
      shots: round.shots.map((shot) =>
        shot.id === shotId
          ? applyShotInput(shot, input)
          : shot,
      ),
    });
  }

  function updateStartStand(standNo: StandNo): void {
    onChange(changeRoundStartStand(round, standNo));
  }

  function updateSingleShotStand(
    shotId: string,
    standNo: StandNo,
  ): void {
    onChange(changeShotStand(round, shotId, standNo));
  }

  return (
    <section className="round-input">
      <header className="round-header">
        <div>
          <p className="round-label">ROUND</p>
          <h2>{round.roundNo}</h2>
        </div>

        <div className="round-score">
          <strong>{stats.score}</strong>
          <span>/ 25</span>
        </div>
      </header>

      <div className="start-stand">
        <span className="start-stand-label">開始射台</span>

        <div className="start-stand-buttons">
          {standNumbers.map((standNo) => (
            <button
              className={
                round.startStandNo === standNo
                  ? "start-stand-button selected"
                  : "start-stand-button"
              }
              key={standNo}
              onClick={() => updateStartStand(standNo)}
              type="button"
            >
              {standNo}
            </button>
          ))}
        </div>
      </div>

      <div className="round-summary">
        <span>初矢 {stats.firstShotHits}</span>
        <span>二の矢 {stats.secondShotHits}</span>
        <span>失中 {stats.misses}</span>
        <span>実包 {stats.cartridgesUsed}</span>
      </div>

      <div className="shot-list">
        {round.shots.map((shot) => {
          const selectedInput = getShotInput(shot);

          return (
            <article
              className="shot-row"
              key={shot.id}
            >
              <div className="shot-number">
                <strong>{shot.targetNo}</strong>

                <label className="stand-select-label">
                  <span>射台</span>

                  <select
                    aria-label={`${shot.targetNo}枚目の射台`}
                    onChange={(event) =>
                      updateSingleShotStand(
                        shot.id,
                        Number(event.target.value) as StandNo,
                      )
                    }
                    value={shot.standNo}
                  >
                    {standNumbers.map((standNo) => (
                      <option
                        key={standNo}
                        value={standNo}
                      >
                        {standNo}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="shot-buttons">
                {inputButtons.map((button) => (
                  <button
                    aria-label={`${shot.targetNo}枚目 ${button.title}`}
                    className={
                      selectedInput === button.value
                        ? "shot-button selected"
                        : "shot-button"
                    }
                    key={button.value}
                    onClick={() =>
                      updateShot(shot.id, button.value)
                    }
                    title={button.title}
                    type="button"
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
