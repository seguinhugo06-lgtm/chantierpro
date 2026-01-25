# 🤖 AI MULTI-AGENT DEVELOPMENT SYSTEM

## Complete Workflow Documentation

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Workflow Example](#workflow-example)
6. [Agent Details](#agent-details)
7. [Configuration](#configuration)
8. [Advanced Usage](#advanced-usage)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This system orchestrates multiple AI agents (Claude instances) to collaboratively build complete applications from a single user request. Each agent has a specialized role and communicates through a structured protocol.

### Key Features

- 🔄 **Automated Workflow**: Full pipeline from specs to deployment
- 🤖 **8 Specialized Agents**: Each with unique expertise
- 💾 **Checkpointing**: Resume from any point if interrupted
- ⚡ **Parallel Execution**: Faster development with concurrent agents
- 📝 **Structured Communication**: JSON-based inter-agent messages
- 🔍 **Code Review**: Built-in quality assurance

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 USER REQUEST                                     │
│                 "Create an app for managing construction projects"              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               ORCHESTRATOR                                       │
│                      (orchestrator.sh / orchestrator.py)                         │
│  • Parses user request                                                          │
│  • Manages workflow state                                                        │
│  • Coordinates agents                                                            │
│  • Handles checkpoints                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│   PHASE 1     │             │   PHASE 2     │             │   PHASE 3     │
│   ANALYSIS    │────────────▶│   DESIGN      │────────────▶│ DEVELOPMENT   │
│               │             │               │             │               │
│ 📋 Product    │             │ 🏗️ Architect  │             │ 🎨 Frontend   │
│    Manager    │             │               │             │ ⚙️ Backend    │
│               │             │               │             │ 🚀 DevOps     │
└───────────────┘             └───────────────┘             └───────────────┘
                                                                    │
                                        ┌───────────────────────────┘
                                        │
                                        ▼
                              ┌───────────────┐             ┌───────────────┐
                              │   PHASE 4     │             │   PHASE 5     │
                              │   QUALITY     │────────────▶│ INTEGRATION   │
                              │               │             │               │
                              │ 🧪 QA Tester  │             │ 🔗 Integration│
                              │ 🔍 Code Review│             │               │
                              └───────────────┘             └───────────────┘
                                                                    │
                                                                    ▼
                                                        ┌───────────────────┐
                                                        │  ✅ APPLICATION   │
                                                        │     COMPLETE      │
                                                        └───────────────────┘
```

---

## Installation

### Prerequisites

- macOS or Linux
- Bash 4.0+
- Python 3.8+ (optional, for advanced features)
- jq (JSON processing)
- Claude Code CLI (or manual execution)

### Setup

```bash
# Clone or download the system
cd /path/to/your/projects
git clone <repository> ai-workflow-system
cd ai-workflow-system

# Run setup
./setup.sh

# Verify installation
./orchestrator.sh --help
```

---

## Quick Start

### Option 1: Full Automated Workflow

```bash
./orchestrator.sh "Create a construction project management app with:
- Real-time dashboard
- Quote/invoice generation with PDF export
- Client management CRM
- Project timeline tracking
- Team scheduling
- Notification system"
```

### Option 2: Interactive Mode

```bash
./orchestrator.sh -i

# Then use commands like:
orchestrator> run product_manager
orchestrator> status
orchestrator> run architect
orchestrator> checkpoints
```

### Option 3: Python Orchestrator

```bash
python3 orchestrator.py "Your project description"

# Or interactive:
python3 orchestrator.py -i
```

---

## Workflow Example

### Step-by-Step Execution

Here's what happens when you run:

```bash
./orchestrator.sh "Create a todo app with authentication and real-time sync"
```

#### Phase 1: Analysis (Product Manager)

**Input**: User request

**Output**:
- `specs.json` - Project specifications
- `user_stories.json` - User stories in standard format
- `acceptance_criteria.json` - Testable criteria
- `project_brief.md` - Summary for other agents

Example `specs.json`:
```json
{
  "project_name": "TodoSync",
  "description": "Real-time todo application with authentication",
  "core_features": [
    {
      "id": "F001",
      "name": "User Authentication",
      "priority": "P0",
      "description": "Login, register, password reset"
    },
    {
      "id": "F002",
      "name": "Todo CRUD",
      "priority": "P0",
      "description": "Create, read, update, delete todos"
    }
  ],
  "target_users": [
    {
      "persona": "Busy Professional",
      "goals": ["Organize tasks", "Access from anywhere"]
    }
  ]
}
```

#### Phase 2: Design (Architect)

**Input**: specs.json, user_stories.json

**Output**:
- `architecture.json` - System architecture
- `tech_stack.json` - Technology choices
- `db_schema.json` - Database design
- `api_design.json` - API endpoints
- `folder_structure.json` - Project structure

Example `tech_stack.json`:
```json
{
  "frontend": {
    "framework": "react",
    "language": "typescript",
    "styling": "tailwindcss",
    "state": "zustand"
  },
  "backend": {
    "runtime": "node",
    "framework": "express",
    "orm": "prisma"
  },
  "database": {
    "primary": "postgresql",
    "hosting": "supabase"
  }
}
```

#### Phase 3: Development (Frontend + Backend + DevOps)

**Runs in parallel (if configured)**

**Frontend Developer Output**:
- `src/components/**` - React components
- `src/pages/**` - Page components
- `src/hooks/**` - Custom hooks
- `src/services/**` - API services

**Backend Developer Output**:
- `src/api/**` - API routes and controllers
- `src/services/**` - Business logic
- `prisma/schema.prisma` - Database schema

**DevOps Output**:
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Local development
- `.github/workflows/` - CI/CD pipelines
- `vercel.json` - Deployment config

#### Phase 4: Quality (QA + Code Review)

**QA Tester Output**:
- `tests/unit/**` - Unit tests
- `tests/integration/**` - Integration tests
- `tests/e2e/**` - End-to-end tests
- `test_report.json` - Coverage report

**Code Reviewer Output**:
- `review_report.json` - Code quality assessment
- `security_audit.json` - Security findings
- `performance_audit.json` - Performance analysis

#### Phase 5: Integration

**Output**:
- `integration_report.json` - Final validation
- `deployment_checklist.md` - Deployment guide
- `README.md` - Project documentation
- `CHANGELOG.md` - Version history

---

## Agent Details

### 📋 Product Manager AI

**Role**: Translate user requirements into actionable specifications

**Key Responsibilities**:
- Analyze user request
- Identify personas and use cases
- Create user stories (En tant que... Je veux... Afin de...)
- Define acceptance criteria (Given/When/Then)
- Prioritize features (P0-P3)

**Handoff**: → Architect

---

### 🏗️ Architect AI

**Role**: Design the technical architecture

**Key Responsibilities**:
- Choose appropriate technology stack
- Design system architecture
- Create database schema
- Define API contracts
- Document architecture decisions (ADRs)

**Handoff**: → Frontend, Backend, DevOps (parallel)

---

### 🎨 Frontend Developer AI

**Role**: Implement the user interface

**Key Responsibilities**:
- Create React components
- Implement responsive design
- Handle state management
- Connect to backend APIs
- Ensure accessibility

**Handoff**: → QA Tester

---

### ⚙️ Backend Developer AI

**Role**: Implement server-side logic

**Key Responsibilities**:
- Create API endpoints
- Implement business logic
- Set up database with Prisma
- Handle authentication
- Implement validation

**Handoff**: → QA Tester

---

### 🚀 DevOps AI

**Role**: Configure deployment and CI/CD

**Key Responsibilities**:
- Create Docker configuration
- Set up CI/CD pipelines
- Configure deployment
- Document environment variables
- Optimize build process

**Handoff**: → Integration

---

### 🧪 QA Tester AI

**Role**: Create comprehensive test suites

**Key Responsibilities**:
- Write unit tests
- Create integration tests
- Implement E2E tests
- Achieve >80% coverage
- Test edge cases

**Handoff**: → Code Reviewer

---

### 🔍 Code Reviewer AI

**Role**: Ensure code quality and security

**Key Responsibilities**:
- Review code style
- Check security vulnerabilities
- Analyze performance
- Suggest improvements
- Approve or request changes

**Handoff**: → Integration

---

### 🔗 Integration AI

**Role**: Assemble and validate final product

**Key Responsibilities**:
- Merge all modules
- Run final validation
- Create documentation
- Prepare deployment checklist
- Generate changelog

**Handoff**: → Complete!

---

## Configuration

### config.yaml

```yaml
system:
  name: "AI Development Workflow"
  log_level: "INFO"
  max_retries: 3
  parallel_execution: true

agents:
  product_manager:
    model: "claude-sonnet-4-20250514"
    max_tokens: 8000
    
  architect:
    model: "claude-sonnet-4-20250514"
    max_tokens: 12000

cache:
  enabled: true
  ttl_hours: 24

checkpoints:
  enabled: true
  keep_last_n: 10
```

---

## Advanced Usage

### Resume from Checkpoint

```bash
# List available checkpoints
./orchestrator.sh -l

# Restore specific checkpoint
./orchestrator.sh -r chk-architect-1705590000
```

### Run Specific Agent

```bash
# Run only frontend developer
./orchestrator.sh -a frontend_developer
```

### Parallel Development

The system automatically parallelizes Phase 3 (Development) when `parallel_execution: true` in config.

### Custom Prompts

Edit files in `.ai-workflow/prompts/` to customize agent behavior.

---

## Troubleshooting

### Common Issues

#### "Claude CLI not found"

The system saves prompts for manual execution:
```bash
cat .ai-workflow/logs/product_manager_execute_me.md
# Copy and paste into Claude
```

#### "Checkpoint restore failed"

```bash
# Check checkpoint exists
ls .ai-workflow/checkpoints/

# Try restoring
./orchestrator.sh -r <checkpoint_id>
```

#### "Agent failed after retries"

Check logs:
```bash
cat .ai-workflow/logs/orchestrator.log
cat .ai-workflow/logs/<agent>_output.log
```

### Getting Help

```bash
./orchestrator.sh --help
python3 orchestrator.py --help
```

---

## File Structure

```
ai-workflow-system/
├── orchestrator.sh           # Main bash orchestrator
├── orchestrator.py           # Python orchestrator (advanced)
├── setup.sh                  # Installation script
├── README.md                 # This file
├── .ai-workflow/
│   ├── config.yaml           # System configuration
│   ├── prompts/              # Agent system prompts
│   │   ├── product_manager.md
│   │   ├── architect.md
│   │   ├── frontend_developer.md
│   │   ├── backend_developer.md
│   │   ├── devops.md
│   │   ├── qa_tester.md
│   │   ├── code_reviewer.md
│   │   └── integration.md
│   ├── state/                # Current workflow state
│   │   ├── workflow_state.json
│   │   ├── specs.json
│   │   ├── user_stories.json
│   │   └── ...
│   ├── logs/                 # Execution logs
│   ├── checkpoints/          # Recovery points
│   └── cache/                # Response cache
├── src/                      # Generated source code
├── tests/                    # Generated tests
└── docs/                     # Generated documentation
```

---

## License

MIT License - Feel free to use and modify.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Happy Building! 🚀**
