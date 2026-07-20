#!/usr/bin/env python3
"""Generate the Shoot Log operation manual from the current UI specification."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


VERSION = "2.19.7"
ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "app/public/manuals/shoot-log-operation-manual.pdf"
SCORE_INPUT_SCREENSHOT = Path(__file__).resolve().parent / "screenshots/score-input.png"

PAGE_W, PAGE_H = A4
PURPLE = HexColor("#6d3bd1")
PURPLE_DARK = HexColor("#4d239e")
PURPLE_LIGHT = HexColor("#f3edff")
INK = HexColor("#1d1922")
MUTED = HexColor("#716b76")
LINE = HexColor("#ddd8e2")
SURFACE = HexColor("#f7f5f8")
GREEN = HexColor("#3f8a58")
GREEN_LIGHT = HexColor("#edf8f0")
ORANGE = HexColor("#a76819")
ORANGE_LIGHT = HexColor("#fff4e4")
RED = HexColor("#b44444")
RED_LIGHT = HexColor("#fff0f0")

FONT = "NotoSansJP"
FONT_PATH = Path(__file__).resolve().parent / "fonts/NotoSansJP-Regular.ttf"
pdfmetrics.registerFont(TTFont(FONT, str(FONT_PATH)))


def style(size: float, leading: float | None = None, color=INK, align=TA_LEFT) -> ParagraphStyle:
    return ParagraphStyle(
        name=f"s{size}-{leading}-{align}",
        fontName=FONT,
        fontSize=size,
        leading=leading or size * 1.55,
        textColor=color,
        alignment=align,
        wordWrap="CJK",
    )


BODY = style(9.2, 15.0)
SMALL = style(7.5, 11.5, MUTED)
NOTE = style(8.2, 13.0, INK)


def round_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float, radius=8, fill=SURFACE, stroke=LINE, width=0.7):
    c.setLineWidth(width)
    c.setStrokeColor(stroke)
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def text(c: canvas.Canvas, value: str, x: float, y: float, size=9, color=INK, anchor="left"):
    c.setFont(FONT, size)
    c.setFillColor(color)
    if anchor == "center":
        c.drawCentredString(x, y, value)
    elif anchor == "right":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def paragraph(c: canvas.Canvas, value: str, x: float, y_top: float, w: float, pstyle=BODY) -> float:
    p = Paragraph(value, pstyle)
    _, h = p.wrap(w, PAGE_H)
    p.drawOn(c, x, y_top - h)
    return y_top - h


def page_header(c: canvas.Canvas, page_no: int, kicker: str, title_value: str, subtitle: str):
    c.setFillColor(PURPLE)
    c.rect(0, PAGE_H - 6, PAGE_W, 6, stroke=0, fill=1)
    text(c, "SHOOT LOG  /  OPERATION MANUAL", 36, PAGE_H - 32, 6.5, MUTED)
    text(c, f"Version {VERSION}", PAGE_W - 36, PAGE_H - 32, 6.5, MUTED, "right")
    text(c, kicker.upper(), 36, PAGE_H - 68, 7, PURPLE)
    text(c, title_value, 36, PAGE_H - 98, 20, INK)
    paragraph(c, subtitle, 36, PAGE_H - 116, PAGE_W - 72, SMALL)
    c.setStrokeColor(LINE)
    c.line(36, 37, PAGE_W - 36, 37)
    text(c, "https://reonpapa.github.io/shoot-log/", 36, 22, 5.8, MUTED)
    text(c, f"Shoot Log  {page_no}", PAGE_W - 36, 22, 5.8, MUTED, "right")


def bullet_list(c: canvas.Canvas, items: list[str], x: float, y_top: float, w: float, gap=7) -> float:
    y = y_top
    for item in items:
        c.setFillColor(PURPLE)
        c.circle(x + 4, y - 7, 2.2, stroke=0, fill=1)
        y = paragraph(c, item, x + 14, y, w - 14, BODY) - gap
    return y


def note_box(c: canvas.Canvas, title_value: str, body: str, x: float, y: float, w: float, h: float, tone="purple"):
    colors = {
        "purple": (PURPLE_LIGHT, HexColor("#cbb8ef"), PURPLE_DARK),
        "green": (GREEN_LIGHT, HexColor("#b9ddc4"), GREEN),
        "orange": (ORANGE_LIGHT, HexColor("#efd1a7"), ORANGE),
        "red": (RED_LIGHT, HexColor("#ecc2c2"), RED),
    }
    fill, stroke, accent = colors[tone]
    round_rect(c, x, y, w, h, 8, fill, stroke)
    text(c, title_value, x + 12, y + h - 19, 8.5, accent)
    paragraph(c, body, x + 12, y + h - 29, w - 24, NOTE)


SCREEN_KICKERS = {
    "ログイン": "ACCOUNT SETTINGS",
    "アカウント設定": "ACCOUNT SETTINGS",
    "射撃履歴": "SESSIONS",
    "新しいセッション": "NEW SESSION",
    "Round 1": "ROUND INPUT",
    "成績分析": "SESSION COMPLETE",
    "振り返り / AI分析": "REVIEW / OPTIONAL AI ANALYSIS",
    "練習テーマ": "CURRENT FOCUS",
    "登録内容を管理": "MASTER DATA",
    "実包管理": "AMMUNITION LEDGER",
    "所持許可・更新管理": "FIREARM PERMIT",
    "バックアップ": "DATA BACKUP",
    "アプリアップデート": "APP UPDATE",
    "お問い合わせ": "SUPPORT",
}


def phone(c: canvas.Canvas, x: float, y: float, w: float, h: float, title_value: str, draw_content):
    # The screen is reconstructed from the current React component hierarchy and CSS tokens.
    round_rect(c, x, y, w, h, 22, HexColor("#17161a"), HexColor("#17161a"), 1)
    inset = 4
    round_rect(c, x + inset, y + inset, w - 2 * inset, h - 2 * inset, 18, HexColor("#f5f4f2"), HexColor("#f5f4f2"), 0)
    c.setFillColor(HexColor("#17161a"))
    c.roundRect(x + w * 0.37, y + h - 10, w * 0.26, 4, 2, stroke=0, fill=1)
    sx, sy, sw, sh = x + 12, y + 16, w - 24, h - 31

    # Actual app header: eyebrow, purple target icon, app name and version.
    text(c, "CLAY SHOOTING ANALYSIS", sx, sy + sh - 13, 4.2, MUTED)
    c.setFillColor(PURPLE)
    c.circle(sx + 7, sy + sh - 31, 7, stroke=0, fill=1)
    c.setFillColor(HexColor("#b99cff"))
    c.circle(sx + 7, sy + sh - 31, 4.4, stroke=0, fill=1)
    c.setFillColor(white)
    c.circle(sx + 7, sy + sh - 31, 1.4, stroke=0, fill=1)
    text(c, "Shoot Log", sx + 18, sy + sh - 35, 12.5, INK)
    text(c, f"Version {VERSION}", sx + sw, sy + sh - 34, 4.7, MUTED, "right")

    content_top = sy + sh - 57
    text(c, SCREEN_KICKERS.get(title_value, "SHOOT LOG"), sx, content_top, 4.6, PURPLE)
    text(c, title_value, sx, content_top - 17, 10.7, INK)
    c.setStrokeColor(LINE)
    c.line(sx, content_top - 25, sx + sw, content_top - 25)
    draw_content(c, sx, sy, sw, content_top - sy - 32)
    text(c, "現行UIを基にした再現図（架空データ）", x + w / 2, y - 11, 5.2, MUTED, "center")


def mini_button(c, label, x, y, w, h=19, primary=False, danger=False):
    fill = PURPLE if primary else RED_LIGHT if danger else white
    stroke = PURPLE if primary else HexColor("#e3baba") if danger else LINE
    color = white if primary else RED if danger else INK
    round_rect(c, x, y, w, h, 5, fill, stroke)
    text(c, label, x + w / 2, y + h / 2 - 2.5, 6.1, color, "center")


def mini_card(c, title_value, detail, x, y, w, h=38, tone="plain"):
    fill = {"plain": SURFACE, "purple": PURPLE_LIGHT, "green": GREEN_LIGHT, "orange": ORANGE_LIGHT, "red": RED_LIGHT}[tone]
    stroke = {"plain": LINE, "purple": HexColor("#cbb8ef"), "green": HexColor("#b9ddc4"), "orange": HexColor("#efd1a7"), "red": HexColor("#ecc2c2")}[tone]
    round_rect(c, x, y, w, h, 6, fill, stroke)
    text(c, title_value, x + 7, y + h - 13, 6.5, INK)
    text(c, detail, x + 7, y + 8, 5.3, MUTED)


def mini_field(c, label, value, x, y, w, h=27):
    text(c, label, x, y + h - 7, 5.0, MUTED)
    round_rect(c, x, y, w, h - 9, 4, white, LINE)
    text(c, value, x + 6, y + 5, 5.8, INK)


def draw_history(c, x, y, w, h):
    top = y + h
    gap = 4
    bw = (w - gap) / 2
    mini_button(c, "アカウント設定", x, top - 22, bw)
    mini_button(c, "バックアップ", x + bw + gap, top - 22, bw)
    mini_button(c, "登録内容を管理", x, top - 45, bw)
    mini_button(c, "実包管理", x + bw + gap, top - 45, bw)
    mini_button(c, "＋ 新しいセッション", x, top - 70, w, primary=True)
    mini_card(c, "CURRENT FOCUS  継続中の練習テーマ", "クレーを見てから動く  ・  関連履歴3件", x, top - 121, w, 43, "purple")
    mini_card(c, "2026-07-20  大井射撃場", "TRAP  64/100  ・  4R  ・  完了", x, top - 170, w, 43)
    mini_card(c, "2026-07-13  大井射撃場", "TRAP  58/100  ・  4R  ・  完了", x, top - 219, w, 43)
    mini_card(c, "THEME HISTORY  過去の練習テーマ", "3テーマ  ・  達成率とスコア推移", x, top - 268, w, 43, "green")


def draw_account(c, x, y, w, h):
    top = y + h
    mini_card(c, "CLOUD SYNC    同期済み", "クラウドと同期されています  ・  同期待ち なし", x, top - 51, w, 46, "green")
    mini_button(c, "今すぐ同期", x, top - 76, w, primary=True)
    mini_card(c, "FIREARM PERMIT    更新まで余裕あり", "サンプル上下二連  ・  申請期限 2027-02-28", x, top - 128, w, 46, "orange")
    mini_card(c, "操作マニュアル", f"Version {VERSION}対応  ・  開く / 保存", x, top - 180, w, 46, "purple")
    mini_card(c, "複数端末のデータ同期", "ログイン中  demo@example.com", x, top - 232, w, 46)
    mini_button(c, "ログアウト", x, top - 257, w)
    text(c, "パスワードを変更", x, top - 279, 5.7, PURPLE)


def draw_login(c, x, y, w, h):
    top = y + h
    mini_card(c, "CLOUD SYNC", "複数端末の射撃記録を安全に同期", x, top - 47, w, 41, "purple")
    mini_button(c, "ログイン", x, top - 70, (w - 4) / 2, primary=True)
    mini_button(c, "新規登録", x + (w + 4) / 2, top - 70, (w - 4) / 2)
    mini_field(c, "メールアドレス", "demo@example.com", x, top - 108, w)
    mini_field(c, "パスワード", "●●●●●●●●", x, top - 144, w)
    mini_button(c, "ログイン", x, top - 171, w, primary=True)
    text(c, "パスワードを忘れた場合", x, top - 193, 5.3, PURPLE)
    mini_card(c, "初回のみ", "利用規約とプライバシーポリシーを確認", x, top - 245, w, 41, "green")


def draw_session_form(c, x, y, w, h):
    top = y + h
    mini_field(c, "日付", "2026-07-20", x, top - 31, w)
    mini_field(c, "射撃場", "大井射撃場", x, top - 66, w)
    mini_field(c, "種目", "TRAP", x, top - 101, w)
    mini_field(c, "使用銃", "ミロク Trap AC", x, top - 136, w)
    mini_field(c, "実包", "Sample 7.5", x, top - 171, w)
    mini_card(c, "NEXT PRACTICE  おすすめ", "頬付けを安定させる", x, top - 218, w, 41, "purple")
    mini_field(c, "練習テーマ", "頬付けを安定させる", x, top - 255, w)
    mini_button(c, "セッション開始", x, top - 282, w, primary=True)


def draw_round(c, x, y, w, h):
    top = y + h
    tab_w = (w - 8) / 3
    mini_button(c, "Round 1", x, top - 20, tab_w)
    mini_button(c, "Round 2", x + tab_w + 4, top - 20, tab_w)
    mini_button(c, "Round 3", x + 2 * (tab_w + 4), top - 20, tab_w, primary=True)
    mini_button(c, "＋ Round", x, top - 44, (w - 4) / 2)
    mini_button(c, "Round 3 削除", x + (w + 4) / 2, top - 44, (w - 4) / 2, danger=True)
    mini_button(c, "1発撃ち", x, top - 69, (w - 4) / 2)
    mini_button(c, "2発撃ち", x + (w + 4) / 2, top - 69, (w - 4) / 2, primary=True)
    text(c, "開始射台  1    実包消費  自動計算", x, top - 85, 5.2, MUTED)
    cell = (w - 8) / 5
    for row in range(5):
        for col in range(5):
            value = "○" if (row + col) % 4 else "×"
            fill = PURPLE_LIGHT if value == "○" else RED_LIGHT
            round_rect(c, x + col * (cell + 2), top - 111 - row * 22, cell, 18, 4, fill, LINE)
            text(c, value, x + col * (cell + 2) + cell / 2, top - 105 - row * 22, 7, PURPLE if value == "○" else RED, "center")
    mini_card(c, "現在  18番  /  Stand 4", "スコア 13  ・  失中 5", x, top - 240, w, 40)
    mini_button(c, "命中", x, top - 267, (w - 8) / 3, primary=True)
    mini_button(c, "失中", x + (w - 8) / 3 + 4, top - 267, (w - 8) / 3, danger=True)
    mini_button(c, "取消", x + 2 * ((w - 8) / 3 + 4), top - 267, (w - 8) / 3)


def draw_analysis(c, x, y, w, h):
    top = y + h
    mini_card(c, "今日の練習テーマ", "クレーを見てから動く  ・  一部できた", x, top - 45, w, 40, "purple")
    sw = (w - 8) / 3
    mini_card(c, "総合スコア", "64 / 100", x, top - 91, sw, 41, "purple")
    mini_card(c, "命中率", "64 %", x + sw + 4, top - 91, sw, 41, "green")
    mini_card(c, "消費実包", "136 発", x + 2 * (sw + 4), top - 91, sw, 41)
    bw = (w - 4) / 2
    mini_card(c, "Round 1", "14 / 25  初矢10  二の矢4", x, top - 138, bw, 41)
    mini_card(c, "Round 2", "18 / 25  初矢14  二の矢4", x + bw + 4, top - 138, bw, 41)
    mini_card(c, "Round 3", "15 / 25  初矢11  二の矢4", x, top - 185, bw, 41)
    mini_card(c, "Round 4", "17 / 25  初矢13  二の矢4", x + bw + 4, top - 185, bw, 41)
    mini_card(c, "命中内訳", "初矢 48  ・  二の矢 16", x, top - 232, bw, 41)
    mini_card(c, "失中方向", "← 13    ↑ 10    → 13", x + bw + 4, top - 232, bw, 41)
    mini_button(c, "AI分析用データを作成", x, top - 259, w)


def draw_review_ai(c, x, y, w, h):
    top = y + h
    text(c, "REVIEW  射撃後の振り返り", x, top - 11, 6.3, INK)
    mini_field(c, "今日の気づき", "後半は焦らず、クレーを見てから動けた", x, top - 48, w, 32)
    mini_field(c, "うまくいかなかったこと", "右方向で動き始めが早くなることがあった", x, top - 88, w, 32)
    mini_field(c, "次回試すこと", "呼吸を整え、クレーを確認してから動く", x, top - 128, w, 32)
    mini_button(c, "振り返りを保存", x, top - 155, w, primary=True)
    mini_card(c, "OPTIONAL AI ANALYSIS", "自分のAIで詳しく分析", x, top - 207, w, 45, "purple")
    round_rect(c, x, top - 275, w, 61, 5, SURFACE, LINE)
    text(c, "種目：TRAP  総合：64/100", x + 7, top - 230, 5.1, MUTED)
    text(c, "本人の振り返りを含む分析用データ", x + 7, top - 244, 5.1, MUTED)
    text(c, "日付・射撃場・銃番号・氏名は除外", x + 7, top - 261, 5.1, GREEN)
    mini_button(c, "コピーしてChatGPTを開く", x, top - 302, w, primary=True)


def draw_theme(c, x, y, w, h):
    top = y + h
    mini_card(c, "CURRENT FOCUS", "頬付けを安定させる", x, top - 45, w, 40, "purple")
    mini_card(c, "THEME HISTORY", "過去の練習テーマ  3件", x, top - 91, w, 40)
    themes = [("頬付けを安定", "4回  50%"), ("クレーを最後まで見る", "3回  67%"), ("初矢のリズム", "2回  50%")]
    yy = top - 137
    for title_value, detail in themes:
        mini_card(c, title_value, detail, x, yy, w, 40, "green")
        yy -= 46
    text(c, "できた 3  /  一部 4  /  できなかった 2", x, yy + 14, 5.1, MUTED)


def draw_permit(c, x, y, w, h):
    top = y + h
    mini_button(c, "アカウント設定へ戻る", x, top - 22, w)
    mini_card(c, "許可証共通情報", "氏名・住所・生年月日は保存しません", x, top - 69, w, 40, "green")
    mini_field(c, "許可証番号", "（説明用データ）", x, top - 106, w)
    mini_card(c, "サンプル上下二連  DEMO-001", "更新申請期間まで 84日", x, top - 153, w, 40, "orange")
    mini_field(c, "有効期限", "2027-03-31", x, top - 190, w)
    mini_field(c, "更新申請開始日", "2026-10-01", x, top - 225, w)
    mini_field(c, "更新申請期限", "2027-02-28", x, top - 260, w)
    mini_button(c, "登録内容を保存", x, top - 287, w, primary=True)


def draw_ledger(c, x, y, w, h):
    top = y + h
    mini_card(c, "実包管理帳簿", "受・払・残を自動計算", x, top - 44, w, 39, "purple")
    mini_field(c, "種別", "購入・譲受", x, top - 80, w)
    mini_field(c, "実包 / 数量", "Sample 7.5  /  250", x, top - 115, w)
    mini_button(c, "台帳へ追加", x, top - 143, w, primary=True)
    headers = ["日付", "受", "払", "残"]
    widths = [0.42, 0.18, 0.18, 0.22]
    xx = x
    for label, ratio in zip(headers, widths):
        round_rect(c, xx, top - 170, w * ratio, 20, 0, PURPLE_LIGHT, LINE)
        text(c, label, xx + w * ratio / 2, top - 163, 4.8, INK, "center")
        xx += w * ratio
    rows = [("7/01", "250", "", "250"), ("7/13", "", "32", "218"), ("7/20", "", "100", "118")]
    yy = top - 190
    for row in rows:
        xx = x
        for value, ratio in zip(row, widths):
            round_rect(c, xx, yy, w * ratio, 20, 0, white, LINE)
            text(c, value, xx + w * ratio / 2, yy + 7, 4.8, INK, "center")
            xx += w * ratio
        yy -= 20
    mini_button(c, "帳簿を印刷 / PDF保存", x, top - 276, w)


def draw_backup(c, x, y, w, h):
    top = y + h
    mini_card(c, "BACKUP", "端末内の全データを書き出す", x, top - 48, w, 43, "purple")
    text(c, "12 セッション", x + w / 2, top - 80, 13, INK, "center")
    mini_button(c, "バックアップを保存", x, top - 108, w, primary=True)
    mini_card(c, "RESTORE", "バックアップを既存データへ統合", x, top - 158, w, 43, "green")
    mini_button(c, "ファイルを選択", x, top - 186, w)
    note_box(c, "重要", "クラウド同期とは別に、定期的なJSONバックアップを保存してください。", x, top - 256, w, 58, "orange")


def draw_update(c, x, y, w, h):
    top = y + h
    mini_card(c, "新しいバージョンがあります", "更新すると自動で再読み込みします", x, top - 48, w, 43, "purple")
    mini_button(c, "更新する", x, top - 76, w, primary=True)
    mini_card(c, "オフラインで使用できます", "通信復帰後にクラウド同期", x, top - 124, w, 40, "green")
    note_box(c, "画面が更新されない場合", "アプリを閉じて再度開くか、起動画面の復旧ボタンを使用します。", x, top - 205, w, 68, "orange")
    mini_button(c, "アプリを復旧して再読み込み", x, top - 234, w)


def draw_help(c, x, y, w, h):
    top = y + h
    items = [
        ("同期されない", "オンライン確認 → 今すぐ同期"),
        ("入力が消えた", "同じアカウントか確認"),
        ("PDFが保存できない", "共有画面でファイルに保存"),
        ("画面が古い", "更新通知または復旧を実行"),
    ]
    yy = top - 44
    for title_value, detail in items:
        mini_card(c, title_value, detail, x, yy, w, 39, "plain")
        yy -= 45
    mini_button(c, "問い合わせメールを作成", x, yy - 7, w, primary=True)


def actual_score_screen(c: canvas.Canvas, x: float, y: float, w: float, h: float):
    """Place the user-provided live screen and redraw only the fixed round tabs."""
    image = ImageReader(str(SCORE_INPUT_SCREENSHOT))
    image_w, image_h = image.getSize()
    scale = min(w / image_w, h / image_h)
    draw_w, draw_h = image_w * scale, image_h * scale
    draw_x, draw_y = x + (w - draw_w) / 2, y + (h - draw_h) / 2
    c.drawImage(image, draw_x, draw_y, draw_w, draw_h, preserveAspectRatio=True, mask="auto")

    # The source screenshot shows the reported overflow. Overlay the corrected
    # four equal-width tabs and the second-row delete button at the same scale.
    screen_top = draw_y + draw_h
    c.setFillColor(HexColor("#f5f4f2"))
    c.rect(draw_x, screen_top - 350 * scale, draw_w, 245 * scale, stroke=0, fill=1)
    margin = 30 * scale
    gap = 14 * scale
    tab_w = (draw_w - margin * 2 - gap * 3) / 4
    tab_h = 96 * scale
    tab_y = screen_top - 230 * scale
    for index in range(4):
        selected = index == 0
        round_rect(c, draw_x + margin + index * (tab_w + gap), tab_y, tab_w, tab_h, 6, PURPLE if selected else HexColor("#f5f4f2"), PURPLE if selected else HexColor("#cbc8cc"), 0.8)
        text(c, f"Round {index + 1}", draw_x + margin + index * (tab_w + gap) + tab_w / 2, tab_y + 8.2, 6.1, white if selected else INK, "center")
    delete_y = screen_top - 345 * scale
    round_rect(c, draw_x + margin, delete_y, draw_w - margin * 2, 96 * scale, 6, HexColor("#f5f4f2"), HexColor("#e79a9a"), 0.8)
    text(c, "Round 1 削除", draw_x + draw_w / 2, delete_y + 8.2, 6.1, RED, "center")
    c.setStrokeColor(LINE)
    c.roundRect(draw_x, draw_y, draw_w, draw_h, 10, stroke=1, fill=0)
    text(c, "実画面（説明用の記録）", x + w / 2, y - 11, 5.2, MUTED, "center")


def chapter(c: canvas.Canvas, page_no: int, kicker: str, title_value: str, subtitle: str, bullets: list[str], screen_title: str, drawer, note=None):
    page_header(c, page_no, kicker, title_value, subtitle)
    has_actual_screen = screen_title == "Round 1" and SCORE_INPUT_SCREENSHOT.exists()
    content_width = 245 if has_actual_screen else PAGE_W - 80
    y = bullet_list(c, bullets, 40, PAGE_H - 158, content_width)
    if note:
        note_box(c, note[0], note[1], 40, max(72, y - 100), content_width, 82, note[2] if len(note) > 2 else "purple")
    if has_actual_screen:
        actual_score_screen(c, 310, 93, 250, 555)
    c.showPage()


def build_manual():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle(f"Shoot Log Version {VERSION} 操作マニュアル")
    c.setSubject(f"Shoot Log Version {VERSION} 操作マニュアル")
    c.setAuthor("Shoot Log")

    # 1 Cover
    c.setFillColor(HexColor("#151219"))
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(PURPLE)
    c.circle(PAGE_W - 90, PAGE_H - 86, 82, stroke=0, fill=1)
    c.setFillColor(HexColor("#a880ff"))
    c.circle(PAGE_W - 90, PAGE_H - 86, 54, stroke=0, fill=1)
    c.setFillColor(HexColor("#31243e"))
    c.circle(PAGE_W - 90, PAGE_H - 86, 27, stroke=0, fill=1)
    c.setFillColor(white)
    c.circle(PAGE_W - 90, PAGE_H - 86, 7, stroke=0, fill=1)
    text(c, "CLAY SHOOTING ANALYSIS", 44, PAGE_H - 102, 7, HexColor("#aaa2ae"))
    text(c, "Shoot Log", 44, PAGE_H - 145, 27, white)
    text(c, "スマートフォン・パソコン 操作マニュアル", 44, PAGE_H - 177, 11, HexColor("#d4ced8"))
    round_rect(c, 44, PAGE_H - 222, 110, 25, 12, PURPLE, PURPLE)
    text(c, f"VERSION {VERSION}", 99, PAGE_H - 213, 7, white, "center")
    round_rect(c, 44, 155, PAGE_W - 88, 122, 12, HexColor("#231d29"), HexColor("#3b3243"))
    text(c, "記録から、次の一枚へ。", 62, 242, 15, white)
    paragraph(c, "スコア入力、振り返り、分析、練習テーマ、実包帳簿、所持許可、クラウド同期まで。現在の画面構成を説明用イメージで案内します。", 62, 218, PAGE_W - 124, style(9, 15, HexColor("#d4ced8")))
    text(c, "画面イメージはプログラム仕様を基に作成した説明用の架空データです。", 44, 76, 7, HexColor("#aaa2ae"))
    text(c, "https://reonpapa.github.io/shoot-log/", 44, 46, 6.5, HexColor("#aaa2ae"))
    c.showPage()

    # 2
    page_header(c, 2, "QUICK START", "最初に知っておくこと", "Shoot Logは、入力した記録を端末内へすぐ保存し、ログイン中はクラウドへ同期します。")
    note_box(c, "1  記録", "セッションを作成し、ラウンドごとの命中・失中を入力します。", 40, 575, 160, 78, "purple")
    note_box(c, "2  振り返り", "終了後に気づきや悩み、次回試すことを保存します。", 217, 575, 160, 78, "green")
    note_box(c, "3  分析", "射台・方向・前後半・条件・実包別の傾向を確認します。", 394, 575, 160, 78, "orange")
    text(c, "スマートフォンの主な画面遷移", 40, 535, 13, INK)
    boxes = [("射撃履歴", 40), ("新しいセッション", 171), ("ラウンド入力", 302), ("成績分析", 433)]
    for label, xx in boxes:
        round_rect(c, xx, 443, 112, 48, 8, PURPLE_LIGHT if xx != 40 else PURPLE, HexColor("#cbb8ef"))
        text(c, label, xx + 56, 462, 7, white if xx == 40 else INK, "center")
        if xx != 433:
            text(c, "→", xx + 121, 462, 10, PURPLE, "center")
    note_box(c, "保存の基本", "端末内保存は自動です。クラウド同期とは別に、定期的なJSONバックアップも保存してください。", 40, 280, 514, 102, "purple")
    note_box(c, "安全について", "本アプリの分析やAI回答は参考情報です。射撃場の規則、安全指導、法令上の帳簿・許可証原本を常に優先してください。", 40, 145, 514, 102, "orange")
    c.showPage()

    # 3
    page_header(c, 3, "INSTALL", "ホーム画面へ追加する", "ブラウザーでも利用できますが、ホーム画面へ追加するとアプリのように起動できます。")
    note_box(c, "iPhone / iPad", "Safariで公開ページを開き、共有ボタン →「ホーム画面に追加」→「追加」を選びます。", 40, 535, 240, 112, "purple")
    note_box(c, "Android", "Chromeで公開ページを開き、メニュー →「ホーム画面に追加」または「アプリをインストール」を選びます。", 315, 535, 240, 112, "green")
    note_box(c, "Mac / Windows", "ChromeやEdgeではアドレスバー付近のインストールアイコンを使用できます。Safariなどではブックマークから開いても構いません。", 40, 365, 515, 120, "orange")
    text(c, "インストール後も、データは同じブラウザー領域に保存されます。ブラウザーのサイトデータ削除には注意してください。", 40, 310, 8, MUTED)
    c.setFillColor(PURPLE_LIGHT)
    c.circle(170, 185, 68, stroke=0, fill=1)
    c.setFillColor(PURPLE)
    c.circle(170, 185, 45, stroke=0, fill=1)
    c.setFillColor(INK)
    c.circle(170, 185, 22, stroke=0, fill=1)
    c.setFillColor(white)
    c.circle(170, 185, 6, stroke=0, fill=1)
    note_box(c, "アプリ内の案内", "未インストールの場合は画面上部に案内が表示されます。後から「アカウント設定」のインストールガイドでも確認できます。", 290, 125, 265, 120, "green")
    c.showPage()

    chapter(c, 4, "ACCOUNT", "新規登録・ログイン", "クラウド同期を使用する場合は、メールアドレスとパスワードでアカウントを作成します。", [
        "新規登録時は利用規約・免責事項とプライバシーポリシーを確認します。",
        "同じアカウントでログインすると、パソコンとスマートフォン間で記録を同期できます。",
        "ログインできない場合は「パスワードを忘れた場合」から再設定します。",
    ], "アカウント設定", draw_login, ("パスワード", "8文字以上で設定し、端末やブラウザーのパスワード管理を利用してください。", "orange"))

    chapter(c, 5, "ACCOUNT / SYNC", "アカウント設定と同期", "スマートフォンではクラウド同期と所持許可の確認をアカウント設定へまとめています。", [
        "射撃履歴の「アカウント設定」から開きます。",
        "スマートフォンの「今すぐ同期」は上部のCLOUD SYNCに1つだけ表示されます。",
        "デスクトップでは射撃履歴にも同期状態と所持許可の概要を表示します。",
        "所持許可画面から戻ると、開いた元の画面へ戻ります。",
    ], "アカウント設定", draw_account, ("自動同期", "通常は自動同期されます。「今すぐ同期」は別端末の更新を直ちに確認したいときに使用します。", "green"))

    chapter(c, 6, "HISTORY", "射撃履歴を確認する", "履歴画面のタイトル直下に主要な操作ボタンをまとめています。", [
        "アカウント設定、バックアップ、登録内容を管理、実包管理、新しいセッションを選べます。",
        "継続中の練習テーマと過去のテーマ別成績を確認できます。",
        "履歴カードを押すと、完了済みは分析画面、未完了は入力画面を開きます。",
        "履歴は日付順で表示され、射撃場・銃・実包・コンディションも確認できます。",
    ], "射撃履歴", draw_history, ("スマートフォン表示", "CLOUD SYNCとFIREARM PERMITの常設カードはアカウント設定へ移動しています。", "purple"))

    chapter(c, 7, "SESSION", "新しいセッションを作る", "「＋ 新しいセッション」から射撃前の基本情報と練習テーマを登録します。", [
        "日付、射撃場、種目、使用銃、実包を選択します。",
        "天候、気温、風向、風の強さは分析用のコンディションとして利用されます。",
        "過去の記録がある場合は、次回練習ナビがおすすめテーマを表示します。",
        "練習テーマは提案を採用するか、自由に編集できます。",
    ], "新しいセッション", draw_session_form, ("入力候補", "射撃場と実包はこの画面から新規登録でき、後で「登録内容を管理」から名称変更できます。", "green"))

    chapter(c, 8, "SCORING", "ラウンドを入力する", "射撃方式と開始射台を選び、25枚の結果を順番に入力します。", [
        "1発撃ちと2発撃ちをラウンドごとに切り替えられます。",
        "有効なスコアキーを入力すると自動で右のクレーへ進みます。",
        "Enterは次へ、Shift+Enterは前へ移動します。",
        "失中時は、失中したクレーの飛翔方向を記録します。弾の外れ方向ではありません。",
        "実包消費は自動計算され、必要な場合だけ実数へ補正できます。",
    ], "Round 1", draw_round, ("入力中の保存", "操作のたびに端末内へ保存されます。途中で履歴へ戻っても、未完了セッションから再開できます。", "purple"))

    chapter(c, 9, "ANALYSIS", "成績分析を見る", "セッション完了後、総合・ラウンド・射台・失中方向などの成績を表示します。", [
        "総合スコア、命中率、初矢・二の矢、失中数を確認できます。",
        "射台別の命中率と失中したクレーの飛翔方向を比較できます。",
        "前半・後半の平均と命中率変化から、セッション中の推移を確認できます。",
        "基本情報やスコアは後から修正できます。",
    ], "成績分析", draw_analysis, ("読み取り方", "数値は傾向を整理するための記録です。原因を断定せず、フォームや安全面は指導者と確認してください。", "orange"))

    chapter(c, 10, "REVIEW / AI", "振り返りとAI分析", "自分の気づきや不安を保存し、必要に応じて自分が契約している生成AIへ渡せます。", [
        "今日の気づき、うまくいかなかったこと、次回試すことを保存します。",
        "AI分析用データには成績、条件、本人の振り返りを含めます。",
        "日付、射撃場、銃番号、氏名、セッションメモは除外します。",
        "「コピーしてChatGPTを開く」はコピーだけを行い、送信は自分で確認して実行します。",
        "AIには失中方向の意味と、記録されていない原因を断定しないよう伝えます。",
    ], "振り返り / AI分析", draw_review_ai, ("安全優先", "AIの回答は参考情報です。射撃場の規則と安全指導を必ず優先してください。", "red"))

    chapter(c, 11, "PRACTICE THEME", "練習テーマの進捗を見る", "テーマごとの実施回数、達成状況、スコア推移を履歴画面で確認できます。", [
        "セッション終了後に「できた」「一部できた」「できなかった」を記録します。",
        "同じテーマの履歴をまとめて表示し、スコアの変化を確認できます。",
        "次回試すことや未達成テーマは、次回練習ナビの候補になります。",
        "テーマを押すと、関連するセッションだけに履歴を絞り込めます。",
    ], "練習テーマ", draw_theme, ("テーマは1つ", "一度の練習で確認する中心テーマを1つに絞ると、振り返りやすくなります。", "green"))

    # 12 condition and ammo analysis without phone, using data cards
    page_header(c, 12, "COMPARISON", "条件別・実包別の傾向", "蓄積したセッションから、天候・風・気温帯・実包ごとの成績を比較します。")
    sections = [
        ("天候別", "晴れ 64%", "曇り 58%", GREEN_LIGHT),
        ("風の強さ別", "弱い 62%", "強い 51%", ORANGE_LIGHT),
        ("気温帯別", "15-24℃ 63%", "25℃以上 57%", PURPLE_LIGHT),
        ("実包別", "Sample A 65%", "Sample B 59%", SURFACE),
    ]
    yy = 590
    for idx, (title_value, left, right, fill) in enumerate(sections):
        x = 40 if idx % 2 == 0 else 305
        if idx % 2 == 0 and idx > 0:
            yy -= 175
        round_rect(c, x, yy, 250, 135, 10, fill, LINE)
        text(c, title_value, x + 15, yy + 108, 11, INK)
        mini_card(c, left, "説明用集計", x + 15, yy + 48, 102, 45)
        mini_card(c, right, "説明用集計", x + 133, yy + 48, 102, 45)
    note_box(c, "比較の注意", "セッション数が少ない条件は偶然の影響を受けます。条件だけで原因を決めず、複数回の記録を参考にしてください。", 40, 160, 515, 90, "orange")
    c.showPage()

    # 13 master data
    page_header(c, 13, "MASTER DATA", "登録内容を管理する", "射撃場名と実包名の追加・名称変更・削除を行います。")
    note_box(c, "射撃場", "新しい射撃場を登録し、誤字があれば名称修正できます。名称変更は過去の履歴にも反映されます。", 40, 535, 240, 110, "purple")
    note_box(c, "実包", "使用する実包名を登録します。実包管理帳簿の分類とは別の、射撃記録用の名称です。", 315, 535, 240, 110, "green")
    for x, title_value, values in [(40, "射撃場  3件", ["大井射撃場", "県立射撃場", "練習射撃場"]), (315, "実包  3件", ["Sample 7.5", "Sample 9", "Training 7.5"])]:
        round_rect(c, x, 245, 240, 240, 10, SURFACE, LINE)
        text(c, title_value, x + 15, 457, 11, INK)
        mini_button(c, "＋ 新規登録", x + 15, 420, 210, primary=True)
        yy = 370
        for value in values:
            mini_card(c, value, "名称修正  /  削除", x + 15, yy, 210, 40)
            yy -= 50
    note_box(c, "削除について", "名称を削除しても、過去のセッション記録自体は残ります。", 40, 130, 515, 75, "orange")
    c.showPage()

    chapter(c, 14, "AMMUNITION", "実包管理帳簿", "受入・消費・譲渡・廃棄・補正を記録し、実包ごとの残数を自動計算します。", [
        "購入・譲受や手動消費を台帳へ追加できます。",
        "完了した射撃セッションの実包消費は自動で反映されます。",
        "セッションを修正・削除すると、自動消費行も再計算されます。",
        "帳簿はA4固定ページで印刷またはPDF保存できます。",
        "法令上必要な原本や所定様式の扱いは、管轄の指示を優先してください。",
    ], "実包管理帳簿", draw_ledger, ("残数確認", "開始残弾とすべての受払記録から残数を計算します。実際の保管数と定期的に照合してください。", "orange"))

    chapter(c, 15, "FIREARM PERMIT", "所持許可・更新管理", "許可証共通情報と銃ごとの更新日程を登録し、更新申請期間を確認します。", [
        "スマートフォンではアカウント設定のFIREARM PERMITから開きます。",
        "許可証番号、原交付日、交付日と、銃ごとの許可情報を保存できます。",
        "6か月前、3か月前、申請期間、期限超過など警戒段階が変わったときに通知します。",
        "警戒段階が変化すると、スマートフォン画面上部に確認ボタンを表示します。",
        "氏名、住所、生年月日は保存しません。",
    ], "所持許可・更新管理", draw_permit, ("必ず原本を確認", "この機能は確認補助です。許可証の記載と管轄の案内を最優先にしてください。", "red"))

    chapter(c, 16, "BACKUP", "JSONバックアップと復元", "端末内の全データをJSONファイルとして保存し、別端末や復旧時に読み込めます。", [
        "バックアップにはセッション、登録内容、実包帳簿、所持許可情報が含まれます。",
        "読み込みは既存データを残したまま統合します。",
        "クラウド同期とは独立しているため、定期的にファイルを保存してください。",
        "バックアップファイルには個人の記録が含まれるため、安全な場所で管理します。",
    ], "バックアップ", draw_backup, ("推奨", "大きな更新の前や、端末変更の前には必ず最新バックアップを保存してください。", "green"))

    chapter(c, 17, "MAINTENANCE", "アプリ更新と画面の復旧", "新しいバージョンが公開されると、アプリ上部に更新案内が表示されます。", [
        "「更新する」を押すと、新しいファイルを取得して再読み込みします。",
        "オフライン利用の準備が完了すると案内を表示します。",
        "画面が古い、真っ白、読み込みが終わらない場合は復旧機能を使用します。",
        "復旧はアプリの一時ファイルを更新します。端末内の射撃記録は削除しません。",
    ], "アプリの状態", draw_update, ("更新前", "念のためJSONバックアップを保存してから更新すると安心です。", "orange"))

    chapter(c, 18, "SUPPORT", "困ったときの確認表", "解決しない場合は、アカウント設定の「お問い合わせ」から確認用メールを作成できます。", [
        "同期できない場合は通信状態とログイン中のメールアドレスを確認します。",
        "別端末の記録が見えない場合は、両方の端末で「今すぐ同期」を実行します。",
        "マニュアルPDFはiPhone・iPadでは共有画面から「ファイルに保存」を選びます。",
        "問い合わせにはアプリのVersion、端末、OS、ブラウザー、操作手順を記載します。",
        "パスワード、認証リンク、許可証番号、本人確認書類は送信しないでください。",
    ], "お問い合わせ", draw_help, ("最優先", "射撃・実包・所持許可に関する判断は、法令、許可証原本、射撃場の規則、安全指導を優先してください。", "red"))

    c.save()


if __name__ == "__main__":
    build_manual()
    print(OUTPUT)
