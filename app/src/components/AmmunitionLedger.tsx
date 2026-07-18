import { useMemo, useState, type FormEvent } from "react";
import { entryTypeLabels, type AmmunitionFamily, type AmmunitionLedgerData, type LedgerEntryType } from "../domain/ammunition";
import { buildLedgerRows } from "../services/ammunitionLedger";
import type { StoredSession } from "../services/storage";
import "./AmmunitionLedger.css";

interface Props {
  data: AmmunitionLedgerData;
  sessions: StoredSession[];
  ammunitionNames: string[];
  onChange: (data: AmmunitionLedgerData) => void;
  onBack: () => void;
}

const today = () => new Date().toLocaleDateString("sv-SE");
const currentYear = () => String(new Date().getFullYear());

function categoryTitle(family: AmmunitionFamily): string { return family === "rifle" ? "ライフル実包" : "散弾実包"; }

export function AmmunitionLedger({ data, sessions, ammunitionNames, onChange, onBack }: Props) {
  const [tab, setTab] = useState<"ledger" | "settings">("ledger");
  const [date, setDate] = useState(today());
  const [type, setType] = useState<LedgerEntryType>("acquisition");
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [firearmId, setFirearmId] = useState("");
  const [application, setApplication] = useState("");
  const [printMode, setPrintMode] = useState<"year" | "custom" | "all">("year");
  const [printYear, setPrintYear] = useState(currentYear());
  const [printFrom, setPrintFrom] = useState(`${currentYear()}-01-01`);
  const [printTo, setPrintTo] = useState(`${currentYear()}-12-31`);
  const rows = useMemo(() => buildLedgerRows(data, sessions), [data, sessions]);
  const yearOptions = [...new Set([currentYear(), ...rows.map((row) => row.date.slice(0, 4))])].sort((a, b) => b.localeCompare(a));
  const printStart = printMode === "year" ? `${printYear}-01-01` : printMode === "custom" ? printFrom : "";
  const printEnd = printMode === "year" ? `${printYear}-12-31` : printMode === "custom" ? printTo : "";
  const printableRows = rows.filter((row) => (!printStart || row.date >= printStart) && (!printEnd || row.date <= printEnd));
  const carriedRow = printStart ? rows.filter((row) => row.date < printStart).at(-1) : undefined;
  const printPeriod = printMode === "all" ? "全期間" : printMode === "year" ? `${printYear}年` : `${printFrom} ～ ${printTo}`;
  const latest = rows.at(-1);
  const trackedSessions = sessions.filter((item) => item.status === "completed" && (!data.trackingStartDate || item.session.date >= data.trackingStartDate));
  const unmapped = [...new Set(trackedSessions.filter((item) => !data.productLinks.some((link) => link.ammunitionName === item.session.ammunitionName)).map((item) => item.session.ammunitionName))];
  const noFirearm = trackedSessions.filter((item) => !item.session.firearmId || !data.firearms.some((firearm) => firearm.id === item.session.firearmId)).length;

  function addEntry(event: FormEvent) {
    event.preventDefault();
    const amount = Math.floor(Number(quantity));
    if (!categoryId || !Number.isFinite(amount) || amount <= 0 || !application.trim()) return;
    onChange({ ...data, entries: [...data.entries, { id: crypto.randomUUID(), date, type, categoryId, quantity: amount, ...(firearmId ? { firearmId } : {}), application: application.trim(), createdAt: new Date().toISOString() }] });
    setQuantity(""); setApplication("");
  }
  function deleteEntry(id: string) {
    if (window.confirm("この手入力行を削除しますか？\n残弾数も再計算されます。")) onChange({ ...data, entries: data.entries.filter((item) => item.id !== id) });
  }

  return <section className="ammo-ledger">
    <header className="ammo-ledger-header"><div><p className="eyebrow">AMMUNITION LEDGER</p><h2>実包管理帳簿</h2><p>神奈川県様式に合わせて、受・払・残を記録します。</p></div><div><button onClick={onBack}>履歴へ戻る</button><button className="primary-button" onClick={() => window.print()}>帳簿を印刷 / PDF保存</button></div></header>
    <div className="ammo-summary"><article><span>残弾合計</span><strong className={(latest?.totalAfter ?? 0) < 0 ? "negative" : ""}>{latest?.totalAfter ?? 0}<small> 発</small></strong></article>{data.categories.map((category) => <article key={category.id}><span>{category.name}</span><strong className={(latest?.balanceAfter[category.id] ?? 0) < 0 ? "negative" : ""}>{latest?.balanceAfter[category.id] ?? 0}<small> 発</small></strong></article>)}</div>
    <section className="print-range"><strong>PDF出力範囲</strong><label><input checked={printMode === "year"} name="print-mode" type="radio" onChange={() => setPrintMode("year")} />年指定</label><select disabled={printMode !== "year"} value={printYear} onChange={(event) => setPrintYear(event.target.value)}>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select><label><input checked={printMode === "custom"} name="print-mode" type="radio" onChange={() => setPrintMode("custom")} />期間指定</label><input disabled={printMode !== "custom"} type="date" value={printFrom} onChange={(event) => setPrintFrom(event.target.value)} /><span>～</span><input disabled={printMode !== "custom"} type="date" value={printTo} onChange={(event) => setPrintTo(event.target.value)} /><label><input checked={printMode === "all"} name="print-mode" type="radio" onChange={() => setPrintMode("all")} />全期間</label><small>{printableRows.length}件を出力</small></section>
    {(unmapped.length > 0 || noFirearm > 0) && <aside className="ammo-warning"><strong>台帳へ反映するための設定があります</strong>{unmapped.length > 0 && <span>未分類の実包：{unmapped.join("、")}</span>}{noFirearm > 0 && <span>使用銃未設定の完了セッション：{noFirearm}件</span>}<button onClick={() => setTab("settings")}>基本設定を開く</button></aside>}
    <nav className="ammo-tabs"><button className={tab === "ledger" ? "selected" : ""} onClick={() => setTab("ledger")}>入出庫・台帳</button><button className={tab === "settings" ? "selected" : ""} onClick={() => setTab("settings")}>銃・実包区分の設定</button></nav>
    {tab === "ledger" ? <>
      <form className="ammo-entry-form" onSubmit={addEntry}>
        <label><span>日付</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label><span>内容</span><select value={type} onChange={(event) => setType(event.target.value as LedgerEntryType)}>{Object.entries(entryTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>実包区分</span><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">選択</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>数量</span><input required min="1" inputMode="numeric" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label><span>使用銃（必要時）</span><select value={firearmId} onChange={(event) => setFirearmId(event.target.value)}><option value="">未指定</option>{data.firearms.map((item) => <option key={item.id} value={item.id}>{item.name}・{item.identifier}</option>)}</select></label>
        <label className="application"><span>適用</span><input required placeholder="例：〇〇銃砲店・許可譲受" value={application} onChange={(event) => setApplication(event.target.value)} /></label>
        <button className="primary-button" disabled={data.categories.length === 0} type="submit">台帳へ追加</button>
      </form>
      <LedgerTable data={data} rows={rows} onDelete={deleteEntry} />
    </> : <LedgerSettings data={data} ammunitionNames={ammunitionNames} onChange={onChange} />}
    <PrintLedger carryDate={printStart} carryBalances={carriedRow?.balanceAfter} data={data} period={printPeriod} rows={printableRows} />
  </section>;
}

function LedgerSettings({ data, ammunitionNames, onChange }: { data: AmmunitionLedgerData; ammunitionNames: string[]; onChange: Props["onChange"] }) {
  const [categoryName, setCategoryName] = useState("");
  const [family, setFamily] = useState<AmmunitionFamily>("shot-shell");
  const [firearmName, setFirearmName] = useState("");
  const [identifier, setIdentifier] = useState("");
  function addCategory(event: FormEvent) { event.preventDefault(); const name = categoryName.trim(); if (!name) return; onChange({ ...data, categories: [...data.categories, { id: crypto.randomUUID(), name, family }] }); setCategoryName(""); }
  function addFirearm(event: FormEvent) { event.preventDefault(); const name = firearmName.trim(); const number = identifier.trim(); if (!name || !number) return; onChange({ ...data, firearms: [...data.firearms, { id: crypto.randomUUID(), name, identifier: number }] }); setFirearmName(""); setIdentifier(""); }
  function linkProduct(ammunitionName: string, categoryId: string) { onChange({ ...data, productLinks: [...data.productLinks.filter((item) => item.ammunitionName !== ammunitionName), ...(categoryId ? [{ ammunitionName, categoryId }] : [])] }); }
  function deleteCategory(id: string) { if (data.entries.some((item) => item.categoryId === id)) { window.alert("台帳行がある実包区分は削除できません。"); return; } if (window.confirm("この実包区分を削除しますか？")) onChange({ ...data, categories: data.categories.filter((item) => item.id !== id), productLinks: data.productLinks.filter((item) => item.categoryId !== id) }); }
  function deleteFirearm(id: string) { if (window.confirm("この銃を選択肢から削除しますか？\n過去のセッションは変更されません。")) onChange({ ...data, firearms: data.firearms.filter((item) => item.id !== id) }); }
  return <div className="ammo-settings">
    <section className="tracking-start"><header><h3>台帳開始日</h3><span>開始日前の射撃履歴は自動転記しません</span></header><input type="date" value={data.trackingStartDate} onChange={(event) => onChange({ ...data, trackingStartDate: event.target.value })} /><p>この日付の開始残弾を「入出庫・台帳」から登録してください。</p></section>
    <section><header><h3>帳簿の実包区分</h3><span>例：12番・散</span></header><form onSubmit={addCategory}><select value={family} onChange={(event) => setFamily(event.target.value as AmmunitionFamily)}><option value="shot-shell">散弾実包</option><option value="rifle">ライフル実包</option></select><input required placeholder="12番・散" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><button>＋ 登録</button></form><ul>{data.categories.map((item) => <li key={item.id}><span><small>{categoryTitle(item.family)}</small><strong>{item.name}</strong></span><button onClick={() => deleteCategory(item.id)}>削除</button></li>)}</ul></section>
    <section><header><h3>使用銃</h3><span>銃を特定できる名称と番号</span></header><form onSubmit={addFirearm}><input required placeholder="例：FIOCCHI OVER/UNDER" value={firearmName} onChange={(event) => setFirearmName(event.target.value)} /><input required placeholder="銃番号等" value={identifier} onChange={(event) => setIdentifier(event.target.value)} /><button>＋ 登録</button></form><ul>{data.firearms.map((item) => <li key={item.id}><span><strong>{item.name}</strong><small>{item.identifier}</small></span><button onClick={() => deleteFirearm(item.id)}>削除</button></li>)}</ul></section>
    <section className="product-links"><header><h3>商品名と帳簿区分の対応</h3><span>射撃セッションを自動転記します</span></header>{ammunitionNames.length === 0 ? <p>実包の商品名がまだ登録されていません。</p> : <ul>{ammunitionNames.map((name) => <li key={name}><strong>{name}</strong><select value={data.productLinks.find((item) => item.ammunitionName === name)?.categoryId ?? ""} onChange={(event) => linkProduct(name, event.target.value)}><option value="">未分類</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></li>)}</ul>}</section>
  </div>;
}

type Rows = ReturnType<typeof buildLedgerRows>;
function LedgerTable({ data, rows, onDelete }: { data: AmmunitionLedgerData; rows: Rows; onDelete: (id: string) => void }) {
  const firearms = new Map(data.firearms.map((item) => [item.id, item]));
  const categories = new Map(data.categories.map((item) => [item.id, item]));
  return <div className="ledger-table-wrap"><table className="ledger-table"><thead><tr><th>年月日</th><th>使用銃</th><th>適用</th><th>実包区分</th><th>受</th><th>払</th><th>残</th><th>合計</th><th /></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={9}>台帳記録がありません。</td></tr> : [...rows].reverse().map((row) => { const firearm = row.firearmId ? firearms.get(row.firearmId) : undefined; return <tr key={row.id}><td>{row.date}</td><td>{firearm ? <>{firearm.name}<small>{firearm.identifier}</small></> : "—"}</td><td>{row.application}{row.source === "session" && <small>射撃履歴から自動反映</small>}</td><td>{categories.get(row.categoryId)?.name ?? "不明"}</td><td>{row.signedQuantity > 0 ? row.quantity : ""}</td><td>{row.signedQuantity < 0 ? row.quantity : ""}</td><td>{row.balanceAfter[row.categoryId]}</td><td>{row.totalAfter}</td><td>{row.source === "manual" && <button onClick={() => onDelete(row.id)}>削除</button>}</td></tr>; })}</tbody></table></div>;
}

type PrintItem = { kind: "carry"; date: string; balances: Record<string, number> } | { kind: "entry"; row: Rows[number] };

function PrintLedger({ data, rows, carryDate, carryBalances, period }: { data: AmmunitionLedgerData; rows: Rows; carryDate: string; carryBalances?: Record<string, number>; period: string }) {
  const categoryChunks = Array.from({ length: Math.ceil(data.categories.length / 3) }, (_, index) => data.categories.slice(index * 3, index * 3 + 3));
  const firearms = new Map(data.firearms.map((item) => [item.id, item]));
  const items: PrintItem[] = [...(carryDate && carryBalances ? [{ kind: "carry" as const, date: carryDate, balances: carryBalances }] : []), ...rows.map((row) => ({ kind: "entry" as const, row }))];
  const rowPages = Array.from({ length: Math.max(1, Math.ceil(items.length / 12)) }, (_, index) => items.slice(index * 12, index * 12 + 12));
  return <div className="print-ledger">{categoryChunks.flatMap((categories, categoryPage) => rowPages.map((pageItems, rowPage) => <section className="print-page" key={`${categoryPage}-${rowPage}`}><div className="print-title"><h1>実包管理帳簿</h1><span>{period}</span></div><table><thead><tr><th rowSpan={3}>年</th><th rowSpan={3}>月</th><th rowSpan={3}>日</th><th rowSpan={3}>使用銃<br />（銃番号等）</th><th rowSpan={3}>適用</th>{categories.map((item) => <th colSpan={3} key={item.id}>{categoryTitle(item.family)}<br />適合実包（{item.name}）</th>)}<th rowSpan={3}>残弾合計<br />（個）</th></tr><tr>{categories.map((item) => <th colSpan={3} key={item.id}>受　　払　　残</th>)}</tr><tr>{categories.flatMap((item) => [<th key={`${item.id}-in`}>受</th>, <th key={`${item.id}-out`}>払</th>, <th key={`${item.id}-balance`}>残</th>])}</tr></thead><tbody>{pageItems.map((item) => {
    if (item.kind === "carry") {
      const [year, month, day] = item.date.split("-");
      const total = Object.values(item.balances).reduce((sum, value) => sum + value, 0);
      return <tr key="carry"><td>{Number(year)}</td><td>{Number(month)}</td><td>{Number(day)}</td><td /><td>繰越残弾</td>{categories.flatMap((category) => [<td key={`${category.id}-in`} />, <td key={`${category.id}-out`} />, <td key={`${category.id}-balance`}>{item.balances[category.id] || ""}</td>])}<td>{total}</td></tr>;
    }
    const row = item.row;
    const [year, month, day] = row.date.split("-");
    const firearm = row.firearmId ? firearms.get(row.firearmId) : undefined;
    return <tr key={row.id}><td>{Number(year)}</td><td>{Number(month)}</td><td>{Number(day)}</td><td>{firearm ? `${firearm.name} ${firearm.identifier}` : ""}</td><td>{row.application}</td>{categories.flatMap((category) => category.id === row.categoryId ? [<td key={`${category.id}-in`}>{row.signedQuantity > 0 ? row.quantity : ""}</td>, <td key={`${category.id}-out`}>{row.signedQuantity < 0 ? row.quantity : ""}</td>, <td key={`${category.id}-balance`}>{row.balanceAfter[category.id]}</td>] : [<td key={`${category.id}-in`} />, <td key={`${category.id}-out`} />, <td key={`${category.id}-balance`}>{row.balanceAfter[category.id] || ""}</td>])}<td>{row.totalAfter}</td></tr>;
  })}</tbody></table><footer>散弾実包は散弾・単弾の別を記載。サボット弾、スラッグ弾は単弾で記載。</footer></section>))}</div>;
}
