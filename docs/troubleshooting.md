---
title: Troubleshooting
---

# Troubleshooting

## The Desktop Starts But Data Looks Mocked

Possible causes:

- the app is running in mock mode
- the live host adapter is not configured
- the environment is not bound

Check:

- host posture in the footer
- binding posture in the footer
- environment identity visible in Browser or Operate

## A Page Looks Stale After A Refactor

Possible causes:

- Electron renderer hot reload did not repaint cleanly
- a previous dev session is still running

What to do:

1. stop the current Electron process
2. restart with `npm run dev`
3. re-open the relevant workspace

## A Workspace Looks Like A Dashboard Instead Of A Working Surface

That is usually a layout regression.

The intended pattern is:

- main table or primary execution surface first
- selected detail or result directly below
- secondary context after that

## Browser Data Is Empty

Possible causes:

- no live environment is bound
- mock data is active
- the live adapter is not yet wired to the needed service path

## Listener Or Inspector Does Not Behave Correctly

Check:

- current package
- active transport mode
- whether the host bridge is live
- whether the symbol/package inputs are populated correctly

## Approval, Work, Or Recovery Looks Empty

Possible causes:

- the current environment simply has no active governed records
- mock state does not include the scenario you expect
- the live service host is not supplying the relevant domain yet

## Theme Looks Partly Wrong

Possible causes:

- theme changed but renderer did not fully refresh
- some components still carry outdated color rules

Try:

1. toggle between Light, Dark, and System
2. restart the desktop if needed
