# Aksora — One Team. One Flow.

Aksora is the all-in-one engineering workspace designed to unify software quality, execution, and project workflows. It brings test planning, manual & exploratory test execution, bug tracking, sprint management, standup notes, and auto-generated weekly quality reports into a single, cohesive interface.

Built by [Akusara Digital](https://akusaradigital.com).

---

## Live Links

- **Live App (Vercel)**: [https://aksora-orpin.vercel.app](https://aksora-orpin.vercel.app)
- **Production Domain**: [https://aksora.akusaraproject.my.id](https://aksora.akusaraproject.my.id)

---

## What is Aksora?

Traditional software teams waste hours context-switching between fragmented tools—spreadsheets for test cases, disparate issue trackers for bugs, standalone Kanban boards for development tasks, and separate documents for meeting syncs.

**Aksora solves this by providing one integrated system of record for engineering and QA:**

1. **Test Management & Test Suites**
   - Design reusable test suites and plans mapped to feature releases and sprints.
   - Rich test case authoring with preconditions, step-by-step actions, expected outcomes, and bulk Excel import/export.
   - Run interactive execution sessions with real-time pass, fail, and blocked status recording.

2. **Streamlined Defect & Bug Lifecycle**
   - Capture defect reports with priority, severity, steps to reproduce, screenshot attachments, and assignees.
   - Track defects through their complete lifecycle from open triage to fix verification and closure.
   - Integrated Jira and external tracker dispatch.

3. **Sprint Planning & Task Boards**
   - Role-based Kanban workflows connecting developers, QAs, product managers, and engineering leadership.
   - Sprint lifecycle management with live burndown metrics and progress tracking.

4. **Automated Quality Dashboards & Reports**
   - High-level overview of quality health scores, test execution coverage, pass/fail trends, and defect severity heatmaps.
   - Auto-generated weekly digest reports that eliminate manual status compilation.

5. **Daily Standups & Activity Traceability**
   - Centralized daily standup logging, blockers, and architectural sync notes.
   - Comprehensive audit logging recording every create, update, and delete action for end-to-end traceability.

---

## Built For Modern Engineering Roles

Aksora features role-based access control and customized workflows tailored for:
- **Product Managers & Team Leads** (`pm`, `admin`, `superadmin`)
- **Quality Assurance Engineers** (`qa`)
- **Frontend, Backend & Fullstack Engineers** (`fe`, `be`, `fullstack`)
- **Automated AI Agents & Runners** (`ai`)

---

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com) & [@phosphor-icons/react](https://phosphoricons.com)
- **Database & Persistence**: PostgreSQL via `@neondatabase/serverless` (Production / Neon) & `pg` (Local)
- **Deployment & Hosting**: [Vercel](https://vercel.com)
