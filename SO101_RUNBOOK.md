# SO-101 runbook (default)

Fork: `https://github.com/siddharthanpr/lerobot` · branch `dryrun/teleop`

**MacBook Air / low-power laptop?** → [`SO101_RUNBOOK_MACBOOK_AIR.md`](./SO101_RUNBOOK_MACBOOK_AIR.md) (`fps=20`, `mps`, `batch_size=1`, recording tuning).

| | |
|--|--|
| Leader port | `/dev/tty.usbmodem5B421342001` |
| Follower port | `/dev/tty.usbmodem5B421342441` |
| Leader id | `my_leader_arm` |
| Follower id | `my_follower_arm` |
| HF user | `siddpr` |
| Wrist camera | OpenCV index **0** (only camera) |
| Calibration | `calibration/` in repo |
| Dataset repo id (example) | `siddpr/my_vla_task` |

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
brew install ffmpeg   # macOS; use apt on Linux
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

**What this does:** Teleop with the leader; LeRobot saves joint data + wrist video + task text for fine-tuning SmolVLA.

**Before recording:**

```bash
uv pip install pynput
hf auth login
```

**macOS keyboard:** System Settings → Privacy & Security → **Accessibility** → enable **Terminal** (or Cursor).

| Key | Action |
|-----|--------|
| `→` | End episode early → reset |
| `←` | Redo last episode |
| `ESC` | Finish session and upload to Hub |

Do not use `Ctrl+C` to finish — use `ESC`. Do not press `ESC` mid-episode (saves a short partial episode).

### Record with preview (`display_data=true`)

```bash
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --teleop.type=so101_leader \
  --teleop.port=/dev/tty.usbmodem5B421342001 \
  --teleop.id=my_leader_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30} }" \
  --dataset.repo_id=siddpr/my_vla_task \
  --dataset.single_task="Pick up the object and place it in the bin." \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.fps=30 \
  --dataset.streaming_encoding=true \
  --dataset.encoder_threads=4 \
  --dataset.vcodec=auto \
  --display_data=true
```

### Record without preview (`display_data=false`)

```bash
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --teleop.type=so101_leader \
  --teleop.port=/dev/tty.usbmodem5B421342001 \
  --teleop.id=my_leader_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30} }" \
  --dataset.repo_id=siddpr/my_vla_task \
  --dataset.single_task="Pick up the object and place it in the bin." \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.fps=30 \
  --dataset.streaming_encoding=true \
  --dataset.encoder_threads=4 \
  --dataset.vcodec=auto \
  --display_data=false
```

### Dataset naming and resume

Each **new** `lerobot-record` (without `--resume=true`) stamps the repo id:  
`siddpr/my_vla_task` → `siddpr/my_vla_task_YYYYMMDD_HHMMSS`

**Continue the same dataset** (replace repo id and root with yours):

```bash
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --teleop.type=so101_leader \
  --teleop.port=/dev/tty.usbmodem5B421342001 \
  --teleop.id=my_leader_arm \
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30} }" \
  --dataset.repo_id=siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --dataset.root=~/.cache/huggingface/lerobot/siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --dataset.single_task="Pick up the object and place it in the bin." \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.fps=30 \
  --dataset.streaming_encoding=true \
  --dataset.encoder_threads=4 \
  --dataset.vcodec=auto \
  --display_data=false \
  --resume=true
```

### Delete a bad episode

```bash
uv pip install -e ".[dataset]"

lerobot-edit-dataset \
  --repo_id=siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --root ~/.cache/huggingface/lerobot/siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --new_repo_id=siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --operation.type delete_episodes \
  --operation.episode_indices "[3]" \
  --push_to_hub true
```

### Replay an episode (no policy)

```bash
lerobot-replay \
  --robot.type=so101_follower \
  --robot.port=/dev/tty.usbmodem5B421342441 \
  --robot.id=my_follower_arm \
  --dataset.repo_id=siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --dataset.root=~/.cache/huggingface/lerobot/siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --dataset.episode=0
```

---

## 6. Train SmolVLA

**Wrist-only:** map wrist → `camera1`, mask unused slots (same for train and rollout):

```text
--rename_map='{"observation.images.wrist": "observation.images.camera1"}'
--policy.empty_cameras=2
```

```bash
uv pip install -e ".[smolvla]"
```

Apple Silicon Mac: use `--policy.device=mps` and `--batch_size=1` (see MacBook Air runbook).

### Smoke test (~500 steps)

```bash
lerobot-train \
  --policy.path=lerobot/smolvla_base \
  --policy.push_to_hub=false \
  --dataset.repo_id=siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --policy.device=cuda \
  --batch_size=8 \
  --steps=500 \
  --save_freq=250 \
  --output_dir=outputs/train/my_smolvla_smoke \
  --job_name=my_smolvla_smoke \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --policy.empty_cameras=2
```

### Full fine-tune (~50 episodes, ~20k steps)

```bash
lerobot-train \
  --policy.path=lerobot/smolvla_base \
  --policy.push_to_hub=false \
  --dataset.repo_id=siddpr/my_vla_task_YYYYMMDD_HHMMSS \
  --policy.device=cuda \
  --batch_size=8 \
  --steps=20000 \
  --save_freq=5000 \
  --output_dir=outputs/train/my_smolvla \
  --job_name=my_smolvla \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --policy.empty_cameras=2
```

Hub upload: add `--policy.repo_id=siddpr/my_smolvla` and drop `--policy.push_to_hub=false`.

---

## 7. Run policy on robot (rollout)

Match **fps**, **rename_map**, and **task** to training.

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
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30} }" \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --task="Pick up the object and place it in the bin." \
  --fps=30 \
  --duration=60 \
  --device=cuda
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
  --robot.cameras="{ wrist: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30} }" \
  --rename_map='{"observation.images.wrist": "observation.images.camera1"}' \
  --task="Pick up the object and place it in the bin." \
  --fps=30 \
  --duration=60 \
  --device=cuda
```

---

## Other machine

```bash
git clone https://github.com/siddharthanpr/lerobot.git
cd lerobot && git checkout dryrun/teleop
uv sync --locked --extra feetech
source .venv/bin/activate
uv pip install pynput
```

After power cycle: press **Enter** to load calibration (don't type `c`).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `feetech-servo-sdk` missing | `uv pip install -e ".[feetech]"` |
| Camera timeout on index 1 | Wrist is index **0** |
| No keyboard during record | `pynput` + macOS **Accessibility** for Terminal |
| `repo_id` missing on train | `--policy.push_to_hub=false` or `--policy.repo_id=...` |
| `camera1` vs `wrist` mismatch | `rename_map` + `policy.empty_cameras=2` |
| Partial episode after ESC | `lerobot-edit-dataset` or redo with `←` |
| New timestamp folder each record | Use `--resume=true` on same stamped repo |
