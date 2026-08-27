#!/usr/bin/env python3
"""
CuraTrack Master Automated Verification Suite & Pre-Push Enforcer
Runs full Backend (Pytest + Coverage), Website (Vitest), and Mobile (Vitest) suites.

Usage:
    python tests/run_all_tests.py
    python tests/run_all_tests.py --quick
    python tests/run_all_tests.py --with-build
"""
import os
import sys
import subprocess
import time
import argparse

# Ensure UTF-8 output where possible
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def print_banner(title: str, fill: str = "="):
    print("\n" + fill * 75)
    print(f"  {title}")
    print(fill * 75)

def run_step(step_name: str, cmd: list, cwd: str) -> bool:
    print_banner(f"RUNNING: {step_name}", "-")
    print(f"Command: {' '.join(cmd)}")
    print(f"Directory: {cwd}\n")
    start = time.time()
    try:
        use_shell = sys.platform == "win32" and cmd[0] in ("npm", "npx", "npm.cmd", "npx.cmd")
        result = subprocess.run(cmd, cwd=cwd, shell=use_shell)
        elapsed = time.time() - start
        if result.returncode == 0:
            print(f"\n[PASS] {step_name} completed successfully in {elapsed:.2f}s.")
            return True
        else:
            print(f"\n[FAIL] {step_name} failed with exit code {result.returncode} ({elapsed:.2f}s).")
            return False
    except Exception as e:
        print(f"\n[ERROR] Failed to execute {step_name}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="CuraTrack Master Test Runner")
    parser.add_argument("--with-build", action="store_true", help="Also validate production builds for frontend and mobile")
    parser.add_argument("--backend-only", action="store_true", help="Run only Python backend tests")
    parser.add_argument("--frontend-only", action="store_true", help="Run only Website tests")
    parser.add_argument("--mobile-only", action="store_true", help="Run only Mobile tests")
    args = parser.parse_args()

    overall_start = time.time()
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(root_dir, "frontend")
    mobile_dir = os.path.join(root_dir, "mobile")

    print_banner("[CURATRACK MASTER AUTOMATED TEST SUITE & PUSH ENFORCER]")
    print(f"Workspace Root: {root_dir}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    # 1. Backend Python Tests
    if not (args.frontend_only or args.mobile_only):
        backend_python = sys.executable
        possible_venvs = [
            os.path.join(root_dir, "backend", ".venv", "Scripts", "python.exe"),
            os.path.join(root_dir, ".venv", "Scripts", "python.exe"),
            os.path.join(root_dir, "backend", ".venv", "bin", "python"),
            os.path.join(root_dir, ".venv", "bin", "python"),
        ]
        for venv_py in possible_venvs:
            if os.path.exists(venv_py):
                backend_python = venv_py
                break
        pytest_cmd = [backend_python, "-m", "pytest", "tests/", "-v", "--tb=short"]
        results["Backend (Python Pytest + Coverage)"] = run_step("Backend Pytest Suite", pytest_cmd, root_dir)

    # 2. Website Frontend Tests
    if not (args.backend_only or args.mobile_only):
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_test_cmd = [npm_cmd, "test"]
        results["Website (Frontend Vitest)"] = run_step("Website Vitest Suite", frontend_test_cmd, frontend_dir)

    # 3. Mobile App Tests
    if not (args.backend_only or args.frontend_only):
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        mobile_test_cmd = [npm_cmd, "test"]
        results["Mobile (Mobile Vitest)"] = run_step("Mobile Vitest Suite", mobile_test_cmd, mobile_dir)

    # 4. Optional Production Build Validation
    if args.with_build:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        results["Website Production Build"] = run_step("Website Next.js Build", [npm_cmd, "run", "build"], frontend_dir)
        results["Mobile Production Build"] = run_step("Mobile Next.js Build", [npm_cmd, "run", "build"], mobile_dir)

    # Final Summary Report
    total_elapsed = time.time() - overall_start
    print_banner("[AUTOMATED TEST SUITE EXECUTION SUMMARY]")
    all_passed = True
    for suite_name, passed in results.items():
        status = "[PASSED]" if passed else "[FAILED]"
        print(f"  * {suite_name:<40} : {status}")
        if not passed:
            all_passed = False

    print("-" * 75)
    if all_passed:
        print(f"\nSUCCESS: ALL {len(results)} TEST SUITES PASSED in {total_elapsed:.2f}s!")
        print("Status: APPROVED FOR GIT PUSH & PRODUCTION DEPLOYMENT.\n")
        return 0
    else:
        print(f"\nFAILURE: TEST FAILURES DETECTED in {total_elapsed:.2f}s!")
        print("Status: PUSH BLOCKED. Fix the failing test suites above before pushing to GitHub.\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
