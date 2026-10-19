# KetoCompanion (demo)

A patient-facing companion for adults with psychiatric conditions who have been **prescribed a ketogenic diet as metabolic therapy** by their care team. It helps with day-to-day adherence: food logging against care-team targets, ketone and glucose tracking (with GKI), simple meal ideas, a supportive adherence view, and a printable one-page summary to bring to appointments.

> **Demo: fictional data, not for clinical use.** There is no backend. Everything is stored in the browser's `localStorage` and never leaves the device.

**Live demo:** https://bilalbari.com/ketocompanion-demo/

## Run it

```bash
cd apps/ketocompanion
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Requires Node 18+.

## Publish to bilalbari.com

The website is a Hugo site that Netlify builds from this repository. Hugo copies everything in `static/` to the site unchanged, so the built demo is committed there:

```bash
cd apps/ketocompanion
npm run build:site   # writes ../../static/ketocompanion-demo/
```

Commit the source changes together with `static/ketocompanion-demo/`. After the change reaches `master`, Netlify deploys it to https://bilalbari.com/ketocompanion-demo/. The site build uses the absolute base path `/ketocompanion-demo/`, so it works with or without a trailing slash. If the URL ever changes, update `base` and `outDir` in `vite.config.ts`.

`npm run build:artifact` makes a single self-contained HTML page (`dist-artifact/ketocompanion.html`) for viewing as a claude.ai artifact. That build keeps navigation in memory and hides the print button, because the claude.ai viewer blocks the print dialog.

## Design principles

- **Treatment, not weight loss.** There are no calorie targets, weight fields, "cheat days", or streaks. Calories appear only as reference information. A day over target is answered with "That's okay. Your next meal is a fresh start."
- **Low cognitive load.** One primary action per screen, tap targets of at least 48 px, a 17 px base font, plain language, and no more than two steps to log anything.
- **Accessible.** WCAG AA text contrast, status shown by icon plus words (never color alone), labelled controls, a skip link, and a visible focus ring.
- **Guardrails.** No medication or dosing advice anywhere ("talk with your care team"). The electrolyte reminder names no amounts. BHB above the configurable threshold (default 5.0 mmol/L) shows a calm, clear "please contact your care team today" message, plus when to seek urgent care.
- **The care team sets the targets.** All targets, ranges and the threshold are editable in Settings, with a note to change them only with care-team guidance.

## File structure

```
apps/ketocompanion/
├── index.html
├── vite.config.ts · tailwind.config.js · postcss.config.js · tsconfig.json
└── src/
    ├── main.tsx, App.tsx          entry + screen switch
    ├── index.css                  Tailwind layers, focus + print styles
    ├── types.ts                   ← data model (below)
    ├── data/
    │   ├── foods.ts               109 keto-friendly foods, per-serving macros
    │   ├── recipes.ts             32 recipes; macros computed from foods.ts
    │   └── seed.ts                fictional patient "Alex" + default settings
    ├── lib/
    │   ├── dates.ts               local-date helpers (no UTC off-by-one)
    │   ├── macros.ts              totals, remaining, % energy from fat
    │   ├── ketones.ts             status classification, GKI, unit conversion
    │   ├── adherence.ts           per-day goals, period summaries, supportive copy
    │   ├── recommend.ts           "Fits your day" ranking
    │   ├── storage.ts             localStorage load/save
    │   └── router.ts              tiny hash router (static-hosting friendly)
    ├── state/AppState.tsx         React context store, persisted on every change
    ├── components/                ui primitives, MacroBar, Charts (Recharts),
    │                              Heatmap, KetoneStatus, RecipeCard, Layout, Toast
    └── screens/                   Today, LogMeal, LogKetone, Ketones, Recipes,
                                   RecipeDetail, Progress, Summary, Settings
```

## Data model

All state is one `AppState` object (`src/types.ts`) under the localStorage key `ketocompanion:v1`.

| Entity | Key fields | Notes |
|---|---|---|
| `Settings` | `targets {netCarbsMax, fat, protein}`, `ketoneMethod`, `glucoseUnit`, `ranges {blood, breath, urineMin}`, `bhbContactThreshold`, `showHydrationReminder`, `startDate` | Defaults: ≤30 g net carbs, 135 g fat, 90 g protein (about 74% of energy from fat), BHB 1.0–3.0 mmol/L, contact threshold > 5.0 |
| `MealLog` | `date`, `time`, `slot`, `items: LoggedItem[]` | Each item copies its per-serving macros at log time, so history never shifts if the database changes |
| `KetoneReading` | `method` (`blood` / `breath` / `urine`), `bhb`, `glucoseMgDl`, `breathPpm`, `urine` | Glucose is stored in mg/dL and shown in the preferred unit |
| `Note` | `date`, `text` | Included in the care-team summary |
| `CustomMeal` | `name`, `items [{foodId, servings}]` | "My meals" |
| `favorites` | food ids | |

**Key calculations**

- **GKI** = glucose (mmol/L) ÷ BHB (mmol/L), where mg/dL ÷ 18 = mmol/L (`lib/ketones.ts → computeGKI`).
- **Ketone status**: below / in / above the target range, or *contact* when BHB is above the threshold. Urine is "in range" at or above the configured minimum strip level.
- **Daily adherence** (`lib/adherence.ts`): net carbs within target (only on days with meals logged), ketones in range (based on the **last reading of the day**), and meals logged. Period stats count **complete days only**: today is still in progress, and days before the plan start are excluded.
- **Fits your day** (`lib/recommend.ts`): a recipe fits when its net carbs are within what's left of today's limit and its protein doesn't run far past today's remaining target. Fitting recipes are ranked toward lower carb use, filling remaining fat, budget-friendly, quick and no-cook, and the requested meal type.

## Seeded story: "Alex", about 3 weeks in

The seed is anchored to today's date, so the demo always looks current. The higher-carb days always land on a weekend.

| Plan days | What happens |
|---|---|
| 1–5 | Induction: BHB 0.2 → 1.2 mmol/L, glucose easing from 97 to 85 mg/dL, carbs slightly over target while learning |
| 6–14 | Stable in range (1.4–2.3 mmol/L, GKI about 2–3) |
| 15–16 (Sat–Sun) | Family birthday: pasta, garlic bread, cake, then pancakes. Net carbs about 95 g on Saturday and 55 g on Sunday; BHB dips to 0.5–0.6 mmol/L |
| 17–18 | Recovery: 0.9 → 1.3 mmol/L, back in range |
| 19 → today (plan day 20–26, depending on the weekday) | Steady in range. Today has breakfast plus a morning reading (1.8 mmol/L, 81 mg/dL, GKI 2.5) |

It also includes a day with no reading, a busy day with only breakfast logged, a few readings without glucose, occasional evening re-checks, two saved meals, favorites, and six short notes (including a question for the care team).

**Settings → Reset demo data** restores all of this at any time.

---

## 3-minute demo walkthrough (clinician audience)

*Setup: open https://bilalbari.com/ketocompanion-demo/ on a phone, or in a browser at phone width (Chrome DevTools device mode), and choose **Settings → Reset demo data** just before presenting. Times are approximate.*

**0:00 – Framing (15 s)**
> "This is KetoCompanion, a patient-facing tool for people whose care team has prescribed a ketogenic diet as metabolic therapy, for example in bipolar disorder or treatment-resistant depression. It's built around adherence, not weight loss. You won't find a scale, a calorie target or a streak anywhere. Everything you see is fictional and stays on the device."

Point out the **"Demo: fictional data"** banner.

**0:15 – Today screen (30 s)**
> "This is Alex, about three weeks in. The home screen answers three questions at a glance: How is my food today? Where are my ketones? What should I eat next?"

- Net carbs, fat and protein against **care-team targets**. Net carbs are framed as a limit ("27 g left today"); fat and protein as goals.
- **Latest ketone reading** with a plain-language status, glucose and GKI.
- The **hydration and electrolyte reminder**: gentle, dismissible, and it names no amounts.
- The footer line: *no medication or dosing advice*.

**0:45 – Log a meal (35 s)**
Tap **Log a meal**.
> "Large targets, search or recents, and favorites. Executive function can be limited, so logging is tap, tap, review."

- Search **"salmon"** and tap it. Search **"asparagus"** and tap it. Tap **Butter** (a food can also be starred as a favorite).
- Tap **Review**: the **"How this meal fits your day"** bars show the impact *before* confirming (dark bar: eaten, light bar: this meal). Mention **Save this combination** for one-tap re-logging under *My meals*.
- Tap **Log dinner**. You return to Today with the bars updated.

**1:20 – Blood ketone + glucose with GKI (35 s)**
Tap **Log ketones**.
> "Patients can use blood, breath or urine, and switch any time. Target ranges are set by the care team."

- Enter BHB **1.6** and glucose **84 mg/dL**. The **GKI** calculates live: *84 ÷ 18 = 4.7 mmol/L ÷ 1.6 = 2.9*.
- Save. You see the "In your target range" status and the GKI.
- *Optional, 10 s:* log another reading of **5.4**. A calm amber card says **"Please contact your care team today"**, with when to seek urgent care. The threshold is configurable.
- Tap **See my trend**: a 7/14/30-day chart with the **target band shaded**. You can see the weekend dip and the recovery. The GKI chart is below it.

**1:55 – A meal recommendation (25 s)**
Tap **Meal ideas** in the bottom bar.
> "Recommendations use what's *left* of today's targets. The ones that fit come first, ranked toward cheap, quick and no-cook, because budget and energy are real constraints."

- Show the **Left for today** banner, the **Fits your day** badges, and filters (*Budget-friendly*, *Under 15 min*, *No-cook*, *Vegetarian*, *Dairy-free*).
- Open a recipe, e.g. **Cauliflower fried rice with egg**: simple ingredients, numbered steps, and the same before/after impact bars. **I ate this** logs it in one tap.

**2:20 – Adherence dashboard (25 s)**
Tap **Progress**.
> "This is supportive by design. No streaks to break."

- Toggle **Past week / Past 30 days**. Read one summary aloud, e.g. *"You were in your ketone range 5 of 7 days this past week."* (Exact counts depend on the weekday you reset the demo, because the weekend dip may fall inside the past week.)
- The **calendar heatmap** shades each day by goals met (carbs, ketones, logging). Tap the weekend dip to see that day's detail.
- Highlight the **bounce-back message**: *"After a dip that started Sunday, your ketones were back in range within 3 days."*

**2:45 – Care-team summary (15 s)**
Tap **Summary for my care team**.
> "This is what the patient brings to the visit: one page, printable or saved as a PDF."

- Toggle **14 / 30 days**. Point to adherence percentages, average macros and % energy from fat, mean BHB/glucose/GKI, the readings above the threshold, the two trend charts, the week-by-week table, and the **patient notes**, including the patient's question for the team.
- Tap **Print or save PDF** to show it fits on one Letter page.

**3:00 – Close**
> "Targets, ranges and the contact threshold are all set by the care team in Settings. Data never leaves the device, and there's a one-tap reset for demos."

---

### Not in scope for this demo

Clinician-facing accounts, data sync, EHR integration, reminders/notifications, and validated nutrition data. The food values are rounded reference figures for demonstration only.
