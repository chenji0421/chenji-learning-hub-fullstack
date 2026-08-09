#!/usr/bin/env python3
"""备份 SQLite 数据库（chenji_hub.db）到项目根目录的 backups/ 文件夹。

用法：
    python scripts/backup_db.py                  # 自动探测数据库并备份
    python scripts/backup_db.py --db path/to.db  # 指定数据库文件
    python scripts/backup_db.py --keep 30        # 只保留最近 30 份备份

数据（文章 / 计划 / 用户）都存在 backend/chenji_hub.db，把它复制到
backups/ 就能留下一个可恢复的快照。建议配合任务计划定期运行。
"""
import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

# scripts/backup_db.py -> scripts -> 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 默认候选数据库路径（顺序探测，取第一个存在的）
DEFAULT_DB_CANDIDATES = [
    PROJECT_ROOT / "backend" / "chenji_hub.db",
    PROJECT_ROOT / "chenji_hub.db",
]


def find_database(explicit: str | None) -> Path:
    """定位数据库文件：优先用 --db 参数，否则按候选路径自动探测。"""
    if explicit:
        db_path = Path(explicit)
        if not db_path.is_absolute():
            db_path = PROJECT_ROOT / db_path
        if not db_path.exists():
            sys.exit(f"✗ 找不到数据库文件：{db_path}")
        return db_path

    for candidate in DEFAULT_DB_CANDIDATES:
        if candidate.exists():
            return candidate

    sys.exit(
        "✗ 未找到数据库文件，请用 --db 指定，例如：\n"
        "  python scripts/backup_db.py --db backend/chenji_hub.db"
    )


def backup_wal_files(db_path: Path, backup_dir: Path, base_name: str) -> bool:
    """SQLite 处于 WAL 模式时，-wal / -shm 里有尚未落盘的写入，需要一并备份。

    返回是否检测到了 WAL 文件。
    """
    found = False
    for suffix in ("-wal", "-shm"):
        wal = Path(str(db_path) + suffix)
        if wal.exists():
            shutil.copy2(wal, backup_dir / f"{base_name}.db{suffix}")
            found = True
    return found


def prune_old_backups(backup_dir: Path, keep: int) -> None:
    """只保留最近 keep 份正式备份（旧的删除），keep <= 0 表示全部保留。"""
    if keep <= 0:
        return
    # [0-9] 开头只匹配正式备份（chenji_hub_20260809_120000.db），
    # 不会误删恢复前自动留底的 chenji_hub_pre_restore_*.db
    backups = sorted(backup_dir.glob("chenji_hub_[0-9]*.db"))
    for old in backups[:-keep]:
        old.unlink()
        print(f"  清理旧备份：{old.name}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="备份 SQLite 数据库到 backups/ 目录"
    )
    parser.add_argument(
        "--db", help="数据库文件路径（默认自动探测 backend/chenji_hub.db）"
    )
    parser.add_argument(
        "--keep", type=int, default=0,
        help="只保留最近 N 份备份，0 表示全部保留（默认 0）",
    )
    args = parser.parse_args()

    db_path = find_database(args.db)
    backup_dir = PROJECT_ROOT / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"chenji_hub_{stamp}"
    target = backup_dir / f"{base_name}.db"

    shutil.copy2(db_path, target)

    wal_mode = backup_wal_files(db_path, backup_dir, base_name)
    prune_old_backups(backup_dir, args.keep)

    size_kb = target.stat().st_size / 1024
    print(f"✓ 备份完成：{target.relative_to(PROJECT_ROOT)}（{size_kb:.1f} KB）")
    if wal_mode:
        print("  ⚠ 检测到 WAL 模式的 -wal/-shm 文件，已一并备份")

    count = len(list(backup_dir.glob("chenji_hub_[0-9]*.db")))
    print(f"  backups/ 下现有 {count} 份正式备份")


if __name__ == "__main__":
    main()
