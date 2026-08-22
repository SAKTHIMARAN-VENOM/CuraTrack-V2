#!/usr/bin/env python3
"""
CuraTrack Pre-Push Verification Suite
Runs full API unit tests, security verifications, and project structure audits.
Usage:
    python tests/run_all_tests.py
    pytest tests/
"""
import os
import sys
import subprocess
import time

def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def main():
    start_time = time.time()
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(tests_dir)

    print_header("[CURATRACK PRE-PUSH VERIFICATION SUITE]")
    print(f"Target Directory: {root_dir}")
    print("Executing automated API, security, and project tests...\n")

    # Run Pytest
    cmd = [sys.executable, "-m", "pytest", tests_dir, "-v", "--tb=short"]
    result = subprocess.run(cmd, cwd=root_dir)

    elapsed = time.time() - start_time
    print_header("[TEST SUMMARY]")
    if result.returncode == 0:
        print(f"SUCCESS: ALL TESTS PASSED in {elapsed:.2f}s!")
        print("Your changes are safe to push to production.")
        return 0
    else:
        print(f"FAILURE: TEST FAILURES DETECTED in {elapsed:.2f}s.")
        print("Please fix the issues above before pushing to GitHub.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
