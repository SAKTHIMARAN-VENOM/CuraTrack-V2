#!/usr/bin/env python3
"""
CuraTrack Git Hook Installer
Installs and configures Git pre-push hooks to enforce test passing before pushes.

Usage:
    python scripts/install_hooks.py
"""
import os
import sys
import subprocess
import stat

# Ensure UTF-8 output where possible
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    githooks_dir = os.path.join(root_dir, ".githooks")
    git_dir = os.path.join(root_dir, ".git")

    print("\n" + "=" * 70)
    print("  Installing CuraTrack Git Pre-Push Protection Hook")
    print("=" * 70)

    pre_push_src = os.path.join(githooks_dir, "pre-push")
    if not os.path.exists(pre_push_src):
        print(f"Error: Hook script not found at {pre_push_src}")
        return 1

    # Make executable on Unix/macOS/Linux
    try:
        st = os.stat(pre_push_src)
        os.chmod(pre_push_src, st.st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except Exception as e:
        print(f"Note: chmod skipped: {e}")

    # Set git core.hooksPath
    try:
        subprocess.run(["git", "config", "core.hooksPath", ".githooks"], cwd=root_dir, check=True)
        print("  [OK] Configured git core.hooksPath to .githooks")
    except Exception as e:
        print(f"Warning: Could not set git config core.hooksPath: {e}")

    # Also copy to .git/hooks/pre-push if .git exists (for maximum redundancy)
    git_hooks_target_dir = os.path.join(git_dir, "hooks")
    if os.path.exists(git_hooks_target_dir):
        target_file = os.path.join(git_hooks_target_dir, "pre-push")
        try:
            with open(pre_push_src, "r", encoding="utf-8") as src, open(target_file, "w", encoding="utf-8") as dst:
                dst.write(src.read())
            try:
                st = os.stat(target_file)
                os.chmod(target_file, st.st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            except Exception:
                pass
            print(f"  [OK] Copied pre-push hook to {target_file}")
        except Exception as e:
            print(f"Note: Direct copy to .git/hooks skipped: {e}")

    print("\n[SUCCESS] Pre-push hook is active! Every 'git push' will automatically run:")
    print("  * Python Backend Pytest Suite + Coverage")
    print("  * Website (Frontend Vitest) Suite")
    print("  * Mobile (Mobile Vitest) Suite")
    print("Pushes will be accepted IF AND ONLY IF all tests pass.\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
