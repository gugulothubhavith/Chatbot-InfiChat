"""Sandbox service — executes code in isolated environments.

Supports two backends:
1. Docker containers (production, fully isolated)
2. Local subprocess (development, Python only, uses AST validation)

Auto-detects Docker availability and degrades gracefully.
"""

import logging
import asyncio
import os
from datetime import datetime, timezone
import json
import uuid
from app.core.config import settings
from app.core.security import validate_code_safety

logger = logging.getLogger(__name__)

# Docker client — lazy init
docker_client = None

# Check Docker availability once
_HAS_DOCKER = False
try:
    import docker as docker_module
    _HAS_DOCKER = True
except ImportError:
    logger.info("Docker SDK not installed — sandbox will use local subprocess execution")

LANGUAGE_CONFIG = {
    "python": {
        "image": "python:3.11-slim",
        "filename": "script.py",
        "cmd": ["python", "script.py"],
        "extensions": [".py"],
    },
    "javascript":  {
        "image": "node:20-slim",
        "filename": "script.js",
        "cmd":  ["node", "script.js"],
        "extensions": [".js"],
    },
    "typescript": {
        "image": "oven/bun:1",
        "filename": "script.ts",
        "cmd": ["bun", "run", "script.ts"],
        "extensions": [".ts"],
    },
    "bash": {
        "image": "ubuntu:22.04",
        "filename":  "script.sh",
        "cmd": ["bash", "script.sh"],
        "extensions": [".sh"],
    },
    "java": {
        "image": "openjdk:21-slim",
        "filename":  "Main.java",
        "cmd":  ["java", "Main"],
        "extensions": [".java"],
    },
    "cpp": {
        "image": "gcc:13",
        "filename": "main.cpp",
        "cmd":  ["sh", "-c", "g++ main.cpp -o a.out && ./a.out"],
        "extensions":  [".cpp", ".cc"],
    },
    "go": {
        "image": "golang:1.21-alpine",
        "filename": "main.go",
        "cmd": ["go", "run", "main.go"],
        "extensions": [".go"],
    },
    "rust": {
        "image": "rust:1.75-slim",
        "filename": "main.rs",
        "cmd": ["sh", "-c", "rustc main.rs && ./main"],
        "extensions": [".rs"],
    },
    "php": {
        "image": "php:8.2-cli-alpine",
        "filename": "script.php",
        "cmd": ["php", "script.php"],
        "extensions": [".php"],
    },
}

async def execute_in_sandbox(
    code: str,
    language: str,
    user_id: str,
    timeout: int = 30
) -> str:
    """
    Execute code in isolated Docker container
    Returns stdout + stderr
    """
    
    # Validate language
    if language not in LANGUAGE_CONFIG:
        return json.dumps({
            "status": "error",
            "message": f"Unsupported language: {language}",
            "output": ""
        })
    
    # Validate code safety
    if not validate_code_safety(code, language):
        # Fire background alert dispatch to the Admin
        try:
            from app.services.email_service import send_security_alert_email
            from app.core.config import settings
            # We use an asyncio task here so we don't block the immediate return error
            asyncio.create_task(
                asyncio.to_thread(
                    send_security_alert_email,
                    to_email=settings.SMTP_USER, # Main Platform Admin Default
                    threat_type="Sandbox Exploit Attempt Blocked",
                    details={
                        "ip_address": "Internal Agent Subnet",
                        "user_agent": f"CodeAgent Client (User ID: {user_id})",
                        "action_blocked": code[:200]
                    }
                )
            )
        except Exception as e:
            logger.error(f"Failed to dispatch AST alert: {e}")
            
        return json.dumps({
            "status": "error",
            "message": "Code contains dangerous operations blocked by Zero-Trust AST Validator",
            "output": ""
        })
    
    # Initialize Docker client (lazy)
    client = None
    init_errors = []

    if _HAS_DOCKER:
        try:
            import docker as docker_mod
            client = docker_mod.APIClient(base_url='unix://var/run/docker.sock')
            client.version()
            logger.info("Connected to Docker via unix socket (APIClient)")
        except Exception as e:
            init_errors.append(f"docker: {e}")
            client = None
    else:
        init_errors.append("docker SDK not installed")

    if not client:
        logger.warning(f"Docker unavailable ({init_errors[0] if init_errors else 'unknown'}). Fallback: local subprocess.")
        logger.warning("SECURITY: Running code via subprocess without container isolation.")
        
        if language == "python":
            import subprocess
            import tempfile
            
            try:
                # Write code to temp file
                with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode='w') as f:
                    f.write(code)
                    temp_path = f.name
                
                # Execute with mocked input for input() support
                # We pipe a generic set of numbers/strings so simple input() calls succeed.
                mock_input = "10\n20\n30\n40\n50\nHello\nWorld\n"
                
                start_time = datetime.now(timezone.utc)
                process = subprocess.Popen(
                    ["python", temp_path],
                    stdin=subprocess.PIPE,  # Enable stdin piping
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                try:
                    # Provide the mocked input to stdin
                    stdout, stderr = process.communicate(input=mock_input, timeout=timeout)
                    exit_code = process.returncode
                except subprocess.TimeoutExpired:
                    process.kill()
                    stdout, stderr = process.communicate()
                    return json.dumps({
                        "status": "timeout",
                        "message": f"Execution exceeded {timeout}s timeout",
                        "output": stdout + "\n" + stderr
                    })
                
                # Cleanup
                os.unlink(temp_path)
                
                return json.dumps({
                    "status": "success" if exit_code == 0 else "error",
                    "exit_code": exit_code,
                    "output": stdout + stderr,
                    "execution_time_ms": int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000),
                })
                
            except Exception as localsub_e:
                 return json.dumps({
                    "status": "error",
                    "message": f"Local execution failed: {localsub_e}",
                    "output": ""
                })
        else:
             return json.dumps({
                "status": "error",
                "message": f"Docker unavailable and local execution not supported for {language}",
                "output": ""
            })

    # ── Docker Execution ──
    config = LANGUAGE_CONFIG[language]
    sandbox_id = str(uuid.uuid4())[:8]
    container_name = f"sandbox-{user_id}-{sandbox_id}"
    
    try:
        logger.info(f"Starting sandbox for {language}")
        
        # Create container
        try:
            # Check if image exists, pull if not
            try:
                client.inspect_image(config["image"])
            except Exception:
                logger.info(f"Image {config['image']} not found locally. Pulling...")
                client.pull(config["image"])
                logger.info(f"Successfully pulled {config['image']}")

            host_config = client.create_host_config(
                mem_limit=settings.SANDBOX_MAX_MEMORY,
                memswap_limit=settings.SANDBOX_MAX_MEMORY,
                cpu_quota=80000,
                cpu_period=100000,
                tmpfs={"/tmp": "size=100M"},
                pids_limit=50,  # Prevent fork bombs
                blkio_weight=500,  # Balance IO priority
                network_mode="none" 
            )

            container = client.create_container(
                image=config["image"],
                command=config["cmd"],
                name=container_name,
                working_dir="/tmp",
                host_config=host_config,
                stdin_open=False,
                detach=True,
                tty=False
            )
        except Exception as e:
            logger.error(f"Failed to create container: {e}")
            return json.dumps({
                "status": "error",
                "message": f"Sandbox initialization failed: {e}",
                "output": ""
            })
        
        container_id = container.get('Id')
        
        # Write code into container (put_archive is same on low-level)
        client.put_archive(
            container_id,
            "/tmp",
            _create_tar_code(code, config["filename"])
        )
        
        # Execute
        start_time = datetime.now(timezone.utc)
        client.start(container_id)
        
        # Wait
        exit_code = 1
        try:
            # wait() in APIClient returns a dictionary
            wait_result = client.wait(container_id)
            exit_code = wait_result.get('StatusCode', 1)
        except Exception as e:
            logger.error(f"Wait failed: {e}")

        # Get logs
        # logs() returns bytes
        logs = client.logs(container_id, stdout=True, stderr=True).decode("utf-8", errors="ignore")
        
        logger.info(f"Sandbox execution completed:  {language} ({exit_code})")
        
        return json.dumps({
            "status": "success" if exit_code == 0 else "error",
            "exit_code": exit_code,
            "output": logs,
            "execution_time_ms": int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000),
        })
        
    except Exception as e:
        logger.error(f"Sandbox error: {e}")
        return json.dumps({
            "status":  "error",
            "message":  str(e),
            "output": ""
        })
    finally:
        # Cleanup
        try:
            if 'container_id' in locals():
                client.remove_container(container_id, force=True)
        except Exception:
            pass

def _create_tar_code(code: str, filename: str) -> bytes:
    """Create tar archive with code file"""
    import tarfile
    import io
    
    tar_buffer = io.BytesIO()
    tar = tarfile.open(fileobj=tar_buffer, mode="w")
    
    # Add code file
    code_bytes = code.encode("utf-8")
    tarinfo = tarfile.TarInfo(name=filename)
    tarinfo.size = len(code_bytes)
    tar.addfile(tarinfo, io.BytesIO(code_bytes))
    
    tar.close()
    tar_buffer.seek(0)
    return tar_buffer.read()