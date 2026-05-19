# SO-101 runbook

Fork: `https://github.com/siddharthanpr/lerobot` · branch `dryrun/teleop`

| | |
|--|--|
| Leader port | `/dev/tty.usbmodem5B421342001` |
| Follower port | `/dev/tty.usbmodem5B421342441` |
| Leader id | `my_leader_arm` |
| Follower id | `my_follower_arm` |
| HF user | `siddpr` |
| Wrist camera | OpenCV index **0** (only camera) |
| Calibration | `calibration/` in repo |
| Active dataset (local + Hub) | `siddpr/my_vla_task_20260519_144738` |
| Dataset root | `~/.cache/huggingface/lerobot/siddpr/my_vla_task_20260519_144738` |

Every new terminal:

```bash
cd /Users/sid/repos/lerobot && source .venv/bin/activate
```

---

## 1. Install (done once)

```bash
uv python install 3.12
uv venv --python 3.12
source .venv/bin/activate
brew install ffmpeg
uv pip install -e .
uv pip install -e ".[feetech]"
```

---

## 2. Motor setup (done once per arm)

Find ports: `lerobot-find-port` (unplug arm when asked).

**Leader** — one motor at a time, gripper/trigger first:

```bash
lerobot-setup-motors \
    --teleop.type=so101_leader \
    --teleop.port=/dev/tty.usbmodem5B421342001
```

**Follower:**

```bash
lerobot-setup-motors \
    --robot.type=so101_follower \
    --robot.port=/dev/tty.usbmodem5B421342441
```

---

## 3. Calibrate (done once; redo only if needed)

Type `c` + Enter only to **recalibrate**. Otherwise press **Enter** to load saved JSON from `calibration/`.

```bash
lerobot-calibrate \
    --teleop.type=so101_leader \
    --teleop.port=/dev/tty.usbmodem5B421342001 \
    --teleop.id=my_leader_arm
```

```bash
lerobot-calibrate \
    --robot.type=so101_follower \
    --robot.port=/dev/tty.usbmodem5B421342441 \
    --robot.id=my_follower_arm
```

Middle pose → Enter → sweep all joints (including wrist_roll) → Enter.

---

## 4. Teleop test

Stop other arm processes first (`Ctrl+C`).

```bash
lerobot-teleoperate \
    --robot.type=so101_follower \
    --robot.port=/dev/tty.usbmodem5B421342441 \
    --robot.id=my_follower_arm \
    --teleop.type=so101_leader \
    --teleop.port=/dev/tty.usbmodem5B421342001 \
    --teleop.id=my_leader_arm
```

---

## 5. Record demos (VLA training data)

**What this does:** You teleop with the leader; LeRobot saves joint data + wrist video + task text. That dataset is used to fine-tune SmolVLA later. The text prompt alone is not enough without these demos.

**Before recording:**

```bash
uv pip install pynput          # keyboard: → next episode, ← redo, ESC stop
hf auth login                  # once
```

**macOS — enable keyboard controls:** System Settings → Privacy & Security → **Accessibility** → enable **Terminal** (or Cursor). Quit and reopen the app. Without this, `→` / `ESC` do nothing (only the 30s timer works).

| Key | Action |
|-----|--------|
| `→` | End episode early → start reset |
| `←` | Redo last episode |
| `ESC` | Finish all recording and upload to Hub |

Do not use `Ctrl+C` to finish — use `ESC`.

### `display_data`: when to use which

| | `--display_data=true` | `--display_data=false` |
|--|----------------------|------------------------|
| **Use when** | Debugging camera angle, first few test episodes, checking the wrist view looks right | **Real recording sessions** (50 episodes), MacBook Air, any time you see FPS warnings |
| **Pros** | Live Rerun preview of camera + robot state | Less CPU load, fewer dropped frames, smoother teleop |
| **Cons** | Heavy on laptop CPU; can cause "running slower than 30 Hz" warnings | No live video window — trust the saved dataset or spot-check with a short `true` run first |

**Recommendation:** Run 1–2 episodes with `true` to verify framing/focus, then switch to `false` for the full dataset.

Both commands below use the same Mac-friendly encoding settings (`streaming_encoding`, `encoder_threads`, `vcodec=auto`). If you still get FPS warnings, change `fps` to `20` in **both** `--dataset.fps` and inside `--robot.cameras`.

### Record with preview (`display_data=true`)

```bash
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --teleop.type=so101_leader \
  --teleop.port=/dev/tty.usbmodem5B421342001 \
  --teleop.id=my_leader_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 20} }" \
  --dataset.repo_id=siddpr/my_vla_task \
  --dataset.single_task="Pick up the object and place it in the bin." \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.fps=20 \
  --dataset.streaming_encoding=true \
  --dataset.encoder_threads=2 \
  --dataset.vcodec=auto \
  --display_data=true
```

### Record without preview (`display_data=false`) — preferred on MacBook Air

```bash
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --teleop.type=so101_leader \
  --teleop.port=/dev/tty.usbmodem5B421342001 \
  --teleop.id=my_leader_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 20} }" \
  --dataset.repo_id=siddpr/my_vla_task \
  --dataset.single_task="Pick up the object and place it in the bin." \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.fps=20 \
  --dataset.streaming_encoding=true \
  --dataset.encoder_threads=2 \
  --dataset.vcodec=auto \
  --display_data=false
```

### Dataset naming and resume

Each **new** `lerobot-record` (without `--resume=true`) auto-stamps the repo id, e.g. `siddpr/my_vla_task` → `siddpr/my_vla_task_20260519_144738`, and saves under:

`~/.cache/huggingface/lerobot/siddpr/my_vla_task_<timestamp>/`

**Continue the same dataset** (append episodes 3, 4, … toward 50):

```bash
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --teleop.type=so101_leader \
  --teleop.port=/dev/tty.usbmodem5B421342001 \
  --teleop.id=my_leader_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 20} }" \
  --dataset.repo_id=siddpr/my_vla_task_20260519_144738 \
  --dataset.root=/Users/sid/.cache/huggingface/lerobot/siddpr/my_vla_task_20260519_144738 \
  --dataset.single_task="Pick up the object and place it in the bin." \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.fps=20 \
  --dataset.streaming_encoding=true \
  --dataset.encoder_threads=2 \
  --dataset.vcodec=auto \
  --display_data=false \
  --resume=true
```

**Tips:** Use `←` to redo a bad episode before it is saved. Do **not** press `ESC` mid-episode (saves a short partial episode). Use `ESC` only when done with the whole session.

### Delete a bad episode from a dataset

Requires `[dataset]` extra: `uv pip install -e ".[dataset]"`

```bash
lerobot-edit-dataset \
  --repo_id siddpr/my_vla_task_20260519_144738 \
  --root /Users/sid/.cache/huggingface/lerobot/siddpr/my_vla_task_20260519_144738 \
  --new_repo_id siddpr/my_vla_task_20260519_144738 \
  --operation.type delete_episodes \
  --operation.episode_indices "[3]" \
  --push_to_hub true
```

Replace `[3]` with the episode index to remove.

### Replay a recorded episode (no trained policy)

```bash
lerobot-replay \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --dataset.repo_id=siddpr/my_vla_task_20260519_144738 \
  --dataset.root=/Users/sid/.cache/huggingface/lerobot/siddpr/my_vla_task_20260519_144738 \
  --dataset.episode=0
```

---

## 6. Train SmolVLA

**Wrist-only + SmolVLA:** `smolvla_base` expects three image slots (`camera1`–`camera3`). Map your wrist stream and mask the unused slots (same flags for train **and** rollout).

```bash
uv pip install -e ".[smolvla]"
```

Shared flags (single wrist camera):

```text
--rename_map='{"observation.images.wrist": "observation.images.camera1"}'
--policy.empty_cameras=2
```

Optional: map wrist → `camera3` instead (closer to some HF examples):  
`'{"observation.images.wrist": "observation.images.camera3"}'`

Use `--policy.device=cuda` on a machine with an NVIDIA GPU instead of `mps`.

### Smoke test (~3 episodes, ~6 min on MacBook Air)

Validates train → checkpoint → rollout wiring; will **not** pick reliably.

```bash
lerobot-train \
  --policy.path=lerobot/smolvla_base \
  --policy.push_to_hub=false \
  --dataset.repo_id=siddpr/my_vla_task_20260519_144738 \
  --policy.device=mps \
  --batch_size=1 \
  --steps=500 \
  --save_freq=250 \
  --output_dir=outputs/train/my_smolvla_smoke \
  --job_name=my_smolvla_smoke \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --policy.empty_cameras=2
```

Checkpoint: `outputs/train/my_smolvla_smoke/checkpoints/last/pretrained_model`

### Full fine-tune (target ~50 episodes)

Aim for **~50** clean demos first. At 20 fps × 30 s/episode, use **~10k–20k** steps on Mac (slower) or GPU (faster; ~4 h for 20k on A100 per [SmolVLA docs](https://huggingface.co/docs/lerobot/smolvla)).

```bash
lerobot-train \
  --policy.path=lerobot/smolvla_base \
  --policy.push_to_hub=false \
  --dataset.repo_id=siddpr/my_vla_task_20260519_144738 \
  --policy.device=mps \
  --batch_size=1 \
  --steps=20000 \
  --save_freq=5000 \
  --output_dir=outputs/train/my_smolvla \
  --job_name=my_smolvla \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --policy.empty_cameras=2
```

To upload the trained policy to Hub, add e.g. `--policy.repo_id=siddpr/my_smolvla` and remove `--policy.push_to_hub=false`.

---

## 7. Run policy on robot (rollout)

Use the **same** `rename_map`, **fps**, task string, and camera settings as training. `empty_cameras` is stored in the checkpoint config; you do not need to pass it again.

### After smoke test

```bash
lerobot-rollout \
  --strategy.type=base \
  --inference.type=rtc \
  --inference.rtc.execution_horizon=10 \
  --policy.path=outputs/train/my_smolvla_smoke/checkpoints/last/pretrained_model \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 20} }" \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --task="Pick up the object and place it in the bin." \
  --fps=20 \
  --duration=60 \
  --device=mps
```

### After full fine-tune

```bash
lerobot-rollout \
  --strategy.type=base \
  --inference.type=rtc \
  --inference.rtc.execution_horizon=10 \
  --policy.path=outputs/train/my_smolvla/checkpoints/last/pretrained_model \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 20} }" \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --task="Pick up the object and place it in the bin." \
  --fps=20 \
  --duration=60 \
  --device=mps
```

If RTC is unstable on Mac, try `--inference.type=sync` (drop `inference.rtc.*` flags). Optional safety: `--robot.max_relative_target=10`.

**No training:** There is no official zero-shot SmolVLA pick-place for your SO-101; use teleop or `lerobot-replay` on your dataset.

---

## Other machine

```bash
git clone https://github.com/siddharthanpr/lerobot.git
cd lerobot && git checkout dryrun/teleop
uv sync --locked --extra feetech
source .venv/bin/activate
uv pip install pynput
```

After power cycle: on connect, press **Enter** to load calibration (don't type `c`).

Pull upstream later: `git fetch origin main && git rebase origin/main && git push fork dryrun/teleop`

---

## Fixes we hit

| Problem | Fix |
|---------|-----|
| `feetech-servo-sdk` missing | `uv pip install -e ".[feetech]"` |
| Camera timeout on index 1 | Wrist is index **0**, not 1 |
| No keyboard during record | `uv pip install pynput` + Terminal in **Accessibility** |
| FPS warnings / frame drops | `--display_data=false`, `--dataset.streaming_encoding=true`, plug in power |
| `repo_id` was `/my_vla_task` | Use `siddpr/my_vla_task` directly |
| Calibration prompt on startup | Press Enter (motors reset after power off) |
| Motor voltage / blinking | Match PSU to arm; reseat USB power |
| `repo_id` missing on train | Add `--policy.push_to_hub=false` or `--policy.repo_id=siddpr/my_smolvla` |
| Feature mismatch `camera1` vs `wrist` | `--rename_map='{"observation.images.wrist": "observation.images.camera1"}'` + `--policy.empty_cameras=2` |
| Partial episode after ESC mid-record | Delete with `lerobot-edit-dataset` or use `←` to redo before saving |
| Many `my_vla_task_*` folders | Each record without `--resume=true` creates a new timestamped dataset |
