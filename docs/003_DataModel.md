# Data Model

## Session
1回の射撃日。

- id
- date
- range
- weather
- ammo
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
