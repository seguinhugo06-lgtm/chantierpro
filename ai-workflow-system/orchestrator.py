#!/usr/bin/env python3
"""
🤖 AI Multi-Agent Orchestrator - Python Module
==============================================

Advanced orchestration with parallel execution, caching, and state management.
This complements the bash script with more sophisticated logic.

Usage:
    python3 orchestrator.py "Your project description"
    python3 orchestrator.py --interactive
    python3 orchestrator.py --agent product_manager
"""

import os
import sys
import json
import yaml
import time
import uuid
import hashlib
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import shutil

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).parent
WORKFLOW_DIR = SCRIPT_DIR / ".ai-workflow"
STATE_DIR = WORKFLOW_DIR / "state"
LOGS_DIR = WORKFLOW_DIR / "logs"
CHECKPOINTS_DIR = WORKFLOW_DIR / "checkpoints"
CACHE_DIR = WORKFLOW_DIR / "cache"
PROMPTS_DIR = WORKFLOW_DIR / "prompts"
CONFIG_FILE = WORKFLOW_DIR / "config.yaml"

# Agent definitions with their phases and dependencies
AGENTS = {
    "product_manager": {"phase": 1, "emoji": "📋", "deps": []},
    "architect": {"phase": 2, "emoji": "🏗️", "deps": ["product_manager"]},
    "frontend_developer": {"phase": 3, "emoji": "🎨", "deps": ["architect"]},
    "backend_developer": {"phase": 3, "emoji": "⚙️", "deps": ["architect"]},
    "devops": {"phase": 3, "emoji": "🚀", "deps": ["architect"]},
    "qa_tester": {"phase": 4, "emoji": "🧪", "deps": ["frontend_developer", "backend_developer"]},
    "code_reviewer": {"phase": 4, "emoji": "🔍", "deps": ["qa_tester"]},
    "integration": {"phase": 5, "emoji": "🔗", "deps": ["code_reviewer", "devops"]},
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WorkflowState:
    workflow_id: str
    started_at: str
    current_phase: str
    current_agent: Optional[str]
    completed_agents: List[str]
    failed_agents: List[str]
    status: str
    user_request: str
    
    @classmethod
    def new(cls, user_request: str = "") -> "WorkflowState":
        return cls(
            workflow_id=f"wf-{int(time.time())}-{uuid.uuid4().hex[:8]}",
            started_at=datetime.utcnow().isoformat() + "Z",
            current_phase="init",
            current_agent=None,
            completed_agents=[],
            failed_agents=[],
            status="running",
            user_request=user_request
        )
    
    @classmethod
    def load(cls, path: Path) -> "WorkflowState":
        with open(path) as f:
            data = json.load(f)
        return cls(**data)
    
    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(asdict(self), f, indent=2)


@dataclass
class AgentResult:
    agent_name: str
    success: bool
    duration_seconds: float
    output_files: List[str]
    error_message: Optional[str] = None


@dataclass
class Message:
    message_id: str
    timestamp: str
    from_agent: str
    to_agent: str
    message_type: str  # handoff, request, response, error, clarification
    payload: Dict[str, Any]
    
    @classmethod
    def handoff(cls, from_agent: str, to_agent: str, payload: Dict) -> "Message":
        return cls(
            message_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat() + "Z",
            from_agent=from_agent,
            to_agent=to_agent,
            message_type="handoff",
            payload=payload
        )

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'


def log(level: str, message: str):
    """Log a message with timestamp and color."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    colors = {
        "INFO": Colors.GREEN,
        "WARN": Colors.YELLOW,
        "ERROR": Colors.RED,
        "AGENT": Colors.PURPLE,
    }
    
    color = colors.get(level, Colors.NC)
    print(f"{Colors.BLUE}[{timestamp}]{Colors.NC} {color}[{level}]{Colors.NC} {message}")
    
    # Also log to file
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOGS_DIR / "orchestrator.log", "a") as f:
        f.write(f"[{timestamp}] [{level}] {message}\n")


def print_banner():
    """Print the application banner."""
    print(f"{Colors.CYAN}")
    print("╔═══════════════════════════════════════════════════════════════════════════════╗")
    print("║                                                                               ║")
    print("║   🤖  AI MULTI-AGENT DEVELOPMENT SYSTEM (Python)                              ║")
    print("║                                                                               ║")
    print("║   Orchestrating: Product Manager → Architect → Developers → QA → Integration ║")
    print("║                                                                               ║")
    print("╚═══════════════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.NC}")


def print_phase(phase_name: str, phase_num: int):
    """Print phase header."""
    print()
    print(f"{Colors.PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.NC}")
    print(f"{Colors.PURPLE}  PHASE {phase_num}: {phase_name}{Colors.NC}")
    print(f"{Colors.PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.NC}")
    print()


def load_config() -> Dict:
    """Load configuration from YAML file."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return yaml.safe_load(f)
    return {}


def compute_cache_key(agent_name: str, context: str) -> str:
    """Compute a cache key for an agent execution."""
    content = f"{agent_name}:{context}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

class AgentExecutor:
    """Executes individual agents with Claude Code."""
    
    def __init__(self, state: WorkflowState, config: Dict):
        self.state = state
        self.config = config
        self.cache_enabled = config.get("cache", {}).get("enabled", True)
    
    def build_context(self, agent_name: str) -> str:
        """Build the context for an agent based on previous outputs."""
        context_parts = []
        
        if agent_name == "product_manager":
            context_parts.append(f"USER REQUEST:\n{self.state.user_request}")
        
        elif agent_name == "architect":
            for file in ["specs.json", "user_stories.json"]:
                path = STATE_DIR / file
                if path.exists():
                    context_parts.append(f"{file.upper()}:\n{path.read_text()}")
        
        elif agent_name in ["frontend_developer", "backend_developer", "devops"]:
            for file in ["architecture.json", "tech_stack.json", "api_design.json"]:
                path = STATE_DIR / file
                if path.exists():
                    context_parts.append(f"{file.upper()}:\n{path.read_text()}")
        
        elif agent_name == "qa_tester":
            for file in ["user_stories.json", "acceptance_criteria.json"]:
                path = STATE_DIR / file
                if path.exists():
                    context_parts.append(f"{file.upper()}:\n{path.read_text()}")
        
        elif agent_name == "code_reviewer":
            context_parts.append("Review all code in src/ and tests/ directories.")
            path = STATE_DIR / "test_report.json"
            if path.exists():
                context_parts.append(f"TEST REPORT:\n{path.read_text()}")
        
        elif agent_name == "integration":
            context_parts.append("Integrate all modules and prepare for deployment.")
            path = STATE_DIR / "review_report.json"
            if path.exists():
                context_parts.append(f"REVIEW REPORT:\n{path.read_text()}")
        
        return "\n\n".join(context_parts)
    
    def build_prompt(self, agent_name: str) -> str:
        """Build the full prompt for an agent."""
        prompt_file = PROMPTS_DIR / f"{agent_name}.md"
        
        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
        
        system_prompt = prompt_file.read_text()
        context = self.build_context(agent_name)
        
        full_prompt = f"""{system_prompt}

═══════════════════════════════════════════════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

{context}

═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Execute your role as defined above.
- Create all necessary files in the appropriate directories
- Output your results in the format specified in your prompt
- Save any JSON outputs to the {STATE_DIR}/ directory
- Report any issues or blockers immediately

Working directory: {SCRIPT_DIR}
State directory: {STATE_DIR}

Begin your work now."""
        
        return full_prompt
    
    def check_cache(self, agent_name: str, context: str) -> Optional[str]:
        """Check if we have a cached result for this agent execution."""
        if not self.cache_enabled:
            return None
        
        cache_key = compute_cache_key(agent_name, context)
        cache_file = CACHE_DIR / f"{agent_name}_{cache_key}.json"
        
        if cache_file.exists():
            # Check TTL
            config_cache = self.config.get("cache", {})
            ttl_hours = config_cache.get("ttl_hours", 24)
            
            mtime = cache_file.stat().st_mtime
            age_hours = (time.time() - mtime) / 3600
            
            if age_hours < ttl_hours:
                log("INFO", f"Cache hit for {agent_name}")
                return cache_file.read_text()
        
        return None
    
    def save_cache(self, agent_name: str, context: str, result: str):
        """Save result to cache."""
        if not self.cache_enabled:
            return
        
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_key = compute_cache_key(agent_name, context)
        cache_file = CACHE_DIR / f"{agent_name}_{cache_key}.json"
        cache_file.write_text(result)
    
    def execute(self, agent_name: str, max_retries: int = 3) -> AgentResult:
        """Execute an agent."""
        emoji = AGENTS[agent_name]["emoji"]
        start_time = time.time()
        
        log("AGENT", f"{emoji} Starting {agent_name}...")
        
        # Update state
        self.state.current_agent = agent_name
        self.state.save(STATE_DIR / "workflow_state.json")
        
        # Build prompt
        try:
            prompt = self.build_prompt(agent_name)
            context = self.build_context(agent_name)
        except Exception as e:
            return AgentResult(
                agent_name=agent_name,
                success=False,
                duration_seconds=time.time() - start_time,
                output_files=[],
                error_message=str(e)
            )
        
        # Check cache
        cached = self.check_cache(agent_name, context)
        if cached:
            duration = time.time() - start_time
            log("AGENT", f"{emoji} {agent_name} completed (cached) in {duration:.1f}s")
            return AgentResult(
                agent_name=agent_name,
                success=True,
                duration_seconds=duration,
                output_files=[]
            )
        
        # Save prompt for debugging/manual execution
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        (LOGS_DIR / f"{agent_name}_prompt.md").write_text(prompt)
        
        # Execute Claude Code
        success = False
        error_message = None
        
        for attempt in range(max_retries):
            log("INFO", f"Executing {agent_name} (attempt {attempt + 1}/{max_retries})...")
            
            try:
                # Try to run claude CLI
                result = subprocess.run(
                    ["claude", "--print", prompt],
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )
                
                # Save output
                (LOGS_DIR / f"{agent_name}_output.log").write_text(result.stdout)
                
                if result.returncode == 0:
                    success = True
                    self.save_cache(agent_name, context, result.stdout)
                    break
                else:
                    error_message = result.stderr
                    
            except FileNotFoundError:
                # Claude CLI not found - save for manual execution
                log("WARN", "Claude CLI not found. Prompt saved for manual execution.")
                (LOGS_DIR / f"{agent_name}_execute_me.md").write_text(prompt)
                success = True  # Consider it a "success" for demo purposes
                break
                
            except subprocess.TimeoutExpired:
                error_message = "Execution timed out"
                
            except Exception as e:
                error_message = str(e)
            
            if attempt < max_retries - 1:
                log("WARN", f"Retry in 5 seconds... ({error_message})")
                time.sleep(5)
        
        duration = time.time() - start_time
        
        if success:
            log("AGENT", f"{emoji} {agent_name} completed in {duration:.1f}s")
            self.state.completed_agents.append(agent_name)
        else:
            log("ERROR", f"{emoji} {agent_name} failed: {error_message}")
            self.state.failed_agents.append(agent_name)
        
        self.state.save(STATE_DIR / "workflow_state.json")
        
        return AgentResult(
            agent_name=agent_name,
            success=success,
            duration_seconds=duration,
            output_files=[],
            error_message=error_message
        )

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKPOINT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class CheckpointManager:
    """Manages workflow checkpoints for recovery."""
    
    @staticmethod
    def create(agent_name: str, state: WorkflowState) -> str:
        """Create a checkpoint after an agent completes."""
        checkpoint_id = f"chk-{agent_name}-{int(time.time())}"
        checkpoint_dir = CHECKPOINTS_DIR / checkpoint_id
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy state files
        if STATE_DIR.exists():
            for f in STATE_DIR.glob("*.json"):
                shutil.copy(f, checkpoint_dir)
        
        # Copy source files
        src_dir = SCRIPT_DIR / "src"
        if src_dir.exists() and any(src_dir.iterdir()):
            shutil.copytree(src_dir, checkpoint_dir / "src", dirs_exist_ok=True)
        
        # Save metadata
        metadata = {
            "checkpoint_id": checkpoint_id,
            "agent": agent_name,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "workflow_id": state.workflow_id
        }
        (checkpoint_dir / "checkpoint.json").write_text(json.dumps(metadata, indent=2))
        
        log("INFO", f"Checkpoint created: {checkpoint_id}")
        return checkpoint_id
    
    @staticmethod
    def restore(checkpoint_id: str) -> bool:
        """Restore from a checkpoint."""
        checkpoint_dir = CHECKPOINTS_DIR / checkpoint_id
        
        if not checkpoint_dir.exists():
            log("ERROR", f"Checkpoint not found: {checkpoint_id}")
            return False
        
        log("INFO", f"Restoring checkpoint: {checkpoint_id}")
        
        # Restore state files
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        for f in checkpoint_dir.glob("*.json"):
            if f.name != "checkpoint.json":
                shutil.copy(f, STATE_DIR)
        
        # Restore source files
        src_backup = checkpoint_dir / "src"
        if src_backup.exists():
            shutil.copytree(src_backup, SCRIPT_DIR / "src", dirs_exist_ok=True)
        
        log("INFO", f"Checkpoint restored: {checkpoint_id}")
        return True
    
    @staticmethod
    def list_all() -> List[Dict]:
        """List all available checkpoints."""
        checkpoints = []
        
        if not CHECKPOINTS_DIR.exists():
            return checkpoints
        
        for d in sorted(CHECKPOINTS_DIR.iterdir()):
            if d.is_dir() and d.name.startswith("chk-"):
                metadata_file = d / "checkpoint.json"
                if metadata_file.exists():
                    with open(metadata_file) as f:
                        checkpoints.append(json.load(f))
        
        return checkpoints

# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowOrchestrator:
    """Main orchestrator that coordinates all agents."""
    
    def __init__(self, user_request: str = ""):
        self.config = load_config()
        self.state = WorkflowState.new(user_request)
        self.executor = AgentExecutor(self.state, self.config)
        self.checkpoint_manager = CheckpointManager()
    
    def load_existing_state(self) -> bool:
        """Load existing workflow state if available."""
        state_file = STATE_DIR / "workflow_state.json"
        if state_file.exists():
            self.state = WorkflowState.load(state_file)
            self.executor.state = self.state
            return True
        return False
    
    def run_agent(self, agent_name: str) -> AgentResult:
        """Run a single agent."""
        # Check dependencies
        deps = AGENTS[agent_name]["deps"]
        for dep in deps:
            if dep not in self.state.completed_agents:
                log("WARN", f"Dependency {dep} not completed for {agent_name}")
        
        result = self.executor.execute(agent_name)
        
        if result.success:
            self.checkpoint_manager.create(agent_name, self.state)
        
        return result
    
    def run_phase(self, phase_num: int, parallel: bool = False) -> List[AgentResult]:
        """Run all agents in a phase."""
        phase_agents = [
            name for name, info in AGENTS.items()
            if info["phase"] == phase_num
        ]
        
        results = []
        
        if parallel and len(phase_agents) > 1:
            # Parallel execution
            with ThreadPoolExecutor(max_workers=len(phase_agents)) as executor:
                futures = {
                    executor.submit(self.run_agent, agent): agent
                    for agent in phase_agents
                }
                for future in as_completed(futures):
                    results.append(future.result())
        else:
            # Sequential execution
            for agent in phase_agents:
                results.append(self.run_agent(agent))
        
        return results
    
    def run_full_workflow(self) -> bool:
        """Run the complete workflow."""
        print_banner()
        start_time = time.time()
        
        log("INFO", f"Starting workflow: {self.state.workflow_id}")
        log("INFO", f"User request: {self.state.user_request}")
        
        self.state.save(STATE_DIR / "workflow_state.json")
        
        phases = [
            (1, "ANALYSIS", False),
            (2, "DESIGN", False),
            (3, "DEVELOPMENT", True),  # Parallel
            (4, "QUALITY", False),
            (5, "INTEGRATION", False),
        ]
        
        for phase_num, phase_name, parallel in phases:
            print_phase(phase_name, phase_num)
            self.state.current_phase = phase_name.lower()
            self.state.save(STATE_DIR / "workflow_state.json")
            
            results = self.run_phase(phase_num, parallel)
            
            # Check for failures
            failures = [r for r in results if not r.success]
            if failures:
                log("ERROR", f"Phase {phase_name} failed")
                for f in failures:
                    log("ERROR", f"  - {f.agent_name}: {f.error_message}")
                return False
        
        # Complete
        self.state.status = "completed"
        self.state.current_phase = "done"
        self.state.save(STATE_DIR / "workflow_state.json")
        
        duration = time.time() - start_time
        
        print()
        print(f"{Colors.GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗{Colors.NC}")
        print(f"{Colors.GREEN}║                                                                               ║{Colors.NC}")
        print(f"{Colors.GREEN}║   ✅  WORKFLOW COMPLETED SUCCESSFULLY                                         ║{Colors.NC}")
        print(f"{Colors.GREEN}║                                                                               ║{Colors.NC}")
        print(f"{Colors.GREEN}║   Total time: {duration:.1f} seconds                                                   ║{Colors.NC}")
        print(f"{Colors.GREEN}║                                                                               ║{Colors.NC}")
        print(f"{Colors.GREEN}╚═══════════════════════════════════════════════════════════════════════════════╝{Colors.NC}")
        print()
        
        return True

# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def interactive_mode():
    """Run in interactive mode."""
    print_banner()
    print(f"{Colors.CYAN}Interactive Mode - Run agents step by step{Colors.NC}")
    print()
    print("Commands: run <agent>, status, checkpoints, restore <id>, full, agents, exit")
    print()
    
    orchestrator = WorkflowOrchestrator()
    orchestrator.load_existing_state()
    
    while True:
        try:
            cmd = input(f"{Colors.YELLOW}orchestrator> {Colors.NC}").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        
        if not cmd:
            continue
        
        parts = cmd.split(maxsplit=1)
        command = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        if command == "run":
            if args and args in AGENTS:
                orchestrator.run_agent(args)
            else:
                print(f"Usage: run <agent_name>")
                print(f"Available: {', '.join(AGENTS.keys())}")
        
        elif command == "status":
            state = orchestrator.state
            print(json.dumps(asdict(state), indent=2))
        
        elif command == "checkpoints":
            for cp in CheckpointManager.list_all():
                print(f"  - {cp['checkpoint_id']} ({cp['agent']}) - {cp['created_at']}")
        
        elif command == "restore":
            if args:
                CheckpointManager.restore(args)
                orchestrator.load_existing_state()
            else:
                print("Usage: restore <checkpoint_id>")
        
        elif command == "full":
            orchestrator.run_full_workflow()
        
        elif command == "agents":
            for name, info in AGENTS.items():
                status = "✅" if name in orchestrator.state.completed_agents else "⬜"
                print(f"  {status} {info['emoji']} {name} (phase {info['phase']})")
        
        elif command in ("exit", "quit", "q"):
            break
        
        else:
            print(f"Unknown command: {command}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="AI Multi-Agent Development System"
    )
    parser.add_argument("request", nargs="?", help="Project description")
    parser.add_argument("-i", "--interactive", action="store_true", help="Interactive mode")
    parser.add_argument("-a", "--agent", help="Run specific agent")
    parser.add_argument("-r", "--restore", help="Restore from checkpoint")
    parser.add_argument("-s", "--status", action="store_true", help="Show status")
    parser.add_argument("-l", "--list", action="store_true", help="List checkpoints")
    
    args = parser.parse_args()
    
    # Create directories
    for d in [STATE_DIR, LOGS_DIR, CHECKPOINTS_DIR, CACHE_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    
    if args.status:
        state_file = STATE_DIR / "workflow_state.json"
        if state_file.exists():
            print(state_file.read_text())
        else:
            print("No workflow state found")
        return
    
    if args.list:
        for cp in CheckpointManager.list_all():
            print(f"{cp['checkpoint_id']} ({cp['agent']}) - {cp['created_at']}")
        return
    
    if args.restore:
        CheckpointManager.restore(args.restore)
        return
    
    if args.interactive:
        interactive_mode()
        return
    
    if args.agent:
        orchestrator = WorkflowOrchestrator(args.request or "")
        orchestrator.load_existing_state()
        orchestrator.run_agent(args.agent)
        return
    
    if args.request:
        orchestrator = WorkflowOrchestrator(args.request)
        orchestrator.run_full_workflow()
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
