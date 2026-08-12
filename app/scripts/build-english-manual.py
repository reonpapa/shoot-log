from pathlib import Path
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Image, Table, TableStyle

VERSION = "2.21.0"
OUT = Path(__file__).resolve().parents[1] / "public/manuals/shoot-log-operation-manual-en.pdf"
SCREENSHOTS = Path(__file__).resolve().parents[2] / "docs/manual/screenshots/generated"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("Manual", FONT))
pdfmetrics.registerFont(TTFont("ManualBold", FONT_BOLD))

pages = [
    ("QUICK START", "What to know first", ["Every change is saved immediately on this device.", "While signed in, records sync to the cloud automatically.", "Save a JSON backup regularly as an independent copy."], "04-history"),
    ("INSTALL / LOGIN", "Install and sign in", ["Add Shoot Log to the Home Screen or Dock from Safari, Chrome, or Edge.", "Sign in with your email address and password.", "Never share authentication links or password-reset links."], "02-login"),
    ("ACCOUNT / SYNC", "Account settings and sync", ["Choose Japanese or English under Display language.", "Use Sync now when you need to fetch changes from another device.", "Normal changes are synced automatically."], "03-account"),
    ("SESSIONS", "History and practice focus", ["The history screen is the starting point for all major actions.", "Open a card to continue entry or review a completed session.", "Track the current focus and achievement history over time."], "05-practice-theme"),
    ("NEW SESSION", "Create a session", ["Select date, range, discipline, ammunition, and firearm.", "Weather, temperature, and wind are used for condition analysis.", "Set one concrete practice focus for the day."], "07-new-session"),
    ("ROUND INPUT", "Prepare a round", ["Use the tabs to switch between Rounds 1 to 4.", "Choose the starting stand and single-shot or two-shot mode.", "New rounds begin in two-shot mode."], "08-round-setup"),
    ("SCORING", "Enter each target", ["1 records a first-shot hit; 2 records a second-shot hit.", "1+ records a first-shot hit followed by an unnecessary second shot: one point, two shells.", "Miss direction means the target's flight direction. Entry advances automatically."], "09-current-shot"),
    ("SESSION COMPLETE", "Review the result", ["Review totals, each round, first- and second-shot hits, and miss directions.", "Do not infer an unrecorded cause from the numbers alone."], "10-analysis-summary"),
    ("OPTIONAL AI ANALYSIS", "Analyze with your own AI", ["The export includes scores, conditions, and your written review.", "Dates, range names, firearm identifiers, and personal identity are excluded.", "Review the copied text and send it yourself."], "11-ai-analysis"),
    ("SESSION PACE", "Pace and stand analysis", ["Compare hit rates between the first and second halves.", "Compare hit rate and target-flight miss direction by stand."], "13-stand-analysis"),
    ("REVIEW", "Post-session review", ["Record what you noticed, what did not work, and what to try next.", "Rate the practice focus as Achieved, Partly achieved, or Not achieved."], "14-review"),
    ("HISTORY ANALYSIS", "Condition and ammunition trends", ["Filter by range, ammunition, fire mode, and period.", "Treat small samples as indicative and consider other condition differences."], "06-history-analysis"),
    ("SAVED ITEMS", "Manage saved names", ["Add or rename shooting ranges and ammunition products.", "Renaming updates past history; deleting an option does not erase history."], "15-master-data"),
    ("AMMUNITION LEDGER", "Manage ammunition", ["Record ammunition received, used, and remaining.", "Completed shooting sessions are added automatically after category mapping.", "The printed Kanagawa ledger remains in the official Japanese format."], "16-ammunition-ledger"),
    ("FIREARM PERMIT", "Permit and renewal", ["Always copy dates from the original permit.", "Manage application start, deadline, and expiry for each firearm.", "Name, address, and date of birth are not stored."], "17-firearm-permit"),
    ("BACKUP", "Backup and restore", ["Export all device data to one JSON file.", "Restore merges with current data instead of deleting it.", "Save a fresh backup before major data operations."], "18-backup"),
    ("SUPPORT", "If something goes wrong", ["Check the connection and signed-in account if data is not synced.", "Use the update notice or safe recovery if the screen is outdated.", "Never include passwords or firearm permit numbers in support email."], "19-support"),
    ("VERSION HISTORY", "Major versions", ["2.21.0 - Japanese and English interface, including records, analysis, account, permits, ammunition, backup, support, and legal documents.", "2.20.0 - Added 1+ for a second shot fired after a first-shot hit.", "2.0.0 - Added Supabase accounts and cloud sync.", "1.0.0 - Integrated PWA, PDF output, ammunition, and permit deadlines."], None),
]

title = ParagraphStyle("title", fontName="ManualBold", fontSize=25, leading=31, textColor=HexColor("#242128"), spaceAfter=12*mm)
kicker = ParagraphStyle("kicker", fontName="ManualBold", fontSize=9, leading=12, textColor=HexColor("#6d3bd1"), spaceAfter=3*mm)
body = ParagraphStyle("body", fontName="Manual", fontSize=10.5, leading=16, textColor=HexColor("#342f38"), leftIndent=6*mm, firstLineIndent=-4*mm, spaceAfter=5*mm)
note = ParagraphStyle("note", fontName="Manual", fontSize=7.5, leading=11, textColor=HexColor("#706a74"), spaceBefore=4*mm)
cover_title = ParagraphStyle("cover", fontName="ManualBold", fontSize=34, leading=42, textColor=white, spaceAfter=7*mm)
cover_sub = ParagraphStyle("cover_sub", fontName="Manual", fontSize=17, leading=25, textColor=HexColor("#ddd5e4"))

def decorate(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFillColor(HexColor("#6d3bd1")); canvas.rect(0, A4[1]-3*mm, A4[0], 3*mm, fill=1, stroke=0)
        canvas.setFont("Manual", 8); canvas.setFillColor(HexColor("#777078"))
        canvas.drawString(16*mm, 10*mm, "Shoot Log / Operation Manual")
        canvas.drawRightString(A4[0]-16*mm, 10*mm, f"Version {VERSION}  |  {doc.page-1}")
    canvas.restoreState()

story = []
story.append(Spacer(1, 38*mm))
story.append(Paragraph("SHOOT LOG", cover_title))
story.append(Paragraph(f"Operation Manual<br/>Version {VERSION}", cover_sub))
story.append(Spacer(1, 90*mm))
story.append(Paragraph("Clay shooting records, analysis, ammunition, permits, sync, and backup - explained in one concise guide.", cover_sub))
story.append(PageBreak())
for index, (key, heading, bullets, screenshot) in enumerate(pages):
    story.append(Spacer(1, 13*mm))
    story.append(Paragraph(key, kicker))
    story.append(Paragraph(heading, title))
    copy = [Paragraph(f"• {item}", body) for item in bullets]
    if screenshot:
        path = SCREENSHOTS / f"{screenshot}.png"
        if not path.exists():
            raise FileNotFoundError(f"Screenshot not found: {path}")
        copy.append(Paragraph("The screenshot uses fictional sample data. Interface wording follows the selected display language in the app.", note))
        visual = Image(str(path), width=72*mm, height=156*mm, kind="proportional")
        layout = Table([[copy, visual]], colWidths=[91*mm, 72*mm], hAlign="LEFT", style=TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (0,0), 8*mm), ("LEFTPADDING", (1,0), (1,0), 0), ("BOX", (1,0), (1,0), .5, HexColor("#d5d1d7"))]))
        story.append(layout)
    else:
        for item in copy:
            story.append(KeepTogether([item]))
    if index != len(pages)-1:
        story.append(PageBreak())

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=13*mm, bottomMargin=17*mm, title=f"Shoot Log Operation Manual {VERSION}", author="downhill62")
doc.build(story, onFirstPage=lambda c, d: (c.setFillColor(HexColor("#17131b")), c.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)), onLaterPages=decorate)
print(OUT)
