# Building

The game's code is recompiled at build time from your own dump of Mario Kart 64 (US, big-endian `.z64`). The program,
native or the page, then takes the same dump from its launcher's Load ROM.

## 1. Clone with the submodules

```bash
git clone --recurse-submodules https://github.com/amazingalek/MarioKart64Recomp-web
```

`lib/` holds RT64, N64ModernRuntime (with N64Recomp) and RecompFrontend from their upstream repositories, at the
commits [N64Recomp-browser](https://github.com/amazingalek/N64Recomp-browser)'s web forks are built on
(MarioKart64Recomp itself predates RecompFrontend, so its own pins are older); N64Recomp-browser, whose `patches/`
puts the web support into their checkouts and whose `frontend/` makes the page; and the Mario Kart 64 decompilation
(`lib/mk64`, whose headers the patches use). `MarioKart64RecompSyms` holds the symbols N64Recomp reads.

## 2. Tools

- CMake 3.20+, Ninja, clang for the program (clang-cl on Windows), SDL2 and GTK 3 on Linux
  (`sudo apt-get install cmake ninja-build libsdl2-dev libgtk-3-dev lld llvm clang`).
- A clang with a MIPS target and `ld.lld`, plus `make`, for the patches (`patches/`). Linux's clang has one. On Windows
  llvm.org's clang has none: MSYS2's clang64 does, with llvm.org's `ld.lld`.
- For the page: emsdk (`emsdk install latest`) and [naga](https://github.com/gfx-rs/wgpu/tree/trunk/naga)
  (`cargo install naga-cli`).

## 3. The recompiled code

Copy your dump to the repository's root as `mk64.us.z64`, then:

```bash
# N64Recomp-browser's patches in lib/rt64, lib/N64ModernRuntime and lib/RecompFrontend
cmake -P lib/N64Recomp-browser/patches/apply.cmake lib

# N64Recomp and RSPRecomp, from the patched N64Recomp in lib/
cmake -S lib/N64ModernRuntime/N64Recomp -B build-n64recomp -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-n64recomp --target N64RecompCLI RSPRecomp
cp build-n64recomp/N64Recomp build-n64recomp/RSPRecomp .                  # .exe on Windows

./N64Recomp us.toml            # RecompiledFuncs/
./RSPRecomp aspMain.us.toml    # rsp/aspMain.cpp
```

The native program needs the patches as much as the page does: the code the patched N64Recomp writes uses the patched
`recomp.h` (`RECOMP_TAIL_CALL`). The web support in them is behind `__EMSCRIPTEN__` and changes nothing natively.
Configuring the program (step 4, or the page) applies them too if they aren't in yet, and does nothing if they are;
`git apply --reverse lib/N64Recomp-browser/patches/<name>.patch` in a checkout takes one out.

The build compiles and recompiles the patches itself (`make` in `patches/`, then `./N64Recomp patches.toml`).

## 4. Native

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
    -DPATCHES_C_COMPILER=<clang with a MIPS target> -DPATCHES_LD=<ld.lld>    # clang-cl for the program on Windows
cmake --build build --target MarioKart64Recompiled
```

Run it from the repository's root (it reads `assets/`). A `portable.txt` there keeps settings, saves and the stored
ROM beside it.

## The web page

```bash
embuilder build sdl2-mt freetype-legacysjlj      # once
emcmake cmake -S . -B build-web -G Ninja -DCMAKE_BUILD_TYPE=Release -DRT64_NAGA_EXECUTABLE=<naga> \
    -DPATCHES_C_COMPILER=<clang with a MIPS target> -DPATCHES_LD=<ld.lld>
cmake --build build-web --target MarioKart64Recompiled
```

Keep `build-web` inside the checkout and put [ccache](https://ccache.dev) on `PATH`: N64Recomp-browser's
`frontend/build_speed.cmake` puts it in front of every compile, and a second fresh build dir then compiles almost
nothing. emsdk's clang has no MIPS target, so the patches are compiled with the host's clang (`PATCHES_C_COMPILER`).

`build-web/MarioKart64Recompiled.html` must be served with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` (threads need SharedArrayBuffer), or with `coi_serviceworker.js` beside
it where headers can't be set. Open it in a browser with WebGPU and pick your dump with Load ROM: it is kept in the
browser's storage, with settings and saves.

### The shader list

The page specializes the shaders in `src/rt64_shaders.txt` at build time (`RT64_PREBUILT_SHADER_LIST`), so that it
never draws with RT64's slow general shader. The list is recorded by `tools/record_shaders.sh <build-web> <rom>`, which
plays `tools/shader_plan.json` with N64Recomp-browser's `tools/record_shaders.mjs`: the page opened with
`?record-shaders` prints every shader the game asks for, and the plan reaches each part of the game by code
(`tools/shader_survey.js`, which starts any course in any mode the way the pause menu's Retry does and hands the karts
to the game's own driving). Its header says what was played and what wasn't.

## What was played

The page from GitHub Pages (main 9f6bcf3, N64Recomp-browser 28a5f14), cold, on an RTX 2070, an idle host, 2026-10-15,
Chrome 155 headless and Firefox 158, by N64Recomp-browser's `tools/play_page.mjs` with `tools/play_plan.json`: the
launcher, Load ROM, the logos and the title, the menus to a 50cc Grand Prix, then 40 s of Luigi Raceway on the kart AI.

```
                  shader waits                      presents a second   sound short   WebGPU errors
1256x645
  Chrome          none                              59.6 (53-60)        0             0
  Firefox         0.4 s for the boot's 8 before     59.2 (31-60)        0             0
                  the first frame, 1.6 s for Luigi
                  Raceway's 35, ~0.3 s in ones and
                  twos through the menus
3840x2000
  Chrome          none                              59.6 (53-60)        0             0
  Firefox         0.5 s, 1.6 s, as above            59.0 (28-60)        1,041, in the   0
                                                                        course's wait
```

The game draws 30 frames a second in a race, which RT64 interpolates to the display's rate. The build before it was
published, served locally, played the same (Chrome 59.6, Firefox 59.4 after waits of 0.4 and 1.5 s). Chrome builds the
whole list behind the game, so it never waits; Firefox builds none during play, and waits for a section when the game
gets there. A shot of the race in each browser shows Luigi Raceway's jumbotron drawing the race.

Also played in headless Chrome 155 on local builds: every course and arena (recording the shader list), Versus with two,
three and four players (59.1-59.4 presents a second with four), a four-player battle in Big Donut, Time Trials, the
results, the award ceremony and the credits, with no WebGPU errors.

**The boot.** Upstream's patches write every frame's display list to a larger pool of their own (`gfxPoolExtended`)
and point its task there, but the boot's first list was written to the game's own pool, so the first task pointed RT64
at an empty one, which it read on into the pool where the game was already writing the next frame. About one boot in
twenty on the page hung (an empty display list) or crashed (a microcode load read from garbage). `patches/gfx_config.c`
patches `rendering_init` to write it where the task points: 80 boots in a row in headless Chrome after it, none failed.

**Render to RAM** stays on, with the exact copy: the jumbotron at Luigi Raceway and Wario Stadium is the last frame,
which the CPU copies out of RDRAM (`copy_framebuffer`). The late copy (`set_render_to_ram_late`, which waits less for
the GPU on some games) measured the same here: a race 59.6 presents a second either way, four players 59.1 exact and
58.8 late (headless Chrome 155, a busy host, the game's 30 frames a second), so the page keeps the exact one.

**The shader list**, `src/rt64_shaders.txt`: 813 descriptions, 136 shaders and 112 pipelines in 27 sections (the boot 8,
the menus 8, each course, the arenas, Versus, Time Trials, the results, the ceremony, the credits).
