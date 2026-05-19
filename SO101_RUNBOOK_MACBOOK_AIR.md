# SO-101 runbook (MacBook Air)

Fork: `https://github.com/siddharthanpr/lerobot` · branch `dryrun/teleop`

**Default / GPU workstation runbook** → [`SO101_RUNBOOK.md`](./SO101_RUNBOOK.md) (`fps=30`, `cuda`, `batch_size=8`).

Tuned for **MacBook Air**: lower FPS, `mps`, smaller train batch, `display_data=false` for recording, `encoder_threads=2`.

| | |
|--|--|
| Leader port | `/dev/tty.usbmodem5B421342001` |
| Follower port | `/dev/tty.usbmodem5B421342441` |
| Leader id | `my_leader_arm` |
| Follower id | `my_follower_arm` |
| HF user | `siddpr` |
| Wrist camera | OpenCV index **0** |
| Calibration | `calibration/` in repo |
| Active dataset | `siddpr/my_vla_task_20260519_144738` |
| Dataset root | `~/.cache/huggingface/lerobot/siddpr/my_vla_task_20260519_144738` |

Every new terminal:

```bash
cd /Users/sid/repos/lerobot && source .venv/bin/activate
```

Install, motor setup, calibrate, teleop: same as [default runbook](./SO101_RUNBOOK.md) §1–4.

---

## 5. Record demos (MacBook Air)

**Before recording:**

```bash
uv pip install pynput
hf auth login
```

**Accessibility (required):** System Settings → Privacy & Security → **Accessibility** → enable **Terminal** or **Cursor**. Quit and reopen the app.

| Key | Action |
|-----|--------|
| `→` | End episode → reset |
| `←` | Redo last episode |
| `ESC` | End session + Hub upload |

Use `ESC` only when finished — not mid-episode.

### Why `fps=20` and `display_data=false`

| Setting | MacBook Air reason |
|---------|-------------------|
| `fps=20` (camera + dataset) | Less USB/CPU load; fewer “running slower than X Hz” warnings |
| `display_data=false` | Rerun preview is heavy; use for all real recording |
| `encoder_threads=2` | Matches streaming encode capacity on laptop |
| `streaming_encoding=true` | Faster episode finalization |

Spot-check framing with 1–2 episodes using `display_data=true`, then record the full set with `false`.

### Record with preview (debug only)

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

### Record without preview (use for 50 episodes)

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

### Resume same dataset

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

### Delete a bad episode

```bash
uv pip install -e ".[dataset]"

lerobot-edit-dataset \
  --repo_id=siddpr/my_vla_task_20260519_144738 \
  --root /Users/sid/.cache/huggingface/lerobot/siddpr/my_vla_task_20260519_144738 \
  --new_repo_id=siddpr/my_vla_task_20260519_144738 \
  --operation.type delete_episodes \
  --operation.episode_indices "[3]" \
  --push_to_hub true
```

### Replay (no policy)

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

## 6. Train SmolVLA (MacBook Air)

Use **`mps`** and **`batch_size=1`** to avoid OOM. Training is slow; consider Colab/GPU for full 20k steps.

```bash
uv pip install -e ".[smolvla]"
```

Wrist-only SmolVLA flags (train **and** rollout):

```text
--rename_map='{"observation.images.wrist": "observation.images.camera1"}'
--policy.empty_cameras=2
```

### Smoke test (~6 min)

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

### Full fine-tune (~50 episodes first)

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

---

## 7. Rollout (MacBook Air)

Same `rename_map` and **`fps=20`** as recording/training.

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

If RTC is unstable: `--inference.type=sync` (remove `inference.rtc.*`). Optional: `--robot.max_relative_target=10`.

---

## MacBook Air troubleshooting

| Problem | Fix |
|---------|-----|
| FPS warnings / frame drops | `display_data=false`, `fps=20`, plug in power, close other apps |
| Camera `read failed` / stale frame | USB direct, short cable; lower fps; don't bump cable during reset |
| Training OOM | `batch_size=1`; close apps; train on cloud GPU |
| `repo_id` missing on train | `--policy.push_to_hub=false` |
| `camera1` vs `wrist` | `rename_map` + `policy.empty_cameras=2` |
| Partial episode after ESC | `lerobot-edit-dataset` or `←` to redo |
| Many `my_vla_task_*` folders | `--resume=true` on stamped repo |

See also [default runbook troubleshooting](./SO101_RUNBOOK.md#troubleshooting).
