import { useState } from "react";

export interface SessionDraft {
  date: string;
  rangeName: string;
  discipline: "trap" | "skeet" | "sporting";
  ammunitionName: string;
  weather: string;
  memo: string;
}

interface SessionFormProps {
  onStart: (session: SessionDraft) => void;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SessionForm({ onStart }: SessionFormProps) {
  const [form, setForm] = useState<SessionDraft>({
    date: getToday(),
    rangeName: "",
    discipline: "trap",
    ammunitionName: "",
    weather: "",
    memo: "",
  });

  function update<K extends keyof SessionDraft>(
    key: K,
    value: SessionDraft[K],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!form.rangeName.trim() || !form.ammunitionName.trim()) {
      return;
    }

    onStart({
      ...form,
      rangeName: form.rangeName.trim(),
      ammunitionName: form.ammunitionName.trim(),
      weather: form.weather.trim(),
      memo: form.memo.trim(),
    });
  }

  return (
    <section className="session-form">
      <header className="session-form-header">
        <p className="round-label">NEW SESSION</p>
        <h2>新しい射撃</h2>
      </header>

      <form onSubmit={handleSubmit}>
        <label>
          <span>日付</span>
          <input
            onChange={(event) => update("date", event.target.value)}
            required
            type="date"
            value={form.date}
          />
        </label>

        <label>
          <span>射撃場</span>
          <input
            onChange={(event) =>
              update("rangeName", event.target.value)
            }
            placeholder="例：大井射撃場"
            required
            type="text"
            value={form.rangeName}
          />
        </label>

        <label>
          <span>種目</span>
          <select
            onChange={(event) =>
              update(
                "discipline",
                event.target.value as SessionDraft["discipline"],
              )
            }
            value={form.discipline}
          >
            <option value="trap">Trap</option>
            <option value="skeet">Skeet</option>
            <option value="sporting">Sporting</option>
          </select>
        </label>

        <label>
          <span>実包</span>
          <input
            onChange={(event) =>
              update("ammunitionName", event.target.value)
            }
            placeholder="例：Fiocchi TT TWO"
            required
            type="text"
            value={form.ammunitionName}
          />
        </label>

        <label>
          <span>天候</span>
          <input
            onChange={(event) => update("weather", event.target.value)}
            placeholder="任意"
            type="text"
            value={form.weather}
          />
        </label>

        <label>
          <span>メモ</span>
          <textarea
            onChange={(event) => update("memo", event.target.value)}
            placeholder="任意"
            rows={3}
            value={form.memo}
          />
        </label>

        <button className="session-start-button" type="submit">
          セッション開始
        </button>
      </form>
    </section>
  );
}