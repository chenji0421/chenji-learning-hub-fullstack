#!/usr/bin/env python3
"""从 backups/ 目录恢复 SQLite 数据库（chenji_hub.db）。

用法：
    python scripts/restore_db.py                 # 用最新备份恢复（会先确认）
    python scripts/restore_db.py --backup 文件名  # 用指定备份恢复
    python scripts/restore_db.py --yes           # 跳过确认
    python scripts/restore_db.py --list          # 只列出可用备份，不恢复

安全机制：恢复前会把当前数据库自动备份到 backups/（chenji_hub_pre_restore_*），
万一恢复错了还能反悔。恢复会覆盖 backend/chenji_hub.db，操作前请确认。
"""
import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKUP_DIR = PROJECT_ROOT / "backups"

# 默认候选数据库路径（顺序探测，取第一个存在的；都不存在则用 backend 下的）
DEFAULT_DB_CANDIDATES = [
    PROJECT_ROOT / "backend" / "chenji_hub.db",
    PROJECT_ROOT / "chenji_hub.db",
]


def find_database() -> Path:
    for candidate in DEFAULT_DB_CANDIDATES:
        if candidate.exists():
            return candidate
    # 数据库还不存在也没关系——恢复本身就是创建它
    return PROJECT_ROOT / "backend" / "chenji_hub.db"


def list_backups() -> list[Path]:
    """正式备份列表（按文件名升序，即按时间从旧到新）。"""
    return sorted(BACKUP_DIR.glob("chenji_hub_[0-9]*.db"))


def backup_current(db_path: Path) -> None:
    """恢复前把当前数据库留个底，防止误恢复后无法反悔。"""
    if not db_path.exists():
        return
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pre = BACKUP_DIR / f"chenji_hub_pre_restore_{stamp}.db"
    shutil.copy2(db_path, pre)
    print(f"  已保存当前数据库副本：{pre.name}")


def clean_wal_files(db_path: Path) -> None:
    """恢复前清掉旧 -wal / -shm，避免和恢复出来的主文件状态不一致。"""
    for suffix in ("-wal", "-shm"):
        leftover = Path(str(db_path) + suffix)
        if leftover.exists():
            leftover.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="从 backups/ 恢复 SQLite 数据库")
    parser.add_argument("--backup", help="备份文件名（不填则用最新的）")
    parser.add_argument("--yes", action="store_true", help="跳过恢复确认")
    parser.add_argument("--list", action="store_true", help="只列出可用备份，不恢复")
    args = parser.parse_args()

    backups = list_backups()

    if args.list:
        if not backups:
            print("backups/ 目录下还没有任何备份。先运行：python scripts/backup_db.py")
            return
        print("可用的备份：")
        for i, b in enumerate(backups, 1):
            size_kb = b.stat().st_size / 1024
            print(f"  {i}. {b.name}（{size_kb:.1f} KB）")
        return

    if not backups:
        sys.exit("✗ backups/ 目录下没有备份。先运行：python scripts/backup_db.py")

    if args.backup:
        chosen = BACKUP_DIR / args.backup
        if not chosen.exists():
            sys.exit(f"✗ 找不到备份：{args.backup}（备份都在 backups/ 目录下）")
    else:
        chosen = backups[-1]  # 最新的

    db_path = find_database()
    print(f"  将用 {chosen.name} 恢复到：{db_path.relative_to(PROJECT_ROOT)}")

    if not args.yes:
        answer = input("  这会覆盖当前数据库，确认继续？[y/N] ").strip().lower()
        if answer not in ("y", "yes"):
            print("  已取消。")
            return

    backup_current(db_path)
    clean_wal_files(db_path)

    db_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(chosen, db_path)
    print(f"✓ 恢复完成：{db_path.relative_to(PROJECT_ROOT)}")

    pre_files = sorted(BACKUP_DIR.glob("chenji_hub_pre_restore_*.db"))
    if pre_files:
        print(f"  如需反悔，可恢复：{pre_files[-1].name}")


if __name__ == "__main__":
    main()
