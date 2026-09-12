# Data Model

## Session
1回の射撃日。

- id
- date
- range
- weather
- ammo（主に使用した実包。複数使用した場合は ammunitionNames の1件目）
- ammunitionNames（セッションで使用した実包の一覧）
- totalRounds
- totalShots
- sessionMemo
- findings
- problems
- nextChallenge

## Round
1ラウンド。

- id
- sessionId
- roundNo
- ammunitionName（このラウンドで使用した実包。未設定ならセッションの主実包）
- score
- roundMemo

## Shot
クレー1枚ごとの記録。

- id
- roundId
- targetNo
- standNo
- firstShotResult
- secondShotResult
- finalResult
- missDirection
- shotMemo

## Result Values

### ShotResult
- Hit
- Miss
- NotFired

### FinalResult
- HitOnFirst
- HitOnSecond
- Miss
- NoBird
- Skip

### MissDirection
- Left
- Center
- Right
- Unknown

## AmmunitionLedgerEntry
実包管理帳簿の手入力行。

- id
- date
- type（opening / acquisition / consumption / disposal / transfer / adjustment-in / adjustment-out）
- categoryId
- quantity
- totalAmount（購入・譲受時に支払った合計金額。単価は合計÷数量で算出。神奈川県様式の印刷帳簿には出力しない）
- firearmId
- application
- createdAt
