# 🚀 Another Job Aggregator

> Automating the job search hassle by centralizing and aggregating listings across multiple job boards into one seamless workspace.

## 📌 Overview

**Another Job Aggregator** is an automation tool designed to streamline job hunting. Instead of manually checking dozens of job boards every day, this application scrapes, aggregates, and organizes job openings into a single consolidated pipeline.

---

## ⚙️ How It Works

Architecture is a simple **ETL** pattern:

<p align="center">
  <img src="https://github.com/user-attachments/assets/e997fa7b-d40e-4ee0-87f2-a77f089ec7f8" alt="Architecture ETL" width="100%" />
</p>

* **Computation:** Meant to be done in GitHub Actions. Simple, and free minutes are way enough.
* **Storage:** Stored in a Notion DB — easy, free, and flexible.
* **Adapters:** Includes versatile adapters for different categories of datasources (building a new one requires implementing a specific adapter).

### Custom HMI
Crawling the Notion DB directly was unpleasant, so I built a little HMI inspired by *Among Us*. More fun — one shouldn't underestimate morale!

<p align="center">
  <img src="https://github.com/user-attachments/assets/56d9225d-4b55-4041-b395-063efc5b8b8d" alt="job offers" width="49%" />
  <img src="https://github.com/user-attachments/assets/7015e874-311a-468f-9b7f-d2bc5d49360d" alt="selected jobs" width="49%" />
</p>

---

## 🚀 Quick Start

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended)
* `npm`, `pnpm`, or `yarn`

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/U-Louis/another-job-aggregator.git
   cd another-job-aggregator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (or copy from `.env.example`):
   ```env
   # Add your environment variables here
   PORT=3000
   ```

4. **Setup Configs:**
   Setup your own config files (one for each search).

5. **Run Review:**
   ```bash
   npm run review
   ```
