# SuperApp — Personal Management Platform

SuperApp is a comprehensive, all-in-one personal management solution designed to enhance productivity and organize daily life. Built with **Next.js 14**, it combines task management, habit tracking, financial monitoring, and gamification elements into a single, cohesive interface.

## 🚀 Overview

The platform is designed with a "focus-first" philosophy, featuring a dark-mode UI with glassmorphism effects. It operates entirely client-side for privacy (using LocalStorage) but offers optional Cloud Sync for data backup.

## ✨ Key Features

### Productivity
- **Dashboard**: Unified view of daily progress, XP levels, and quick stats.
- **Task Manager**: Kanban-style or list-view task management with priority levels.
- **Habit Tracker**: Track daily streaks and build consistency with visual progress bars.
- **Pomodoro Timer**: Customizable timer with focus/break modes, persistent counting, and screen wake lock.
- **Goal Setting**: Long-term goal tracking with milestone breakdowns.

### Life Management
- **Finance Tracker**: Record income/expenses, visualize spending with charts, and export reports to CSV.
- **Journal & Notes**: Rich-text editor for daily reflections and note-taking.
- **Reading List**: Track books, reading progress, and ratings.
- **Health & Fitness**: Monitor water intake, sleep schedules, and workout logs.

### System & Customization
- **Gamification**: Earn XP for completing tasks and habits to level up your avatar.
- **Cloud Sync**: Optional JSON-based cloud backup and restore functionality.
- **Custom Branding**: Personalize the app name, tagline, and icon via the Settings menu.
- **PWA Ready**: Optimized for installation on mobile and desktop devices.

## 🛠 Type Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **UI Styling**: Vanilla CSS with CSS Variables (Design System)
- **State Management**: React Hooks & Context API
- **Persistence**: Browser LocalStorage & File System API
- **Icons**: Text-based Emojis & SVG

## 📦 Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/superapp.git
   cd superapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```bash
superapp/
├── app/                  # Next.js App Router pages
│   ├── finance/          # Finance Tracker feature
│   ├── pomodoro/         # Pomodoro Timer feature
│   ├── reading/          # Reading List feature
│   └── ...               # Other feature routes
├── components/           # Reusable UI components
│   ├── AppShell.js       # Main layout wrapper
│   ├── Sidebar.js        # Navigation sidebar
│   └── ...
├── lib/                  # Utilities and Logic
│   ├── auth.js           # User profile management
│   ├── storage.js        # LocalStorage wrapper
│   ├── helpers.js        # Formatting & utility functions
│   └── gamification.js   # XP & Leveling logic
└── public/               # Static assets
```

## 🎨 Customization

You can customize the application identity directly from the **Settings** page:
- **App Name**: Change the title displayed in the sidebar and browser tab.
- **App Icon**: Select an emoji to serve as the application logo and favicon.
- **User Profile**: Update your display name and avatar.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
