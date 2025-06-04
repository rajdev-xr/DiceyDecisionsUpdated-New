# 🎲 DiceyDecisions

> **Make group decisions fun, fair, and fast!**

DiceyDecisions is a gamified, real-time decision-making app for friend groups, roommates, and teams. Create a room, invite friends, submit options, vote anonymously, and let fate decide with dice, spinner, or coin tiebreakers — all with playful animations and a beautiful UI.

---

🚀 Live Demo

[🚀 Live Demo](https://dicey-decisions-updated-new.vercel.app/)

## 🚀 Features

- ✨ **Create Decision Rooms** with custom themes & emojis
- 🔗 **Invite friends** via room code or shareable link
- 📝 **Submit & edit options** (until voting starts)
- 🗳️ **Anonymous voting** (randomized order, one vote per user)
- 🎲 **Tiebreakers**: Dice, Spinner, or Coin Flip with real animations & sound
- 🏆 **Achievements & Badges** for milestones
- 📊 **Live Rooms Dashboard** with progress bars
- 🕑 **Past Decisions** with full history & tiebreaker info
- 🌙 **Dark Mode** & responsive, accessible design
- 🎉 **Confetti & sound effects** for every win

---

## Implementation Notes

### Real-time Experience

- Real-time effect is achieved by polling the backend every 3 seconds (no sockets required).

### Bonus: 30-Minute Inactivity Auto-Close

> Rooms should automatically close after 30 minutes of inactivity (**bonus logic**)

- **Current Implementation:**  
  If any participant has the room open in their browser, a 30-minute inactivity timer runs locally. If no activity is detected for 30 minutes, voting is ended automatically for that session.
- **Limitation:**  
  If **no one** has the room open (e.g., all participants close their browsers), the inactivity timer cannot run.  
- **Why?**  
  This is a limitation of browser-based timers. For a production system, a backend cron job or scheduled serverless function would be required to enforce true inactivity-based closure for all rooms.

---
### Additional Features

Achievements/Badges System (not required): Track and display user achievements for room creation, decisions, tiebreakers, themes, etc.
Dark Mode: Dark mode with a toggle button.
Archiving/Unarchiving Past Decisions: Allow users to archive past decisions and view them later.
Past Decisions with Full History & Tiebreaker Info: Display past decisions with full details, including tiebreaker results.
Live Rooms Dashboard with Progress Bars: Display pro.gress bars for each room
Confetti and sound effects for winning and achievement unlocks


## 🛠️ Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query
- **Animations:** canvas-confetti, SVG, sound

---

## 🧩 How It Works

1. **Sign Up & Log In** (email auth)
2. **Create or Join a Room** (room code or link)
3. **Submit Options** (everyone can add ideas)
4. **Start Voting** (creator opens voting, options randomized)
5. **Vote Anonymously** (one vote per user)
6. **Reveal Results** (see winner, or break ties with dice/spinner/coin)
7. **Celebrate!** (confetti, sound, and badges)
8. **View Past Decisions** (full history, tiebreaker info, participants)

---

## ⚡ Setup & Development

```bash
# 1. Clone the repo
$ git clone https://github.com/rajdev-xr/DiceyDecisionsUpdated-New.git
$ cd DiceyDecisionsUpdated-New-main

# 2. Install dependencies
$ npm install
$ npm install canvas-confetti

# 3. Configure environment
# Create a .env file with your Supabase keys:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Set up Supabase
# - Create a project
# - Run migrations in supabase/migrations/
# - Enable Email Auth

# 5. Start the app

$ npm run dev
```

---

## 🗄️ Database Schema (Summary)

- **rooms**: id, title, code, creator_id, is_open, resolved_at, tiebreaker_method, etc.
- **options**: id, room_id, text, submitted_by
- **participants**: id, room_id, user_id
- **votes**: id, room_id, option_id, voted_by
- **Enums**: tiebreaker_method ('dice', 'spinner', 'coin')

---

## 🤝 Contributing

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to your branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 🌐 Deployed App

> [Paste your deployed link here!]

---

## 📄 License

MIT License.
🚀 Built by ROHAN RAJ
