# =============================
# SECTION 1 (README.md): Title
# =============================
# Keep Moving — Life Simulation Game

A browser-only game about momentum, choices, and the inevitability of time.  
No backend, no tracking. Just **HTML + CSS + JavaScript**.

> **Note:** This game was made with ChatGPT-5 and guided by Janis Paegle.

---

# =================================
# SECTION 2 (README.md): Concept
# =================================
You are placed between **Death** (left) and the **King** (right).  

Life naturally drifts you left, while pressing forward takes effort.  
Problems appear as obstacles, dragging you backwards until you clear them.  

Zones represent different seasons of life:
- **Danger (red)** — near the bottom, survival is hard, resources are thin.  
- **Effort (yellow)** — below the middle, limited options.  
- **Stable (green)** — the middle ground, balanced and manageable.  
- **Climb (silver)** — above average, challenges ease with stability and wealth.  
- **Throne (gold)** — near the King, power and leverage make life easier.  

The game runs continuously: you drift, age, and face new challenges.  
When you die, it shows your **final age** and whether you reached the King.

---

# =========================================
# SECTION 3 (README.md): Philosophy
# =========================================
This game is designed as a mirror of real life:

- **You cannot control age.** Time moves on regardless.  
- **Difficulty shifts with age.** Youth is forgiving; old age less so.  
- **Effort matters.** Consistency determines survival and progress.  
- **Prime years (20–50) are critical.**  
  > *“When you are in your prime it’s the best time to climb the success ladder.  
  If you miss that period or start close to the end of your prime,  
  you need to face a harsh truth — it will not be easy, and you will feel it in the game, it will become harder.  
  So do not waste your time!”*  

Ultimately, everyone dies. The journey and what you do along the way is what changes.

---

# ====================================
# SECTION 4 (README.md): How to Play
# ====================================
**Start:**  
- Enter your **name** and **age**, then press **Start Game**.  

**Controls:**  
- Move right: **D / → / Space**  
- Move left: **A / ←**  
- Clear problems: Tap **right** repeatedly when stuck  

**Gameplay Notes:**  
- The HUD badge changes color depending on your current life zone.  
- Age increases automatically (1 second = 1 year).  
- Dying hides the track and shows your result card.  

---

# ==================================================
# SECTION 5 (README.md): Difficulty (current tuning)
# ==================================================
- Ages 1–10: Life is slow, few problems (grey, small).  
- Ages 20–50: Prime years — best chance to push higher.  
- Older years: Problems are larger, appear more often, and zones get harder.  
- Death occurs when you drift fully left.  

---

# ===========================================
# SECTION 6 (README.md): How to Run (Local)
# ===========================================
No install, no server needed.

1. Place these files in one folder:
   - `index.html`
   - `style.css`
   - `main.js`
   - `patches/registry.js`
   - `diagnostics.js`
2. Double-click **index.html** to open it in your browser.

Tip: Chrome, Edge, and Firefox work best. Safari may need a local server.

---

# ==================================================
# SECTION 7 (README.md): How to Publish (GitHub Pages)
# ==================================================
1. Create a new GitHub repo.  
2. Add the files above to the repo root.  
3. Commit & push.  
4. In the repo, go to **Settings → Pages**:
   - **Source:** “Deploy from a branch”  
   - **Branch:** `main` (root)  
5. Save. After it builds, you’ll get a public URL.  

---

# ===========================================
# SECTION 8 (README.md): Files in this Build
# ===========================================
- `index.html` — structure and UI (disclaimer, game area, overlays).  
- `style.css` — visuals (zones, HUD, highlights, game over).  
- `main.js` — game state, drift, zones, death messaging, controls.  
- `patches/registry.js` — patch registry (simple versioning).  
- `diagnostics.js` — placeholder for project diagnostics.  

---

# ============================================
# SECTION 9 (README.md): Privacy & Safety
# ============================================
- No network calls, analytics, or trackers.  
- No tokens, no sensitive data.  
- Safe to host and share publicly.  

---

# ======================================
# SECTION 10 (README.md): License
# ======================================
If you plan to share or accept contributions, add a license file (MIT is common).  
Without one, default copyright applies — people can play, but reuse is unclear.
