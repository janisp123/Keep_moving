# =============================
# SECTION 1 (README.md): Title
# =============================
# Keep Moving — Minimal Build

A small browser-only game about momentum and choices.  
No backend, no tracking. Just HTML + CSS + JavaScript.

> **Note:** This game was made completely with ChatGPT-5.

---

# =================================
# SECTION 2 (README.md): Concept
# =================================
You are placed between **Death** (left) and the **King** (right).  

- Life naturally drifts you left.  
- You can nudge yourself right.  
- “Problems” spawn and push you back until you clear them.  

The middle is forgiving, but nearing the King is difficult.  
If you die, the game shows your age and whether you reached the King, then asks:  
**“What would you do if you had another try at life?”**

There is no restart button. (Reload the page to start over.)

---

# ====================================
# SECTION 3 (README.md): How to Play
# ====================================
**Start:** Enter your **name** and **age**, then press **Start Game**.  

**Controls:**
- Move right: **D / → / Space**
- Move left: **A / ←**
- Clear problems: Tap **right** repeatedly when stuck.

---

# ==================================================
# SECTION 4 (README.md): Difficulty (current tuning)
# ==================================================
- The middle area stabilizes you — relatively easy to hover there.  
- As you approach the **King**, resistance and hazards increase.  
- Problems slow you down, but their drag has been toned down to keep play fair.

---

# ===========================================
# SECTION 5 (README.md): How to Run (Local)
# ===========================================
No install, no server needed.

1. Put these files in one folder:
   - `index.html`
   - `style.css`
   - `main.js`
   - `patches/registry.js`
   - `diagnostics.js`
2. Double-click **index.html** to open it in your browser.

Tip: Chrome, Edge, and Firefox work out of the box. Safari may need a local server.

---

# ==================================================
# SECTION 6 (README.md): How to Publish (GitHub Pages)
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
# SECTION 7 (README.md): Files in this Build
# ===========================================
- `index.html` — structure and UI.  
- `style.css` — visuals.  
- `main.js` — game loop, drift, problems, collisions.  
- `patches/registry.js` — patch registry (simple versioning).  
- `diagnostics.js` — placeholder for future diagnostics.

---

# ============================================
# SECTION 8 (README.md): Privacy & Safety
# ============================================
- No external network calls, analytics, or trackers.  
- No tokens, no sensitive data.  
- Safe to host and share publicly.

---

# ======================================
# SECTION 9 (README.md): License
# ======================================
If you plan to share or accept contributions, consider adding a license file (MIT is common).  
Without one, default copyright applies — people can play, but reuse is unclear.
