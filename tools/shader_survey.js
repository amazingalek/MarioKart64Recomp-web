// Evaluated in the page by N64Recomp-browser's tools/record_shaders.mjs (tools/shader_plan.json) and play_page.mjs
// (tools/play_plan.json), with n64r and n64w, RDRAM words at N64 addresses. Offers the game's own ways to a course,
// read and written in RDRAM (the US ROM's addresses, from the mk64 decompilation):
//
//   race({ mode, players, screen, cc, cup, course, id, mirror })  from a race, starts another the way the pause menu's
//       Retry does (gGotoMode RACING through the quit transition, func_802903B0), after setting what the menus would:
//       the mode (0 Grand Prix, 1 Time Trials, 2 Versus, 3 Battle), the players and screen mode (1 one, 1 two above
//       each other, 2 two side by side, 3 three or four), the class (3 Extra), mirror mode (gIsMirrorMode, on with
//       Extra in the menus), and the course: a cup and its course for a Grand Prix (setup_race picks it from
//       gCupCourseOrder), a course id otherwise. Resolves once the course is loaded.
//   autopilot()  hands the human players to the game's kart AI, as the attract demo has player one (PLAYER_KART_AI),
//       so a race drives itself and the camera follows a kart round the course.
//   ending(state)  from a race, goes to the award ceremony (5) or the credits (9) through the same quit transition.
//   lastLap()  puts every kart on its last lap (gLapCountByPlayerId), so a race reaches its finish and results soon.
//   untilMenu(menu, ms), untilRacing(ms)  resolve once the menus show that one (8 the logos, 10 the title) or a race
//       has started, or after ms.
//   state()  the game state, menu, mode and course, for the console.
(() => {
  const word = (a) => n64r(a & ~3) >>> 0;
  const rb = (a) => (word(a) >>> (24 - 8 * (a & 3))) & 0xff;
  const rh = (a) => (word(a) >>> (16 - 8 * (a & 2))) & 0xffff;
  const wb = (a, v) => {
    const s = 24 - 8 * (a & 3);
    n64w(a & ~3, ((word(a) & ~(0xff << s)) | ((v & 0xff) << s)) >>> 0);
  };
  const wh = (a, v) => {
    const s = 16 - 8 * (a & 2);
    n64w(a & ~3, ((word(a) & ~(0xffff << s)) | ((v & 0xffff) << s)) >>> 0);
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (test, ms) => {
    const end = Date.now() + ms;
    while (!test() && Date.now() < end) await sleep(50);
    return test();
  };

  const gGamestate = 0x800DC50C, gGamestateNext = 0x800DC524, gScreenModeSelection = 0x800DC530;
  const gModeSelection = 0x800DC53C, gCCSelection = 0x800DC548, gCurrentCourseId = 0x800DC5A0;
  const gCurrentlyLoadedCourseId = 0x800DC5A4, gIsInQuitToMenuTransition = 0x800DC5C0;
  const gQuitToMenuTransitionCounter = 0x800DC5C4, gIsMirrorMode = 0x800DC604, gMenuSelection = 0x800E86A0;
  const gPlayers = 0x800F6990;
  const gGotoMode = 0x80150124, gPlayerCount = 0x8018EDF3, gCupSelection = 0x8018EE09, gCourseIndexInCup = 0x8018EE0B;
  const gLapCountByPlayerId = 0x80164390;
  const playerSize = 0xDD8, RACING = 4, PLAYER_HUMAN = 0x4000, PLAYER_KART_AI = 0x1000;
  const cupCourses = [[8, 9, 6, 11], [10, 5, 1, 0], [14, 12, 7, 2], [18, 4, 3, 13], [19, 15, 17, 16]];

  window.state = () => `state ${word(gGamestate)} menu ${word(gMenuSelection)} mode ${word(gModeSelection)} ` +
    `players ${rb(gPlayerCount)} screen ${word(gScreenModeSelection)} course ${rh(gCurrentCourseId)} ` +
    `loaded ${rh(gCurrentlyLoadedCourseId)} player1 ${rh(gPlayers).toString(16)}`;

  const quitTo = (mode) => {
    n64w(gGotoMode, mode);
    wh(gQuitToMenuTransitionCounter, 5);
    wh(gIsInQuitToMenuTransition, 1);
  };

  window.race = async ({ mode = 0, players = 1, screen = 0, cc = 0, cup = 0, course = 0, id, mirror = 0 } = {}) => {
    if (word(gGamestate) !== RACING) return 'not in a race: ' + state();
    const target = (mode === 0) ? cupCourses[cup][course] : id;
    n64w(gModeSelection, mode);
    wb(gPlayerCount, players);
    n64w(gScreenModeSelection, screen);
    n64w(gCCSelection, cc);
    n64w(gIsMirrorMode, mirror);
    wb(gCupSelection, cup);
    wb(gCourseIndexInCup, course);
    wh(gCurrentCourseId, target);
    quitTo(RACING);
    await until(() => rh(gIsInQuitToMenuTransition) === 1, 2000);
    const ok = await until(() => rh(gIsInQuitToMenuTransition) === 0 && word(gGamestate) === RACING &&
      rh(gCurrentlyLoadedCourseId) === target, 30000);
    return (ok ? 'racing: ' : 'no race: ') + state();
  };

  window.autopilot = () => {
    for (let i = 0; i < 4; i++) {
      const a = gPlayers + i * playerSize;
      const type = rh(a);
      if (type & PLAYER_HUMAN) wh(a, type | PLAYER_KART_AI);
    }
    return state();
  };

  window.ending = async (to) => {
    if (word(gGamestate) !== RACING) return 'not in a race: ' + state();
    quitTo(to);
    const ok = await until(() => word(gGamestate) === to, 30000);
    return (ok ? 'in ' : 'not in ') + to + ': ' + state();
  };

  window.lastLap = () => {
    for (let i = 0; i < 8; i++) n64w(gLapCountByPlayerId + i * 4, 2);
    return state();
  };

  window.untilMenu = (menu, ms) => until(() => word(gGamestate) === 0 && word(gMenuSelection) === menu, ms).then(() => state());
  window.untilRacing = (ms) => until(() => word(gGamestate) === RACING, ms).then(() => state());
  return state();
})()
