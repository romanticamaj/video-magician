# -*- coding: utf-8 -*-
"""Project workspace manager.

One folder per video under projects/<slug>/ holds that project's raw footage,
staged assets, intermediates, deliverables, and the three gitignored data files
the engine reads. Exactly one project is "active": its assets sit in public/
and its data files sit at src/videoConfig.ts, src/subtitles.json,
tools/captions.json. Switching archives the active one first, so projects never
clobber each other.

  python tools/project.py new <slug> <raw file|folder> [...]
  python tools/project.py adopt <slug>      # give the current working state a home
  python tools/project.py activate <slug>
  python tools/project.py save              # archive active project, stay on it
  python tools/project.py list
"""
import io, os, shutil, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS = os.path.join(ROOT, "projects")
ACTIVE_MARK = os.path.join(ROOT, "local", "active_project")
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".mkv", ".avi", ".webm"}

# working path  ->  path inside the project folder
DATA_FILES = [
    ("src/videoConfig.ts", "videoConfig.ts"),
    ("src/subtitles.json", "subtitles.json"),
    ("tools/captions.json", "captions.json"),
]
# public/ entries that belong to a project (fonts/ is shared, never moved)
SHARED_PUBLIC = {"fonts"}


def p(*parts):
    return os.path.join(ROOT, *parts)


def proj(slug, *parts):
    return os.path.join(PROJECTS, slug, *parts)


def active():
    if os.path.exists(ACTIVE_MARK):
        s = open(ACTIVE_MARK, encoding="utf-8").read().strip()
        return s or None
    return None


def set_active(slug):
    os.makedirs(os.path.dirname(ACTIVE_MARK), exist_ok=True)
    open(ACTIVE_MARK, "w", encoding="utf-8").write(slug or "")


def ensure_dirs(slug):
    for d in ("raw", "assets", "work", "out"):
        os.makedirs(proj(slug, d), exist_ok=True)


def _copy_into(src, dst):
    if os.path.isdir(src):
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        shutil.copy2(src, dst)


def _sweep(src_dir, dest_dir, skip=()):
    """Copy a working directory's contents into the project, minus scratch."""
    if not os.path.isdir(src_dir):
        return 0
    n = 0
    for entry in os.listdir(src_dir):
        if entry.startswith("_") or entry in skip:
            continue  # scratch files the tools write and rewrite
        _copy_into(os.path.join(src_dir, entry), os.path.join(dest_dir, entry))
        n += 1
    return n


def archive(slug, quiet=False):
    """Copy the active working state back into its project folder."""
    ensure_dirs(slug)
    n = 0
    for work, dest in DATA_FILES:
        src = p(work)
        if os.path.exists(src):
            shutil.copy2(src, proj(slug, dest))
            n += 1
    # public/ assets (minus shared fonts), pipeline intermediates, deliverables
    n += _sweep(p("public"), proj(slug, "assets"), skip=SHARED_PUBLIC)
    n += _sweep(p("local"), proj(slug, "work"), skip={"active_project"})
    n += _sweep(p("out"), proj(slug, "out"))
    if not quiet:
        print(f"archived {n} items -> projects/{slug}/")
    return n


def clear_working():
    for work, _ in DATA_FILES:
        if os.path.exists(p(work)):
            os.remove(p(work))
    if os.path.isdir(p("public")):
        for entry in os.listdir(p("public")):
            if entry in SHARED_PUBLIC:
                continue
            path = p("public", entry)
            shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)


def stage(slug):
    """Copy a project's data + assets into the working locations."""
    os.makedirs(p("public"), exist_ok=True)
    n = 0
    for work, src_name in DATA_FILES:
        src = proj(slug, src_name)
        if os.path.exists(src):
            os.makedirs(os.path.dirname(p(work)), exist_ok=True)
            shutil.copy2(src, p(work))
            n += 1
    adir = proj(slug, "assets")
    if os.path.isdir(adir):
        for entry in os.listdir(adir):
            src, dst = os.path.join(adir, entry), p("public", entry)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)
            n += 1
    set_active(slug)
    print(f"active project: {slug}  ({n} items staged)")
    raws = sorted(os.listdir(proj(slug, "raw"))) if os.path.isdir(proj(slug, "raw")) else []
    if raws:
        print("raw footage:", ", ".join(raws))


def cmd_new(args):
    slug, sources = args[0], args[1:]
    if os.path.isdir(proj(slug)):
        sys.exit(f"projects/{slug}/ already exists — use activate, or pick another name")
    guard_untracked()
    ensure_dirs(slug)
    copied = []
    for s in sources:
        s = os.path.abspath(s)
        if os.path.isdir(s):
            for f in sorted(os.listdir(s)):
                if os.path.splitext(f)[1].lower() in VIDEO_EXT:
                    shutil.copy2(os.path.join(s, f), proj(slug, "raw", f))
                    copied.append(f)
        elif os.path.exists(s):
            shutil.copy2(s, proj(slug, "raw", os.path.basename(s)))
            copied.append(os.path.basename(s))
        else:
            print(f"!! not found, skipped: {s}")
    if not copied:
        print("!! no footage copied — put files into projects/%s/raw/ manually" % slug)
    open(proj(slug, "NOTES.md"), "w", encoding="utf-8").write(
        f"# {slug}\n\n## 需求\n\n（使用者的 brief）\n\n## 決策\n\n## 交付\n")
    if cur := active():
        archive(cur)
    clear_working()
    for f in copied:
        shutil.copy2(proj(slug, "raw", f), p("public", f))
    set_active(slug)
    print(f"created projects/{slug}/ with {len(copied)} clip(s): {', '.join(copied) or '—'}")
    print(f"active project: {slug}")


def guard_untracked():
    if active() is None and any(os.path.exists(p(w)) for w, _ in DATA_FILES):
        sys.exit("working state belongs to an unnamed project.\n"
                 "run:  python tools/project.py adopt <slug>   (give it a home first)")


def cmd_adopt(args):
    slug = args[0]
    ensure_dirs(slug)
    archive(slug)
    if not os.path.exists(proj(slug, "NOTES.md")):
        open(proj(slug, "NOTES.md"), "w", encoding="utf-8").write(f"# {slug}\n\n## 需求\n\n## 決策\n\n## 交付\n")
    # footage already in public/ is this project's raw material
    for entry in os.listdir(proj(slug, "assets")) if os.path.isdir(proj(slug, "assets")) else []:
        if os.path.splitext(entry)[1].lower() in VIDEO_EXT:
            src = proj(slug, "assets", entry)
            if not os.path.exists(proj(slug, "raw", entry)):
                shutil.copy2(src, proj(slug, "raw", entry))
    set_active(slug)
    print(f"adopted current working state as projects/{slug}/ (active)")


def cmd_activate(args):
    slug = args[0]
    if not os.path.isdir(proj(slug)):
        sys.exit(f"no such project: projects/{slug}/")
    guard_untracked()
    if cur := active():
        if cur == slug:
            print(f"{slug} is already active — re-staging")
        else:
            archive(cur)
    clear_working()
    stage(slug)


def cmd_save(args):
    cur = active()
    if not cur:
        sys.exit("no active project — run adopt <slug> first")
    archive(cur)


def cmd_list(args):
    cur = active()
    if not os.path.isdir(PROJECTS):
        print("no projects yet — python tools/project.py new <slug> <raw...>")
        return
    for slug in sorted(os.listdir(PROJECTS)):
        if not os.path.isdir(proj(slug)):
            continue
        raws = os.listdir(proj(slug, "raw")) if os.path.isdir(proj(slug, "raw")) else []
        outs = os.listdir(proj(slug, "out")) if os.path.isdir(proj(slug, "out")) else []
        mark = "* " if slug == cur else "  "
        print(f"{mark}{slug:<28} raw:{len(raws):<3} out:{len(outs)}")
    if cur:
        print(f"\n* = active ({cur})")


CMDS = {"new": cmd_new, "adopt": cmd_adopt, "activate": cmd_activate,
        "save": cmd_save, "list": cmd_list}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        sys.exit(__doc__)
    args = sys.argv[2:]
    if sys.argv[1] in ("new", "adopt", "activate") and not args:
        sys.exit(f"usage: python tools/project.py {sys.argv[1]} <slug> ...")
    CMDS[sys.argv[1]](args)
