# RoboOps

**Intelligent Maintenance and Issue Management Platform**

RoboOps is a project designed to support equipment issue reporting, analysis, prioritization, and maintenance task proposals through a connected frontend and backend system.

## Features

- **Reports Inbox:** View and manage reported issues.
- **Report Analysis:** Analyze reports to identify potential issues.
- **Issue Intelligence:** Generate proposed maintenance tasks from identified issues.
- **Priority Assessment:** Apply backend priority-scoring logic.
- **Backend API:** Connect the frontend with backend services.
- **CORS Configuration:** Allow the local frontend to communicate with the backend during development.

## Tech Stack

- **Frontend:** JavaScript, npm, and the project's frontend framework
- **Backend:** Python, FastAPI, and Uvicorn
- **Version Control:** Git and GitHub

## Project Structure

```text
RoboOps/
├── backend/
│   ├── main.py
│   └── services/
│       ├── extractor.py
│       └── priority_engine.py
├── frontend/
│   ├── package.json
│   └── src/
└── README.md
```

*Note: The structure above highlights key files. Other project files and folders may also be present.*

## Prerequisites

Install the following before running the project:

- Python
- Node.js and npm
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Vaishnavikumari2007/RoboOps.git
cd RoboOps
```

### 2. Set up the backend

Open a terminal in the `backend` directory:

```bash
cd backend
```

Create a virtual environment if one does not already exist:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the project's dependencies using its dependency file, if provided. For example, if it contains `requirements.txt`:

```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
python -m uvicorn main:app --reload --port 8000
```

The backend should be available at:

- API: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- API documentation: http://127.0.0.1:8000/docs

### 3. Set up the frontend

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by the frontend development server. The port may vary depending on availability.

## Development Workflow

RoboOps uses Git branches to keep development work separate.

| Branch | Purpose |
|---|---|
| `main` | Main project branch |
| `BACKEND-dev` | Backend development |
| `frontend-dev` | Frontend development |
| `integration-dev` | Combining and testing the frontend and backend before release |

### Recommended integration process

1. Push changes to the appropriate development branch.
2. Fetch the latest remote branches.
3. Create or update `integration-dev` from `frontend-dev`.
4. Merge `origin/BACKEND-dev` into `integration-dev`.
5. Resolve any merge conflicts carefully.
6. Run and test both frontend and backend.
7. Push the integration branch to GitHub.
8. Create a pull request from `integration-dev` into `main`.
9. Review and merge only after the combined project is verified.

**Important:** Coordinate with the team before integration. Only one person should manage the integration branch at a time.

## Testing Checklist

Before merging into `main`, verify:

- [ ] The backend starts successfully.
- [ ] The health-check endpoint responds.
- [ ] The frontend starts successfully.
- [ ] The frontend connects to the backend.
- [ ] Reports load in the inbox.
- [ ] Report analysis works.
- [ ] Issue Intelligence can propose a task.
- [ ] Backend extraction and priority logic work as expected.
- [ ] No unresolved merge conflicts remain.

## Team Collaboration

- Commit related changes with clear commit messages.
- Push work to the appropriate development branch.
- Avoid committing directly to `main` during active development.
- Review changes before merging.
- Keep both development branches until the team confirms the integrated version is stable.

## Contributors

Developed collaboratively as part of the RoboOps project.

## Project Status

Under development. Features and integration may evolve as the project progresses.

---

*RoboOps — Turning equipment issues into actionable maintenance workflows.*
