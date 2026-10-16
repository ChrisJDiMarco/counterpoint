# Counterpoint build receipt

Delivered 2026-09-05 (America/New_York).

- Installed app: `/Applications/Counterpoint.app`
- Source: `/Users/chrisdimarco/Projects/counterpoint`
- Packaged copy: `dist/Counterpoint-darwin-arm64/Counterpoint.app`
- Architecture: Apple silicon / arm64
- App archive SHA-256: `edde66147c7e977af64f4ef93642d4860b5d75a3d638aebed1b87cd04c4db935`
- Signature: ad-hoc; `codesign --verify --deep --strict` passed on installed app. Local use, not notarized public distribution.

## Verified this run

- Syntax checks for all JS entry points passed.
- Fourteen engine/AI tests passed, including simultaneous movement, protected and contested junctions, wrapping, immutability, both victory cases, threefold repetition, saved-state validation, random play invariants, AI legality and forced defense, and a complete legal opening-to-win route.
- Static-server checks passed for serving, CSP, method restrictions, host validation, traversal, and symlink restrictions.
- Independent code/security and JavaScript UI reviews completed; the Escape-during-animation finding was fixed and re-reviewed.
- Native computer match: canvas click selected A2, preview enabled commitment, all lights advanced, AI replied, state returned to Amber on beat 2. Undo restored beat 0.
- Native isolated local match played actual switches [1,3,2,10,6,0]. The app's read-only live snapshot reported Amber winner at beat 6 on Blue's move. This result was state-verified; the later captured test window had already returned to a new local game.
- Native real pointer drag and wheel zoom changed the QA camera from [9.5,14.3,13.7] to [0.776,10.326,8.325]. Native orbit pixels inspected in `orbit-qa.png`.
- Final installed app launched without a debug port and resumed the owner's saved game at beat 8. Default installed pixels inspected in `installed-final.png`.
- A real pointer drag changed the installed app's orientation; inspected `installed-orbit.png`. Overhead preset activated through the native control.
- Reduced-motion mode exercised in the isolated local match.

## Materials and scope

All board, switch, track, glass-light, and icon artwork is original procedural geometry or drawing. No external model or runtime internet service is required. Electron and Three.js licenses are bundled with dependencies. The computer opponent is a bounded search opponent with three settings; game balance and master-level playing strength remain unproven.
