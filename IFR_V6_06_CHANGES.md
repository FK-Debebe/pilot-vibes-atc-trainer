# V6.06 IFR trainer updates

- ATIS Next Action updates after successful playback completion, directing the pilot to Clearance Delivery (or Ground for clearance at airports using Ground).
- Clearance and Ground completion messages direct the pilot to the next facility frequency.
- Takeoff clearance contains runway and runway heading, followed by a separate Departure frequency-change instruction after its readback.
- Tower remains incomplete until the Departure handoff frequency/facility is read back with the callsign. The completed Tower action identifies the actual Departure facility and frequency.
- SoCal alone is accepted as the called facility for SoCal Departure. Missing-item feedback requests only the missing required items.
- 127SP remains a different callsign from 172SP. With 172SP configured, the example passes when stated as: “SoCal, Cessna 172SP, IFR to Palomar, passing 1000 climbing 3000.” A 127SP call now receives a callsign correction rather than an altitude correction when altitude items are present.

Local verification: IFR stage flow checks at Beginner/Intermediate/Advanced levels, full IFR KLGB–KCRQ flight through saved radio exchange, existing VFR/traffic-pattern full-flight checks, Ground ATIS checks, and analytics/recovery checks passed. Live microphone recognition and controller audio were not tested on a physical device.

The CNAME file is included to preserve atc.fwdskillzone.com when publishing. Keep all analytics files alongside index.html.
