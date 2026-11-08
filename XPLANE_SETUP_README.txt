FK ATC COM Trainer V4.85 — X-Plane Live Bidirectional Interface

REQUIREMENTS
- X-Plane 12.1.4+ recommended; X-Plane 12.4+ preferred.
- A flight must be loaded.
- FK ATC and X-Plane must run on the same computer.
- X-Plane Settings > Network: incoming traffic must not be disabled.
- Assign aircraft/yoke PTT to Contact ATC (Push-to-talk).

WHAT V4.85 ADDS
1. WebSocket telemetry:
   COM1, position, altitude, heading, groundspeed, on-ground state,
   transponder, aircraft identity and PTT stream live from X-Plane.
   REST remains as an automatic fallback.

2. Automatic stage progression:
   Stages advance only after the current radio task is complete AND the
   simulator confirms the physical transition.
   Examples: taxi motion -> Tower; airborne -> Departure; approaching the
   destination -> Arrival; landing -> Ground.
   AUTO STAGE can be switched OFF in the X-Plane panel.

3. Position-aware ATC:
   Destination Tower position reports such as "8 NW" are compared with the
   actual X-Plane aircraft position. A materially wrong report gets
   "verify position" feedback and shows the approximate actual position.

4. Bidirectional writes:
   LOAD TARGET TO COM1 STBY writes the current FK ATC frequency to X-Plane.
   SET ASSIGNED XPDR writes the assigned squawk.
   SWAP COM1 activates the X-Plane COM1 swap command when supported.

5. Command integration:
   Aircraft PTT is monitored with sim/operation/contact_atc_ptt.
   Generic REST command activation support was added for supported commands.

6. Aircraft capability detection:
   FK ATC detects which standard radio/position/PTT capabilities are actually
   available for the currently loaded aircraft and displays a profile score.
   X-Plane's runtime DataRef discovery also sees plugin-created DataRefs.

7. Compatibility profile:
   Aircraft ICAO/description/tail-number DataRefs are discovered when present.
   Missing optional features degrade gracefully rather than breaking the trainer.

8. Simulator-adapter architecture:
   X-Plane-specific transport is separated behind FKSimulatorAdapter so the
   training engine can later support another simulator adapter without rewriting
   the ATC engine.

LIVE DATA LINK
- Preferred: WebSocket
- Automatic fallback: REST polling
- X-Plane API: http://127.0.0.1:8086

SAFETY / TRAINING LOGIC
Automatic stage changes never skip an unfinished communication task. The radio
exchange must first be completed; simulator state then controls the transition.


V4.86 CONTROL IMPROVEMENTS
- CONNECT X-PLANE remains disabled while connected.
- DISCONNECT restores CONNECT.
- SWAP COM1 now verifies the X-Plane swap. If the standard command is ignored,
  FK ATC directly exchanges active and standby COM1 DataRefs and verifies them.
- Added LOAD TARGET SQUAWK. It writes FK ATC's assigned squawk to X-Plane and
  reads the simulator back to confirm acceptance.


V4.87 AUDIO / SPEECH NORMALIZATION
- Restored a shared transcript normalization layer before VFR and IFR evaluation.
- X-Plane aircraft PTT and standalone Tap To Talk now use the same cleanup path.
- Repairs common ASR regressions such as:
    "72 for SP" -> interpreted as "724 SP"
    "Quest flight following" -> "request flight following"
    "bracket field 3500" -> "3500"
- Existing frequency repair such as "1 to 7.2" -> 127.2 remains active.


V4.92 DUAL-MODE REBUILD
- Rebuilt directly from known-good V4.87.
- New UI state is declared before any original trainer initialization.
- Original VFR/IFR navigation and dropdowns are not replaced.
- Home and XP pages are additive only.
- XP Essential Setup airport lists are copied at build time from the known-good V4.87 airport select, so they cannot initialize empty.
- Original X-Plane panel is moved into XP Mode only after original startup completes.
- Full Setup is an on-page expandable advanced setup; it does not send the user into standalone mode.


V4.94 LIVE ATC RADIO PANEL
- Added a cockpit-style COM1 radio panel inside XP LIVE ATC.
- Visible in both XP VFR Training and XP IFR Training.
- Shows actual X-Plane COM1 ACTIVE and STBY frequencies.
- Panel is read-only; radio tuning remains controlled from X-Plane.


V4.95 — THREE PRIORITY IMPROVEMENTS

1. CENTRAL AVIATION SPEECH NORMALIZATION
- Expanded the shared VFR/IFR speech-repair layer.
- Covers recurring callsign, facility, phraseology, runway-side and airport-name
  recognition errors while preserving context-sensitive words such as "to".
- Existing frequency-specific ASR repair remains active.

2. AUTOMATIC COM1 STBY HANDOFF LOADING
- After the current ATC stage is complete, FK ATC determines the next stage.
- If that stage has an assigned frequency, FK ATC loads it once into X-Plane
  COM1 STBY.
- The pilot still performs the actual COM swap in X-Plane.
- FK ATC does not repeatedly overwrite the same standby handoff.

3. LIVE ATC READY / WRONG FREQ / TX
- READY: X-Plane COM1 ACTIVE matches the current ATC stage frequency.
- WRONG FREQ: COM1 ACTIVE does not match the current ATC stage.
- TX: visible only while the aircraft PTT is held.
- NEXT STBY shows the most recently auto-loaded handoff frequency.


V5.00 — ADVANCED X-PLANE TRAINING

Items 4–18 integrated into XP X-Plane Mode:

4. AUTOMATIC SQUAWK
- After ATC has issued the clearance and the trainer is in clearance readback, FK ATC can automatically write the assigned squawk to X-Plane.
- Controlled by the Auto squawk option.

5. IMPROVED AIRCRAFT PTT
- TX status while PTT is held.
- Busy-frequency blocking and accidental short-PTT rejection.
- PTT events are captured in session replay.

6. AVIATION SPEECH NORMALIZATION
- Uses the centralized VFR/IFR ASR correction layer added in V4.95.
- Category scoring and replay use the normalized training path.

7. POSITION-AWARE VALIDATION
- Distance/direction reports can be compared to live X-Plane position.
- Position accuracy contributes to the Position category.

8. RUNWAY AWARENESS
- Uses configured runway, live heading, ground state, groundspeed and airport proximity.
- This is a training heuristic and does not claim exact hold-short-line geometry.

9. AUTOMATIC FLIGHT-PHASE DETECTION
- PARKED, TAXI, TAKEOFF ROLL, DEPARTURE, ENROUTE, ARRIVAL, PATTERN / APPROACH, FINAL, LANDING ROLLOUT, ARRIVAL TAXI / STOPPED.

10. FREQUENCY / FACILITY AREA AWARENESS
- LIVE ATC shows the expected facility from the current ATC stage and detected flight phase.

11. IMPROVED LIVE ATC
- Training Intelligence panel with expected facility, detected phase, runway awareness, aircraft profile, category scores and replay.

12. REALISTIC ATC TIMING
- Optional realistic controller-response delay, enabled by default in XP Mode.

13. OPTIONAL RADIO TRAFFIC
- Optional background-aircraft transmissions. Off by default.

14. FREQUENCY CONGESTION / BLOCKED TRANSMISSION
- Optional congestion mode blocks PTT while ATC/simulated traffic occupies the frequency.

15. CATEGORY SCORING
- Callsign, Facility, ATIS, Request, Position, Runway/Taxi, Frequency, Squawk, Altitude and Route.

16. SESSION REPLAY / REPORT
- Logs connection, phase changes, transmissions, position validation, squawk loading, traffic and blocked PTT events.
- Recent replay and category scores are appended to End-of-Flight Report.

17. AIRCRAFT COMPATIBILITY PROFILES
- C172, C172 G1000, Zibo/737, Cirrus, Piper PA-28, Diamond and Generic X-Plane profiles.
- Dynamic DataRef discovery with standard-dataref fallback.

18. XP DIAGNOSTICS
- Added XP Diagnostics page for Web API, COM1, STBY, XPDR, PTT, position, flight-state, microphone, aircraft profile and WebSocket status.


V5.01 STARTUP / BUTTON RUNTIME FIX
- Fixed V5.00 startup exception: ReferenceError "mode is not defined".
- xpCurrentStageInfo() now restores:
      const mode = xpCurrentTrainerMode();
- The exception previously stopped initialization before Home, Standalone,
  XP mode and Connect-X-Plane controls finished wiring.
- Chromium interaction testing now verifies navigation, airport dropdowns,
  and the Connect button without page-level JavaScript errors.


V5.02 ATIS SPEECH PRONUNCIATION
- On-screen aviation terminology remains "ATIS".
- Whenever FK ATC speaks "ATIS", the TTS layer says "Weather information".
- Applied to both VFR and IFR speech paths.
- Scoring, ATIS logic, stage names, buttons and reports remain unchanged.


V5.03 XP VOICE RECOGNITION
- XP mode uses up to 3 browser speech alternatives and selects the candidate
  with the strongest aviation-language score.
- XP mode uses continuous recognition while aircraft PTT is held.
- PTT release includes a 220 ms recognition grace period.
- VFR now preserves the final interim phrase on PTT release, matching IFR.
- Normal no-speech/aborted events during PTT shutdown no longer discard text.
- LIVE ATC shows MIC HEARD so the pilot can see the current recognized phrase.
- Standalone behavior remains tap-to-talk and does not use XP PTT release timing.


V5.04 MICROPHONE PERMISSION / PTT FIX
- Microphone permission is requested only from Connect X-Plane.
- Aircraft PTT never calls getUserMedia and therefore cannot create an
  "Allow microphone" popup.
- After permission is granted, FK ATC holds one live microphone stream for
  the complete X-Plane connection session.
- Temporary X-Plane polling errors no longer release that microphone stream.
- The microphone is released only when the user explicitly disconnects
  X-Plane or leaves X-Plane mode through the existing disconnect flow.
- The app remembers that microphone was previously approved in localStorage
  for status/recovery logic. Actual permission persistence is controlled by
  the browser's site-permission system.
- For persistent browser permission, use localhost via START_FK_ATC.bat.
  Opening index.html directly with file:// can cause browser permission
  behavior to be less persistent.


V5.05 PTT TEST
- Added a compact PTT TEST section to XP X-Plane Mode.
- Four live checkpoints:
  1. Button detected
  2. Mic active
  3. Voice detected
  4. Transmission sent
- Shows the latest phrase heard by speech recognition.
- START PTT TEST arms the test without changing the active flight setup.
- RESET TEST clears only the diagnostic status.
