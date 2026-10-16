# Counterpoint

An original local strategy game for macOS: change a shared routing machine and bring three lights to three bells on the same beat.

## Play

Open `/Applications/Counterpoint.app`. You play Amber against Blue by default. Click a 3D junction to preview all six paths, then click **Flip & advance**. Select **A friend · pass & play** for a local two-player match.

- Drag the board to orbit; scroll to zoom. Perspective and Overhead buttons reset the camera.
- Undo restores your preceding turn, including the computer reply in solo mode.
- Hint previews a move; you still choose whether to commit it.
- Sound and Motion can be turned off. System reduced-motion preference is respected initially.
- Tab reaches switch controls; Enter selects, and Enter on the main action advances. Escape clears an idle preview. V changes view. Command-Z undoes.
- The current position and preferences save locally between launches. Undo history is session-only.

The **How to play** window contains the complete rules. All pieces and geometry are generated locally; play does not require the internet or an account.

## Rules

Twelve binary junctions form a 4-column by 3-row directed loop network. Inputs are north and west, outputs south and east. A straight switch maps N→S and W→E; turned maps N→E and W→S. Boundary exits wrap to the opposite side of the same row or column.

On each turn flip one junction unless its incoming lights belong only to the opponent. Then advance all six lights simultaneously. Check both colors after every beat. Occupying all three matching bell spaces wins; simultaneous completion or three repetitions of the complete position with the same player to move draws. Bells never stop lights.

Opening: Amber occupies the north inputs of column 2, Blue those of column 4. Amber bells are west inputs of column 1, Blue bells west inputs of column 3. All switches are straight.

## Development

Node.js and npm required:

```sh
npm install
npm start
npm run check
npm test
npm run package
```

The package command produces and ad-hoc signs `dist/Counterpoint-darwin-arm64/Counterpoint.app`. This local build is for Apple silicon. It is not notarized for public distribution.

The renderer uses Three.js with original procedural metalwork, glass lights, 3D return tracks, shadows and bloom. Electron binds a static server to a random loopback port, isolates and sandboxes the renderer, denies external navigation and permissions, and exposes only a narrow local-save bridge. The computer searches in a Web Worker; its strength and the long-term game balance are not formally established.

An explicit `COUNTERPOINT_DEBUG_PORT` enables local diagnostics. `COUNTERPOINT_TEST_PROFILE` can point at an absolute isolated data folder for QA. Normal launches use the standard Mac application-data folder.

Third-party licenses remain bundled with Electron and Three.js. Official implementation references: [Three.js documentation](https://threejs.org/docs/) and [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
