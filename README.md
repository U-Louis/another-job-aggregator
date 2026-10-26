🚀 Another Job Aggregator

Automating the job search hassle by centralizing and aggregating listings across multiple job boards into one seamless workspace.

📌 Overview

Another Job Aggregator is an automation tool designed to streamline job hunting. Instead of manually checking dozens of job boards every day, this application scrapes, aggregates, and organizes job openings into a single consolidated pipeline.


⚙️ How it works
Architecture is a simple ETL pattern :
<img width="1581" height="1077" alt="image" src="https://github.com/user-attachments/assets/e997fa7b-d40e-4ee0-87f2-a77f089ec7f8" />
Computation is meant to be done in github actions. Simple. And free minutes are way enough.
Storage is in a notion db, that's easy, free and flexible.
I made a few versatile adapters for different categories of datasources but for implementing a new one, it may require to build another specific adapter.
Crawling this notion db was unpleasant so I made a little HMI inspired by Among Us. More fun. One should'nt underestimate moral.
<img width="1728" height="1158" alt="Capture d’écran 2026-10-26 à 13 21 36" src="https://github.com/user-attachments/assets/56d9225d-4b55-4041-b395-063efc5b8b8d" />
<img width="1348" height="982" alt="Capture d’écran 2026-10-26 à 13 21 43" src="https://github.com/user-attachments/assets/7015e874-311a-468f-9b7f-d2bc5d49360d" />

🚀 Quick Start

Prerequisites

Node.js (v18+ recommended)

npm, pnpm, or yarn

Installation

Clone the repository:

git clone https://github.com/U-Louis/another-job-aggregator.git
cd another-job-aggregator


Install dependencies:

npm install


Configure Environment Variables (or copy the .example):
Create a .env file in the root directory:

# Add your environment variables here
PORT=3000

Setup your own configs files (one for each search)

Run :

npm run review
