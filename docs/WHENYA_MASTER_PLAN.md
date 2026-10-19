# WHENYA
## Master Plan: Rebranding & Superapp Development

**Tagline:** Your Life, In Sync.  
**Project:** Superapp → Whenya  
**Platform:** Web, Android, iOS (Future)  
**Status:** Planning  
**Version:** 1.0  
**Last Updated:** 17 October 2026

---

# 1. Executive Summary

Whenya merupakan evolusi dari platform Superapp menjadi
Personal Life Management Superapp.

Platform ini dirancang untuk membantu pengguna mengelola
aktivitas, tujuan hidup, kebiasaan, keuangan, dan produktivitas
melalui satu ekosistem yang terintegrasi.

## Objectives

1. Melakukan rebranding Superapp menjadi Whenya.
2. Mempertahankan fitur dan data existing.
3. Membangun UI/UX konsisten untuk web dan mobile.
4. Meningkatkan pengalaman pengguna.
5. Mengembangkan aplikasi Android.
6. Menyiapkan fondasi integrasi AI.
7. Membangun arsitektur scalable dan maintainable.

## Product Vision

> One personal space to organize your life, understand your
> progress, and become a better version of yourself.

## Product Ecosystem

```text
WHENYA
│
├── Whenya Web
├── Whenya Mobile
├── Whenya API
├── Whenya AI
│
├── Productivity
├── Personal Finance
├── Life Goals
├── Habit Tracking
├── Journal
├── Calendar
└── Personal Insights
```

---

# 2. Brand Identity

| Element | Value |
|---------|-------|
| Brand Name | Whenya |
| Tagline | Your Life, In Sync. |
| Category | Personal Life Management |
| Personality | Modern, Calm, Intelligent, Personal |
| Primary Color | #193F30 |
| Secondary Color | #9BAF99 |
| Background | #F7F4EC |
| Accent Color | #C8AD80 |
| Typography | Plus Jakarta Sans |
| Design Style | Minimalist, Soft, Premium |

## 2.1 Logo Philosophy

Logo Whenya menggunakan huruf **W** sebagai identitas utama.

Makna:

- **W:** Identitas Whenya.
- **Flow:** Perjalanan dan perkembangan hidup.
- **Gold Dot:** Tujuan dan pencapaian.
- **Green:** Pertumbuhan dan keseimbangan.

## 2.2 Brand Assets

Assets yang perlu disiapkan:

- Primary Logo
- Secondary Logo
- Monochrome Logo
- App Icon
- Favicon
- Splash Screen
- Social Media Profile
- Open Graph Image
- Brand Guidelines

---

# 3. Existing Platform Audit

**Estimated Duration:** 1 Week

Sebelum implementasi, lakukan audit terhadap Superapp existing.

## 3.1 Frontend Audit

Checklist:

- [ ] Identifikasi framework existing
- [ ] Audit struktur routing
- [ ] Audit UI components
- [ ] Audit state management
- [ ] Audit authentication
- [ ] Audit API integration
- [ ] Audit responsive design
- [ ] Identifikasi reusable components

## 3.2 Backend Audit

Checklist:

- [ ] Inventory API endpoints
- [ ] Audit database schema
- [ ] Audit authentication dan authorization
- [ ] Audit service dependencies
- [ ] Audit background jobs
- [ ] Audit external integrations
- [ ] Audit logging dan monitoring
- [ ] Identifikasi technical debt

## 3.3 Product Audit

| Category | Description | Action |
|----------|-------------|--------|
| Core | Stable existing features | Keep |
| Improve | Features needing UX improvements | Redesign |
| Refactor | Technical issues | Refactor |
| Deprecated | Irrelevant features | Review |
| New | New Whenya features | Roadmap |

### Deliverable

`EXISTING_PLATFORM_AUDIT.md`

---

# 4. Information Architecture

## 4.1 Web Application

```text
WHENYA WEB
│
├── Dashboard
│   ├── Daily Overview
│   ├── Today's Tasks
│   ├── Habit Progress
│   ├── Financial Summary
│   └── Personal Insights
│
├── Productivity
│   ├── Tasks
│   ├── Projects
│   ├── Calendar
│   └── Focus Timer
│
├── Life Management
│   ├── Life Goals
│   ├── Habits
│   ├── Journal
│   └── Personal Notes
│
├── Finance
│   ├── Overview
│   ├── Transactions
│   ├── Budgets
│   ├── Savings Goals
│   └── Reports
│
├── Insights
│   ├── Productivity Analytics
│   ├── Habit Analytics
│   ├── Goal Progress
│   └── Financial Analytics
│
├── Whenya AI
│   ├── AI Assistant
│   ├── Daily Planning
│   └── Recommendations
│
└── Settings
    ├── Profile
    ├── Preferences
    ├── Notifications
    ├── Privacy & Security
    └── Account
```

## 4.2 Mobile Navigation

Bottom Navigation:

| Menu | Description |
|------|-------------|
| Home | Personal dashboard |
| Tasks | Task management |
| Add (+) | Quick actions |
| Insights | Personal analytics |
| Profile | Account and settings |

### Quick Actions

```text
QUICK ACTION

+ Create Task
+ Add Transaction
+ Create Habit
+ Write Journal
+ Add Goal
+ Create Event
```

---

# 5. Feature Implementation

## 5.1 Dashboard

**Web Route:** `/dashboard`  
**Mobile Screen:** `HomeScreen`

### Features

- Personal greeting
- Daily progress
- Today's tasks
- Habit progress
- Goal progress
- Financial summary
- Personal insights
- Quick actions

### API

```http
GET /api/v1/dashboard/summary
```

### Example Response

```json
{
  "tasks": {
    "total": 10,
    "completed": 7
  },
  "habits": {
    "completed": 3,
    "total": 5
  },
  "goals": {
    "active": 4
  },
  "finance": {
    "monthly_expense": 2450000
  }
}
```

### Acceptance Criteria

- [ ] Dashboard menampilkan data pengguna
- [ ] Widget dapat dibuka
- [ ] Loading state tersedia
- [ ] Empty state tersedia
- [ ] Error handling tersedia
- [ ] Responsive pada mobile dan desktop

---

## 5.2 Tasks Management

**Web Route:** `/productivity/tasks`

### Features

- Create task
- Update task
- Delete task
- Task priority
- Due date
- Categories
- Recurring tasks
- Search and filtering

### API

```http
GET    /api/v1/tasks
POST   /api/v1/tasks
GET    /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
```

### Data Model

```go
type Task struct {
    ID          uuid.UUID
    UserID      uuid.UUID
    Title       string
    Description string
    Status      string
    Priority    string
    DueDate     *time.Time
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

### Acceptance Criteria

- [ ] User dapat membuat task
- [ ] User dapat mengubah task
- [ ] User dapat menghapus task
- [ ] User dapat menyelesaikan task
- [ ] Filter dan search berfungsi
- [ ] Data tersinkronisasi antara web dan mobile

---

## 5.3 Habit Tracking

**Web Route:** `/life/habits`

### Features

- Create habit
- Daily check-in
- Habit streak
- Weekly progress
- Habit reminders
- Habit history

### API

```http
GET  /api/v1/habits
POST /api/v1/habits
POST /api/v1/habits/:id/check-ins
GET  /api/v1/habits/:id/history
```

### Acceptance Criteria

- [ ] User dapat membuat habit
- [ ] User dapat melakukan check-in
- [ ] Streak dihitung dengan benar
- [ ] Progress ditampilkan
- [ ] Riwayat habit tersedia
- [ ] Perhitungan mengikuti timezone pengguna

---

## 5.4 Life Goals

**Web Route:** `/life/goals`

### Features

- Create goals
- Goal categories
- Milestones
- Progress tracking
- Target dates
- Goal history

### Goal Categories

- Personal Growth
- Career
- Finance
- Health
- Education
- Lifestyle

### Example

```text
Goal: Become Fullstack Developer

Progress: 65%

Milestones:
[x] Learn Golang
[x] Build REST API
[x] Learn React
[ ] Learn Next.js
[ ] Deploy Fullstack App
```

### Acceptance Criteria

- [ ] User dapat membuat goal
- [ ] User dapat menambahkan milestone
- [ ] Progress dapat dihitung
- [ ] Goal memiliki target date
- [ ] Goal dapat diarsipkan

---

## 5.5 Personal Finance

**Web Route:** `/finance`

### Features

- Income tracking
- Expense tracking
- Transaction categories
- Monthly budgets
- Savings goals
- Financial reports

### API

```http
GET  /api/v1/finance/summary
GET  /api/v1/finance/transactions
POST /api/v1/finance/transactions
GET  /api/v1/finance/budgets
POST /api/v1/finance/budgets
```

### Acceptance Criteria

- [ ] User dapat mencatat pemasukan
- [ ] User dapat mencatat pengeluaran
- [ ] User dapat membuat budget
- [ ] Ringkasan keuangan tersedia
- [ ] Grafik keuangan tersedia
- [ ] Perhitungan nominal menggunakan decimal/integer

---

## 5.6 Journal

**Web Route:** `/life/journal`

### Features

- Daily journal
- Rich text editor
- Mood tracking
- Journal calendar
- Attachments
- Search journal

### Acceptance Criteria

- [ ] User dapat membuat jurnal
- [ ] User dapat mengedit jurnal
- [ ] User dapat menghapus jurnal
- [ ] User dapat menambahkan mood
- [ ] User dapat mencari jurnal
- [ ] Data jurnal hanya dapat diakses pemilik

---

## 5.7 Calendar

**Web Route:** `/productivity/calendar`

### Features

- Monthly calendar
- Weekly calendar
- Daily schedule
- Task deadlines
- Events
- Reminders

### Future Integrations

- Google Calendar
- Microsoft Outlook

---

## 5.8 Personal Insights

**Web Route:** `/insights`

### Features

- Productivity analytics
- Task completion trends
- Habit consistency
- Goal progress
- Financial trends

### Metrics

```text
Task Completion Rate =
Completed Tasks / Total Tasks * 100

Habit Completion Rate =
Completed Check-ins / Scheduled Check-ins * 100
```

---

# 6. Whenya AI

**Priority:** P2

AI dikembangkan setelah core application stabil.

## 6.1 AI Features

| Feature | Description |
|---------|-------------|
| Daily Planner | Generate daily planning |
| Task Assistant | Break down tasks |
| Habit Recommendations | Suggest habits |
| Financial Insights | Analyze expenses |
| Goal Planning | Generate milestones |
| Weekly Summary | Summarize user progress |

## 6.2 Architecture

```text
Web / Mobile
     |
     v
API Gateway
     |
     v
Whenya Backend
     |
     +-------------------+
     |                   |
     v                   v
Core Services        AI Service
     |                   |
     v                   v
PostgreSQL             LLM API
     |                   |
     v                   v
   Redis             Tool Calling
                         |
                         v
                  Approved Actions
```

## 6.3 Security Requirements

- [ ] AI hanya mengakses data yang diizinkan
- [ ] Sensitive actions membutuhkan konfirmasi
- [ ] Audit log tersedia
- [ ] Rate limiting tersedia
- [ ] User dapat menonaktifkan AI features

---

# 7. Technical Architecture

## 7.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Web | Next.js + TypeScript |
| Mobile | React Native + Expo |
| Web UI | Tailwind CSS + shadcn/ui |
| Mobile UI | NativeWind |
| State Management | Zustand |
| Server State | TanStack Query |
| Backend | Golang + Gin |
| ORM | GORM |
| Database | PostgreSQL |
| Cache | Redis |
| Storage | S3 Compatible |
| Authentication | OAuth 2.0 / OIDC |
| API Documentation | OpenAPI |
| Monitoring | OpenTelemetry |
| CI/CD | GitHub Actions |
| Containerization | Docker |

## 7.2 Backend Architecture

**Recommended Pattern:** Modular Monolith

```text
whenya-backend/
│
├── cmd/
│   └── api/
│
├── internal/
│   ├── auth/
│   ├── users/
│   ├── dashboard/
│   ├── tasks/
│   ├── habits/
│   ├── goals/
│   ├── finance/
│   ├── journal/
│   ├── calendar/
│   ├── insights/
│   └── notifications/
│
├── pkg/
├── migrations/
├── docs/
└── go.mod
```

## 7.3 Monorepo Architecture

```text
whenya/
│
├── apps/
│   ├── web/
│   └── mobile/
│
├── packages/
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── design-tokens/
│   └── utils/
│
├── services/
│   └── backend/
│
├── docs/
├── package.json
└── turbo.json
```

### Shared Packages

- API Client
- TypeScript Types
- Validation Schemas
- Design Tokens
- Utilities
- Shared Business Logic

---

# 8. Design System

## 8.1 Color Tokens

```css
:root {
  --color-primary: #193f30;
  --color-secondary: #9baf99;
  --color-background: #f7f4ec;
  --color-accent: #c8ad80;

  --color-surface: #ffffff;
  --color-text-primary: #172b23;
  --color-text-secondary: #68766e;
  --color-border: #e4e8e1;
}
```

## 8.2 Typography

| Element | Font Size |
|---------|-----------|
| Display | 40px |
| H1 | 32px |
| H2 | 24px |
| H3 | 20px |
| Body | 16px |
| Small | 14px |
| Caption | 12px |

## 8.3 Components

- Button
- Input
- Select
- Checkbox
- Switch
- Card
- Modal
- Drawer
- Tabs
- Badge
- Progress
- Calendar
- DatePicker
- Chart
- Toast
- Skeleton
- EmptyState

## 8.4 UI States

Setiap halaman harus mendukung:

- Loading
- Empty
- Error
- Success
- Offline (jika relevan)

---

# 9. Rebranding Strategy

## 9.1 Product Identity Migration

Update:

- [ ] Application Name
- [ ] Navigation Header
- [ ] Page Title
- [ ] Meta Description
- [ ] Email Templates
- [ ] Push Notifications
- [ ] Authentication Pages
- [ ] Footer
- [ ] Loading Screen
- [ ] Error Pages
- [ ] Documentation

## 9.2 Domain Architecture

```text
whenya.com          Marketing Website
app.whenya.com      Web Application
api.whenya.com      Backend API
docs.whenya.com     Documentation
```

> Note: Domain availability belum diverifikasi.

## 9.3 SEO Migration

- [ ] Mapping old URLs to new URLs
- [ ] Implement 301 redirects
- [ ] Update canonical URLs
- [ ] Update sitemap
- [ ] Review robots.txt
- [ ] Update Search Console
- [ ] Monitor 404 errors
- [ ] Maintain redirects

---

# 10. Migration Strategy

## 10.1 Migration Flow

```text
Current Superapp
       |
       v
Create Rebranding Branch
       |
       v
Implement Design System
       |
       v
Migrate Pages Incrementally
       |
       v
Internal Testing
       |
       v
Beta Release
       |
       v
Gradual Rollout
       |
       v
Whenya Production
```

## 10.2 Git Branch Strategy

```text
main
│
├── develop
│
├── feature/whenya-design-system
├── feature/whenya-dashboard
├── feature/whenya-tasks
├── feature/whenya-habits
├── feature/whenya-finance
├── feature/whenya-mobile
│
└── release/whenya-v1
```

## 10.3 Data Migration Checklist

- [ ] Preserve existing user IDs
- [ ] Preserve financial history
- [ ] Preserve tasks
- [ ] Preserve habits
- [ ] Preserve goals
- [ ] Create database backup
- [ ] Prepare rollback strategy
- [ ] Validate data ownership
- [ ] Run migration tests

---

# 11. Development Roadmap

Estimasi untuk tim kecil dengan dua developer yang
bekerja cukup fokus.

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0. Existing Audit | 1 week | Audit Report |
| 1. Brand Foundation | 1 week | Brand Guidelines |
| 2. Design System | 2 weeks | UI Components |
| 3. Web Rebranding | 3 weeks | Web Beta |
| 4. Backend Alignment | 2 weeks | Stable API |
| 5. Mobile Development | 4 weeks | Android Beta |
| 6. Integration & QA | 2 weeks | Release Candidate |
| 7. Launch | 1 week | Whenya v1 |

**Estimated Baseline:** 16 weeks.

> Timeline dapat berubah berdasarkan kondisi codebase
> existing dan kompleksitas fitur.

---

# 12. MVP Prioritization

## P0 - Core MVP

- [ ] Brand Identity
- [ ] Authentication
- [ ] Dashboard
- [ ] Tasks
- [ ] Habits
- [ ] Goals
- [ ] Profile & Settings
- [ ] Responsive Web
- [ ] Android App

## P1 - Extended Features

- [ ] Finance
- [ ] Journal
- [ ] Calendar
- [ ] Notifications
- [ ] Personal Insights

## P2 - Advanced Features

- [ ] Whenya AI
- [ ] AI Recommendations
- [ ] Google Calendar Sync
- [ ] Advanced Analytics
- [ ] Offline Synchronization
- [ ] iOS Release

> Existing features yang sudah stabil dapat dipertahankan
> pada v1 meskipun berada dalam kategori P1.

---

# 13. Quality Assurance

## Testing Strategy

| Test Type | Target |
|-----------|--------|
| Unit Testing | Core business logic |
| Integration Testing | API and database |
| E2E Testing | Critical user journeys |
| UI Testing | Responsive layouts |
| Accessibility | WCAG 2.2 AA |
| Performance | Core Web Vitals |
| Security | OWASP ASVS / MASVS |

## Critical User Journeys

- [ ] Register
- [ ] Login
- [ ] Create task
- [ ] Complete task
- [ ] Create habit
- [ ] Habit check-in
- [ ] Create goal
- [ ] Update goal progress
- [ ] View dashboard
- [ ] Logout
- [ ] Login persistence
- [ ] Web-mobile synchronization
- [ ] User data isolation

---

# 14. Product Analytics

## Metrics

| KPI | Description |
|-----|-------------|
| Activation Rate | Onboarding success |
| DAU / WAU | Active users |
| D7 Retention | Returning users |
| Task Completion | Task engagement |
| Habit Check-in Rate | Habit engagement |
| Crash-Free Sessions | App stability |
| API Error Rate | Backend reliability |

## Initial Targets

| KPI | Target |
|-----|--------|
| Onboarding Completion | >= 70% |
| D7 Retention | >= 25% |
| Crash-Free Sessions | >= 99.5% |
| API Availability | >= 99.5% |
| Critical E2E Tests | 100% pass |

> Target merupakan hipotesis awal dan perlu divalidasi.

---

# 15. Launch Strategy

## 15.1 Internal Alpha

Objectives:

- Validate core workflows
- Identify bugs
- Validate data integrity
- Review UI consistency

## 15.2 Closed Beta

Objectives:

- Collect user feedback
- Measure onboarding
- Test mobile performance
- Validate product usability

## 15.3 Public Launch

Checklist:

- [ ] Production deployment ready
- [ ] Domain migration completed
- [ ] Android release approved
- [ ] Documentation updated
- [ ] Rebranding announcement published
- [ ] Monitoring enabled
- [ ] Rollback plan ready

---

# 16. Rebranding Communication

## Announcement Title

**Meet Whenya. Your Life, In Sync.**

## Announcement Copy

Superapp is becoming Whenya.

Whenya merupakan identitas baru yang menghadirkan
pengalaman lebih sederhana, personal, dan terintegrasi
untuk membantu pengguna mengelola aktivitas,
tujuan, dan kebutuhan sehari-hari.

Dengan desain yang lebih modern dan pengalaman
lintas perangkat, Whenya menjadi langkah berikutnya
dalam pengembangan platform kami.

**One place. Your plans. Your progress. Your life.**

## Communication Channels

- Landing Page
- In-App Announcement
- Email
- Social Media
- Release Notes
- Google Play Store

---

# 17. Implementation Backlog

| Epic | Task | Acceptance Criteria |
|------|------|---------------------|
| Audit | Inventory routes | All routes documented |
| Audit | Inventory APIs | All endpoints documented |
| Branding | Logo integration | Consistent branding |
| Branding | Design tokens | Centralized tokens |
| UI | Shared components | Reusable components |
| Web | Dashboard | User data displayed |
| Web | Tasks | CRUD functional |
| Web | Habits | Check-in functional |
| Web | Goals | Progress tracking works |
| Mobile | App shell | Navigation functional |
| Mobile | Authentication | Secure login |
| Mobile | Core modules | API integrated |
| Backend | API alignment | Contracts validated |
| QA | Critical E2E | All critical tests pass |
| Release | Staging | E2E ready |
| Release | Production | Monitoring enabled |

---

# 18. Milestones

## Milestone 1: Whenya Foundation

Deliverables:

- Existing Platform Audit
- Brand Guidelines
- Design System
- Authentication Layout
- Routing Foundation

## Milestone 2: Whenya Web

Deliverables:

- Dashboard
- Tasks
- Habits
- Goals
- Settings
- Existing Feature Migration

## Milestone 3: Whenya Mobile

Deliverables:

- Android App Shell
- Authentication
- Dashboard
- Tasks
- Habits
- Goals
- Quick Actions

## Milestone 4: Whenya Launch

Deliverables:

- QA Completion
- Beta Testing
- Domain Migration
- Android Release
- Production Monitoring
- Public Announcement

---

# 19. Architecture Decisions

| Decision | Recommendation |
|----------|----------------|
| Rewrite vs Refactor | Incremental Refactor |
| Web Framework | Reuse existing if viable |
| Mobile Framework | React Native + Expo |
| Backend Pattern | Modular Monolith |
| API Strategy | Shared API |
| Database | Preserve existing |
| UI Strategy | Shared tokens |
| Initial Mobile Release | Android |
| AI Integration | Post-MVP |
| Rebranding | Gradual rollout |

---

# 20. Definition of Done

Suatu fitur dinyatakan selesai apabila:

- [ ] Functional requirements terpenuhi
- [ ] UI sesuai design system
- [ ] Responsive pada target device
- [ ] API integration berjalan
- [ ] Validation tersedia
- [ ] Error handling tersedia
- [ ] Loading dan empty states tersedia
- [ ] Unit/integration tests relevan lulus
- [ ] Security review selesai
- [ ] Code review selesai
- [ ] Documentation diperbarui
- [ ] Tidak ada critical bug

---

# 21. Project Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing code incompatibility | High | Initial audit |
| Data migration failure | Critical | Backup and rollback |
| Scope creep | High | MVP prioritization |
| UI inconsistency | Medium | Design system |
| Mobile performance | Medium | Profiling and testing |
| API breaking changes | High | API versioning |
| Authentication issues | Critical | Security testing |
| Delayed release | Medium | Milestone tracking |

---

# 22. Immediate Next Actions

## Week 1

- [ ] Audit existing repository
- [ ] Document current architecture
- [ ] Inventory features
- [ ] Inventory API endpoints
- [ ] Audit database schema
- [ ] Identify migration risks

## Week 2

- [ ] Finalize Whenya branding
- [ ] Prepare logo assets
- [ ] Implement design tokens
- [ ] Build base UI components
- [ ] Prepare web application shell

## Week 3

- [ ] Implement dashboard layout
- [ ] Implement navigation
- [ ] Integrate authentication
- [ ] Implement dashboard widgets
- [ ] Begin Tasks module migration

---

# 23. Final Product Direction

Whenya bukan sekadar perubahan nama Superapp.

Whenya merupakan evolusi platform menuju
personal life management ecosystem.

Prioritas pengembangan:

1. Preserve existing functionality.
2. Improve user experience.
3. Establish consistent branding.
4. Build reliable web and mobile applications.
5. Introduce AI after core product stability.
6. Launch incrementally with measurable results.

## Product Statement

> Whenya is your personal space to plan,
> organize, and grow.

**Whenya — Your Life, In Sync.**

---

## Document Notes

Dokumen ini merupakan implementation master plan awal.

Asumsi teknis, fitur existing, timeline, dan prioritas
harus divalidasi melalui audit repository Superapp.

Dokumen dapat digunakan sebagai referensi untuk:

- Product Requirement Document (PRD)
- Technical Design Document (TDD)
- UI/UX Design Specification
- Development Roadmap
- GitHub Projects
- Jira Epics
- AI Coding Agent Implementation

---

**Document Version:** 1.0  
**Project:** Whenya  
**Status:** Draft / Ready for Technical Audit