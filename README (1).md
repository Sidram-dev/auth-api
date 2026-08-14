# 🐳 Docker Learning Documentation — Full Chronological Log

**Purpose of this document:** A complete, start-to-end record of Docker learning, written in the **exact order concepts were taught** — not reorganized by topic. Every command covered so far appears here with a plain-English explanation of what it does, why it matters, and a worked example with realistic input/output. The goal is that anyone — including you after weeks away, or another developer with zero context — can read this top to bottom and understand exactly what has been learned, why, and what's still left.

**Learning goal:** Backend engineering with the MERN stack + Redis + MongoDB, ultimately run through Docker and Docker Compose.

---

## Table of Contents

- [Part A — Docker Basics](#part-a--docker-basics)
- [Part B — Images](#part-b--images)
- [Part C — Dockerfile Basics](#part-c--dockerfile-basics)
- [Part D — Image Layers & Build Cache](#part-d--image-layers--build-cache)
- [Part E — Container Lifecycle (Deep Dive Exercise)](#part-e--container-lifecycle-deep-dive-exercise)
- [Part F — Errors Hit Along the Way & How They Were Solved](#part-f--errors-hit-along-the-way--how-they-were-solved)
- [Part G — Full Roadmap: Completed vs Remaining](#part-g--full-roadmap-completed-vs-remaining)
- [Part H — Full Command Index (Quick Lookup)](#part-h--full-command-index-quick-lookup)

---

## Part A — Docker Basics

This was the very first topic. Before touching any commands, the core mental model to build is:

### A.1 — What Docker is
Docker lets you package an application together with everything it needs to run (OS libraries, runtime, dependencies, config) into a single unit that behaves identically on any machine — your laptop, a teammate's laptop, or a production server. It solves the classic "it works on my machine" problem.

### A.2 — Image vs Container (the foundational concept)

| Concept | What it is | Analogy |
|---|---|---|
| **Image** | A read-only template/blueprint containing the OS, dependencies, and app code needed to run something. | A **class** in programming, or a recipe. |
| **Container** | A running (or stopped) *instance* created from an image. | An **object** created from that class, or the actual cooked dish. |

**Golden rule learned here, and re-confirmed later in the lifecycle exercise:**
```
IMAGE ≠ CONTAINER
```
Deleting a container never deletes the image it came from. One image can be used to create many independent containers.

```
IMAGE (ubuntu:latest)
   │  docker run
   ├──▶ CONTAINER #1 (lifecycle-demo)
   └──▶ CONTAINER #2 (another-lifecycle-demo)
```

### A.3 — Docker Hub
Docker Hub is the public registry (like a "GitHub for Docker images") where official images such as `ubuntu`, `redis`, `hello-world`, and `node` are hosted. `docker pull` / `docker run` download images from here by default when you don't already have them locally.

### A.4 — `docker run` (creating and starting a container)

**What it does:** Creates a brand-new container from an image and starts it running, in a single step. If the image isn't already downloaded locally, Docker pulls it from Docker Hub automatically first.

**Example:**
```bash
docker run hello-world
```
Output:
```
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.
```
This is the classic "hello world" test that confirms Docker itself is installed and working. Docker pulled the image (since it wasn't local yet), created a container from it, ran its default command, printed the message, and the container then exited (because its job — printing that message — was done).

### A.5 — `docker ps` (list running containers)

**What it does:** Shows only containers that are **currently running**.

**Example:**
```bash
docker run -d --name lifecycle-demo ubuntu sleep 3600
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS         NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   5 seconds ago   Up 4 seconds   lifecycle-demo
```

### A.6 — `docker ps -a` (list ALL containers)

**What it does:** The `-a` ("all") flag shows every container regardless of state — running, stopped, or paused. Useful because `hello-world`-type containers exit almost instantly and disappear from plain `docker ps`.

**Example:**
```bash
docker ps -a
```
Output:
```
CONTAINER ID   IMAGE         COMMAND     CREATED         STATUS                     NAMES
d3f8a2b1c9e0   hello-world   "/hello"    2 minutes ago   Exited (0) 2 minutes ago   quirky_euler
8f2e91c4a3b7   ubuntu        "sleep 3600" 5 seconds ago  Up 4 seconds               lifecycle-demo
```
Note: `Exited (0)` means the process finished **successfully** (exit code `0` = no error) — different from the `Exited (143)` seen later in the lifecycle exercise, which meant the process was stopped by a signal, not a natural finish.

### A.7 — `docker start` (start an existing container)

**What it does:** Starts a container that **already exists** but is currently stopped. Unlike `docker run`, this does not create anything new — it reuses the same container (same ID, same filesystem state).

**Example:**
```bash
docker start lifecycle-demo
```
Output:
```
lifecycle-demo
```
(Docker just echoes back the container name/ID it started.)

### A.8 — `docker stop` (gracefully stop a running container)

**What it does:** Sends a graceful shutdown signal (`SIGTERM`) to the container's main process, giving it a chance to shut down cleanly. If it doesn't stop within a grace period (10 seconds by default), Docker force-kills it with `SIGKILL`.

**Example:**
```bash
docker stop lifecycle-demo
```
Output:
```
lifecycle-demo
```

### A.9 — `docker restart` (stop + start in one command)

**What it does:** Internally equivalent to running `docker stop` immediately followed by `docker start` on the same container. Useful when you've changed something (e.g. an environment variable file) and need the container's process to pick it up fresh, without deleting the container.

**Example:**
```bash
docker restart lifecycle-demo
```
Output:
```
lifecycle-demo
```

### A.10 — `docker rm` (remove/delete a container)

**What it does:** Permanently deletes a container. The container must be **stopped** first (or you must add the `-f` flag to force-remove a running one).

**Example:**
```bash
docker rm lifecycle-demo
```
Output:
```
lifecycle-demo
```
If you try this on a still-running container without `-f`, you get an error:
```
Error response from daemon: You cannot remove a running container ... Stop the container before attempting removal or force remove
```

### A.11 — Container names

**What was learned:** Every container gets a name — either one you assign with `--name`, or a random auto-generated one (like `quirky_euler` seen above) if you don't specify one. **Names must be unique** on a given machine; trying to reuse a name that's already taken (even by a stopped container) throws a conflict error (covered in detail in [Part F](#part-f--errors-hit-along-the-way--how-they-were-solved)).

**Example — letting Docker auto-name a container:**
```bash
docker run -d ubuntu sleep 100
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        STATUS          NAMES
a1b2c3d4e5f6   ubuntu    "sleep 100"    Up 2 seconds    vigilant_hopper
```
**Example — assigning your own name:**
```bash
docker run -d --name lifecycle-demo ubuntu sleep 3600
```
Now the container is referred to as `lifecycle-demo` in every future command instead of a random string.

### A.12 — Detached mode (`-d`)

**What it does:** Runs the container in the background and immediately returns control of your terminal to you, instead of "attaching" your terminal to the container's output stream.

**Example — without `-d` (attached mode):**
```bash
docker run ubuntu echo "hello"
```
Your terminal shows the output directly (`hello`) and then returns, because this particular container finishes instantly anyway. For a long-running process, *not* using `-d` would leave your terminal "stuck" watching that container until you press `Ctrl+C`.

**Example — with `-d` (detached mode):**
```bash
docker run -d --name lifecycle-demo ubuntu sleep 3600
```
Output:
```
8f2e91c4a3b7d5e6c1a09f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c
```
You immediately get your terminal prompt back (only the container ID is printed), and the container keeps running in the background.

### A.13 — `docker exec` (run a command inside a running container)

**What it does:** Lets you run an additional command **inside an already-running container** — most commonly used to open an interactive shell inside it for debugging/inspection.

**Example:**
```bash
docker exec -it lifecycle-demo bash
```
- `-it` → combines two flags: `-i` (interactive — keep STDIN open) and `-t` (allocate a pseudo-terminal) — together these give you a usable interactive shell session, as opposed to a command that fires once and returns.
- `bash` → the command to execute inside the container (opens a Bash shell).

Output: your prompt changes to something like:
```
root@8f2e91c4a3b7:/#
```
You are now "inside" the container's filesystem and can run Linux commands (`ls`, `cat`, `ps`, etc.) as if you'd SSH'd into a separate machine. Type `exit` to leave the shell and return to your normal terminal (the container itself keeps running in the background, since `exec` just opens an extra process inside it — it doesn't replace the main process).

### A.14 — `docker logs` (view a container's output)

**What it does:** Prints everything the container's main process has written to STDOUT/STDERR since it started — essential for debugging when something isn't working as expected.

**Example:**
```bash
docker logs lifecycle-demo
```
For a `sleep`-based container this would typically show nothing (it produces no output), but for something like a Redis or Node.js container it shows the application's startup and runtime logs, e.g.:
```bash
docker run -d --name redis-dev redis
docker logs redis-dev
```
Output:
```
1:C 10 Aug 2026 10:15:32.001 # Redis version=7.2.4, bits=64, commit=00000000
1:M 10 Aug 2026 10:15:32.002 * Running mode=standalone, port=6379.
1:M 10 Aug 2026 10:15:32.003 * Ready to accept connections tcp
```
You can also follow logs live (like `tail -f`) with:
```bash
docker logs -f redis-dev
```

### A.15 — `docker inspect` (detailed metadata about a container/image)

**What it does:** Returns a large JSON document with everything Docker knows about a container (or image) — its config, network settings, mounts, state, environment variables, and more.

**Example:**
```bash
docker inspect lifecycle-demo
```
Output (truncated — real output is much longer):
```json
[
    {
        "Id": "8f2e91c4a3b7d5e6c1a09f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c",
        "Created": "2026-08-10T10:12:01.123456Z",
        "State": {
            "Status": "running",
            "Running": true,
            "Paused": false,
            "ExitCode": 0
        },
        "Image": "sha256:e4c58958181a...",
        "Name": "/lifecycle-demo",
        ...
    }
]
```
Because the full output is huge, you'll often extract just one field using `--format` (Go template syntax) — see A.16.

### A.16 — `docker inspect --format` (extracting a single field)

**What it does:** Instead of dumping the whole JSON blob, `--format '{{.FieldName}}'` pulls out just the field you want.

**Example:**
```bash
docker inspect --format '{{.State.Status}}' lifecycle-demo
```
Output:
```
running
```

### A.17 — Container status values, and why containers exit

**What was learned:** A container is only "alive" as long as its **main process (PID 1 inside the container)** is running. The moment that process ends — whether it finishes naturally, crashes, or is killed — the container transitions to `Exited`, even though the container itself (its filesystem, config, logs) still exists until you `docker rm` it.

**Example demonstrating this:**
```bash
docker run --name quick-test ubuntu echo "done"
docker ps -a
```
Output:
```
CONTAINER ID   IMAGE     COMMAND      STATUS                     NAMES
c2d4e6f8a0b1   ubuntu    "echo done"  Exited (0) 3 seconds ago   quick-test
```
The `echo` command ran, printed `done`, and finished — so its container immediately exited. This is *why* the lifecycle exercise later used `sleep 3600` instead of a quick command: it needed a process that keeps running so there'd be time to practice `stop`/`start`/`pause` on a genuinely running container.

---

## Part B — Images

Once the container fundamentals were clear, the next topic was working with **images** directly. Images used in this phase: `ubuntu`, `hello-world`, `redis`.

### B.1 — `docker images` / `docker image ls` (list local images)

**What it does:** Lists every image currently downloaded on your machine — these two commands are aliases of each other.

**Example:**
```bash
docker images
```
Output:
```
REPOSITORY    TAG       IMAGE ID       CREATED         SIZE
redis         latest    3e2b6c5e4a4e   2 weeks ago     138MB
ubuntu        latest    e4c58958181a   3 weeks ago     77.9MB
hello-world   latest    d2c94e258dcb   6 months ago    13.3kB
```

### B.2 — `docker history` (see how an image was built)

**What it does:** Shows every layer that makes up an image, in the order they were added, along with the command that created each layer and its approximate size — useful for understanding what's bloating an image.

**Example:**
```bash
docker history ubuntu
```
Output:
```
IMAGE          CREATED       CREATED BY                                SIZE
e4c58958181a   3 weeks ago   /bin/sh -c #(nop)  CMD ["bash"]           0B
<missing>      3 weeks ago   /bin/sh -c #(nop) ADD file:2ca3ed5c... /   77.9MB
```

### B.3 — `docker pull` (download an image without running it)

**What it does:** Downloads an image from Docker Hub to your local machine, without creating or starting any container from it. Useful for pre-fetching an image, or for grabbing a specific version ahead of time.

**Example:**
```bash
docker pull redis
```
Output:
```
Using default tag: latest
latest: Pulling from library/redis
a2318d6c47ec: Pull complete
Status: Downloaded newer image for redis:latest
docker.io/library/redis:latest
```
Confirm it's there:
```bash
docker images
```
```
REPOSITORY   TAG       IMAGE ID       SIZE
redis        latest    3e2b6c5e4a4e   138MB
```

### B.4 — Image tags

**What was learned:** An image reference like `ubuntu:latest` has two parts: the **repository name** (`ubuntu`) and the **tag** (`latest`), which is a version label. Omitting the tag defaults to `latest`. Different tags of the same repository can point to very different images (different OS bases, different sizes).

**Example — same repository, two very different tags:**
```bash
docker pull node:20
docker pull node:20-alpine
docker images
```
Output:
```
REPOSITORY   TAG          IMAGE ID       SIZE
node         20           a1b2c3d4e5f6   1.1GB
node         20-alpine    f6e5d4c3b2a1   181MB
```
`node:20` is built on a full Debian base (bigger, more tools available). `node:20-alpine` is built on the minimal Alpine Linux distribution (much smaller — this becomes important later in the "image optimization" topic, still to come).

### B.5 — Image IDs

**What was learned:** Alongside human-readable tags, every image also has a unique hash ID (shown truncated in `docker images`, e.g. `e4c58958181a`) — conceptually similar to a Git commit hash. Multiple tags can point to the exact same underlying image ID if nothing actually changed between them.

---

## Part C — Dockerfile Basics

### C.1 — What a Dockerfile is

**What was learned:** A Dockerfile is a plain-text script of instructions that tells Docker exactly how to build a custom image, step by step, starting from a base image.

### C.2 — The sample Dockerfile written during learning

File: `01-first-image/Dockerfile`
```dockerfile
FROM ubuntu

RUN echo "Hello Docker"
RUN echo "Another Docker command"
RUN echo "I am learning Docker - Layer 2"

CMD ["echo", "Container has started"]
```

### C.3 — `FROM` instruction

**What it does:** Declares the base image every subsequent instruction builds on top of. Every valid Dockerfile must start with a `FROM`.

**Example:** `FROM ubuntu` → this Dockerfile's image will be built starting from the official `ubuntu` image.

### C.4 — `RUN` instruction

**What it does:** Executes a shell command **at build time** (i.e., while `docker build` is running), and bakes the result into a new image layer. Commonly used for installing packages, creating directories, etc.

**Example:** `RUN echo "Hello Docker"` — during the build, Docker actually runs this `echo` command inside a temporary container and commits the resulting filesystem state as a new layer. Each separate `RUN` line becomes its own layer (this becomes very important in Part D).

### C.5 — `CMD` instruction

**What it does:** Defines the **default command that runs when a container is started** from this image — not during the build. Only one `CMD` takes effect per image (if you write several, only the last one wins).

**Example:** `CMD ["echo", "Container has started"]` — this text (`Container has started`) is only printed when you later run `docker run <image>`, never during `docker build`.

### C.6 — `docker build` (building the image from the Dockerfile)

**What it does:** Reads the Dockerfile in a given directory and executes its instructions in order, producing a new image.

**Example:**
```bash
cd 01-first-image
docker build -t first-image .
```
- `-t first-image` → "tag" — assigns the human-readable name `first-image` to the resulting image (you could also write `-t first-image:v1` to add a version tag).
- `.` → the **build context** — tells Docker "look for the Dockerfile here, and use this folder as the set of files available to the build" (relevant later when using `COPY`/`ADD` to bring source code into an image).

Output:
```
[+] Building 4.2s (7/7) FINISHED
 => [1/4] FROM docker.io/library/ubuntu:latest
 => [2/4] RUN echo "Hello Docker"
 => [3/4] RUN echo "Another Docker command"
 => [4/4] RUN echo "I am learning Docker - Layer 2"
 => exporting to image
 => => naming to docker.io/library/first-image
```

### C.7 — Running a container from the newly built image

**Example:**
```bash
docker run first-image
```
Output:
```
Container has started
```
This confirms the concept from C.5: the three `RUN echo` lines already executed during the **build** (their output appeared in the build log in C.6, not here) — only the `CMD` line executes when the container actually **runs**.

### C.8 — Building with a version tag

**Example:**
```bash
docker build -t first-image:v1 .
```
```bash
docker images
```
Output:
```
REPOSITORY     TAG       IMAGE ID
first-image    v1        7f3a9b2c1e44
```
If the Dockerfile is edited later and rebuilt as `first-image:v2`, both versions coexist — letting you roll back to `v1` if `v2` has a problem.

---

## Part D — Image Layers & Build Cache

### D.1 — The layer concept

**What was learned:** Every instruction in a Dockerfile (`FROM`, `RUN`, `CMD`, etc.) creates a new, stacked **layer** on top of the previous one.

```
FROM ubuntu           → Layer 1
RUN echo "Hello"       → Layer 2
RUN echo "Another"     → Layer 3
CMD [...]               → Layer 4 (metadata layer)
```

### D.2 — The build cache, and `CACHED` in build output

**What it does:** Docker caches the result of each layer. If you rebuild an image and a given instruction (and everything before it) hasn't changed, Docker reuses the cached layer instantly instead of re-executing it — making repeat builds much faster.

**Example — first build (nothing cached yet):**
```bash
docker build -t first-image .
```
```
=> [1/4] FROM ubuntu
=> [2/4] RUN echo "Hello Docker"
=> [3/4] RUN echo "Another Docker command"
=> [4/4] RUN echo "I am learning Docker - Layer 2"
```

**Example — rebuilding with zero changes:**
```bash
docker build -t first-image .
```
```
=> CACHED [1/4] FROM ubuntu
=> CACHED [2/4] RUN echo "Hello Docker"
=> CACHED [3/4] RUN echo "Another Docker command"
=> CACHED [4/4] RUN echo "I am learning Docker - Layer 2"
```
Every step says `CACHED` and the whole build finishes almost instantly.

### D.3 — Cache invalidation: why ordering matters

**What was learned:** The moment **one instruction changes**, Docker invalidates the cache for that layer **and every layer after it**, even if those later layers are word-for-word identical to before.

**Example — changing only the middle line:**
```dockerfile
FROM ubuntu

RUN echo "Hello Docker"
RUN echo "Another Docker command - edited"     # <-- changed this line only
RUN echo "I am learning Docker - Layer 2"

CMD ["echo", "Container has started"]
```
```bash
docker build -t first-image .
```
Output:
```
=> CACHED [1/4] FROM ubuntu
=> CACHED [2/4] RUN echo "Hello Docker"
=> [3/4] RUN echo "Another Docker command - edited"     <-- rebuilt
=> [4/4] RUN echo "I am learning Docker - Layer 2"       <-- ALSO rebuilt, despite being unchanged
```
**Lesson:** Layer 4 never changed at all, but because Layer 3 (an earlier layer) changed, everything downstream had to rebuild too.

**Why this matters for real projects (previewed here, to be used later when Dockerizing the MERN backend):** put things that change *rarely* (installing dependencies) near the top of the Dockerfile, and things that change *often* (your actual source code) near the bottom.
```dockerfile
# GOOD ordering — dependency install is cached separately from source code
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install          # only re-runs when package.json changes
COPY . .                 # editing a .js file won't bust the npm install cache
CMD ["node", "index.js"]
```

---

## Part E — Container Lifecycle (Deep Dive Exercise)

This was a dedicated, hands-on exercise tying together everything from Parts A–D, plus two new commands (`pause`/`unpause`).

### E.0 — The full lifecycle diagram taught at the start of this exercise

```
                 docker run
                     │
                     ▼
                CREATED
                     │
                     ▼
                  RUNNING
                 /       \
        docker stop     docker pause
             │               │
             ▼               ▼
          STOPPED          PAUSED
             │               │
      docker start      docker unpause
             │               │
             └───────┬───────┘
                     ▼
                  RUNNING
                     │
                docker rm
                     ▼
                  REMOVED
```

### E.1 — Step 1: Create a long-running container

```bash
docker run -d --name lifecycle-demo ubuntu sleep 3600
```
- `docker run` → creates a **new** container from the `ubuntu` image and starts it (contrast with `docker start`, which only works on containers that already exist — this distinction was the whole point of [Error 1](#f1--error-1-missing-container-name-argument) later).
- `-d` → detached/background mode.
- `--name lifecycle-demo` → assigns a memorable, unique name.
- `sleep 3600` → the container's **main process**: keeps it alive for 3600 seconds (1 hour), specifically so there'd be time to run the rest of the exercise before it exits on its own.

Example output:
```
8f2e91c4a3b7d5e6c1a09f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c
```

### E.2 — Step 2: Confirm it is running

```bash
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS         NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   5 seconds ago   Up 4 seconds   lifecycle-demo
```

Check the exact internal state:
```bash
docker inspect --format '{{.State.Status}}' lifecycle-demo
```
Output:
```
running
```

### E.3 — Step 3: Stop the container

```bash
docker stop lifecycle-demo
```
Then:
```bash
docker ps
```
Output: **empty list** — `lifecycle-demo` doesn't appear, because `docker ps` only shows running containers.

Then:
```bash
docker ps -a
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS                      NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   2 minutes ago   Exited (143) 5 seconds ago  lifecycle-demo
```
The status is `Exited`. Exit code `143` = `128 + 15`, meaning the process was stopped by signal `15` (`SIGTERM`) — the normal, graceful signal `docker stop` sends. This is expected behavior, not an error.

### E.4 — Step 4: Start the SAME container again (not a new one)

**This was flagged as an important distinction during the lesson.**

```bash
docker start lifecycle-demo
```
Note: this must **not** be confused with re-running `docker run ... --name lifecycle-demo ...`, which would try to create a brand-new container and hit the name-conflict error (see Part F).

```bash
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS         NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   3 minutes ago   Up 2 seconds   lifecycle-demo
```
Note `CREATED` still reads "3 minutes ago" — proof it's the *same* container (same ID, same history), only `STATUS` reset.

**The distinction explicitly taught here:**
```
docker run    → Create a NEW container from an image and start it.
docker start  → Start an EXISTING stopped container.
```

### E.5 — Step 5: Restart

```bash
docker restart lifecycle-demo
```
Internally, Docker does: `STOP` → `START` on the same container, as one command.

```bash
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS         NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   4 minutes ago   Up 1 second    lifecycle-demo
```
Still running.

### E.6 — Step 6: Pause the container

```bash
docker pause lifecycle-demo
```
```bash
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS                    NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   4 minutes ago   Up 45 seconds (Paused)    lifecycle-demo
```

Check the internal status directly:
```bash
docker inspect --format '{{.State.Status}}' lifecycle-demo
```
Output:
```
running
```
**Key nuance explicitly called out in the lesson:** even though the container is paused, `docker inspect` still reports the state as `running`. This is because Docker's internal "paused" state is a **sub-state** of running — the processes inside the container are frozen (using the host OS's cgroups freezer) but the container itself is still considered alive, not stopped.

### E.7 — Step 7: Unpause

```bash
docker unpause lifecycle-demo
```
```bash
docker ps
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS          NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   5 minutes ago   Up 55 seconds   lifecycle-demo
```
```bash
docker inspect --format '{{.State.Status}}' lifecycle-demo
```
Output:
```
running
```

### E.8 — Step 8: Stop it

```bash
docker stop lifecycle-demo
```
```bash
docker ps -a
```
Output:
```
CONTAINER ID   IMAGE     COMMAND        CREATED         STATUS                      NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   6 minutes ago   Exited (137) 3 seconds ago  lifecycle-demo
```
This time exit code `137` = `128 + 9` = `SIGKILL` — meaning the graceful `SIGTERM` didn't finish in time and Docker force-killed the process. (Exact exit codes can vary run to run; the important thing taught was simply that the status says `Exited`.)

### E.9 — Step 9: Remove the container

```bash
docker rm lifecycle-demo
```
Output:
```
lifecycle-demo
```
```bash
docker ps -a
```
Output: **empty** — it no longer exists at all.

**The final, important confirmation of this whole exercise:**
```bash
docker image ls
```
Output:
```
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
ubuntu       latest    e4c58958181a   3 weeks ago    77.9MB
```
The `ubuntu:latest` image is **still there**, even though its container was just fully removed — because `IMAGE ≠ CONTAINER` (from Part A.2). Removing a container never removes the image it came from.

### E.10 — The four core lifecycle commands, summarized

```
docker run
   IMAGE
     ↓
  creates NEW CONTAINER
     ↓
   starts it

docker start
   EXISTING STOPPED CONTAINER
             ↓
          starts it

docker stop
   RUNNING CONTAINER
          ↓
       stops it

docker rm
   STOPPED CONTAINER
          ↓
       removes it
```

### E.11 — The "one very important rule" called out at the end of the exercise

**Don't repeatedly run:**
```bash
docker run --name lifecycle-demo ubuntu sleep 3600
```
if `lifecycle-demo` already exists — this always throws the name-conflict error (Part F). Instead:
- If it already exists and is stopped → `docker start lifecycle-demo`
- If you genuinely want a new, separate container → give it a new name, e.g. `docker run --name another-lifecycle-demo ubuntu sleep 3600`

### E.12 — The full practical task given at the end of the exercise (for reference/repetition)

```bash
docker run -d --name lifecycle-demo ubuntu sleep 3600
docker ps
docker stop lifecycle-demo
docker ps -a
docker start lifecycle-demo
docker ps
docker restart lifecycle-demo
docker pause lifecycle-demo
docker ps
docker unpause lifecycle-demo
docker stop lifecycle-demo
docker rm lifecycle-demo
docker ps -a
```
This full sequence is exactly what E.1–E.9 above walks through individually, with example output at each stage.

---

## Part F — Errors Hit Along the Way & How They Were Solved

### F.1 — Error 1: Missing container name argument

**What happened:**
```
PS E:\Docker\Learning\01-first-image> docker start
docker: 'docker start' requires at least 1 argument

Usage:  docker start [OPTIONS] CONTAINER [CONTAINER...]

See 'docker start --help' for more information
```

**Cause:** `docker start` (like most container commands) needs to be told **which** container to act on. Running it with no name/ID gives this usage error.

**Fix — always supply the container name/ID:**
```bash
docker start lifecycle-demo
```

**The debugging workflow taught for this situation:**
```bash
docker ps -a
```
- If `lifecycle-demo` shows up with status `Exited` → run `docker start lifecycle-demo`.
- If `lifecycle-demo` does not appear at all → it was never created (or was already removed) → create it fresh:
```bash
docker run -d --name lifecycle-demo ubuntu sleep 3600
```

**Quick reference table taught alongside this fix:**
```
docker run -d --name lifecycle-demo ubuntu sleep 3600   → Create + start a NEW container
docker start lifecycle-demo                              → Start an EXISTING stopped container
docker stop lifecycle-demo                                → Stop an EXISTING running container
```
Key takeaway explicitly stated: *"your error is not a problem with Docker. It's just because you didn't provide the container name."*

### F.2 — Error 2: Container name conflict

**What happened (reconstructed full example):**
```bash
$ docker run -d --name lifecycle-demo ubuntu sleep 3600
8f2e91c4a3b7d5e6c1a09f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c

$ docker run -d --name lifecycle-demo ubuntu sleep 3600
docker: Error response from daemon: Conflict. The container name "/lifecycle-demo" is already in use by container "8f2e91c4a3b7...". You have to remove (or rename) that container to be able to reuse that name.
```

**Cause:** Container names must be **unique** on a machine — even a stopped container still "owns" its name until it's removed or renamed.

**Fix A — reuse the existing container instead of creating a new one:**
```bash
$ docker ps -a
CONTAINER ID   IMAGE     COMMAND        STATUS         NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   Up 2 minutes   lifecycle-demo

$ docker start lifecycle-demo
lifecycle-demo
```

**Fix B — create a second, independently-named container:**
```bash
$ docker run -d --name another-lifecycle-demo ubuntu sleep 3600
2b4f8a1c9d3e...

$ docker ps
CONTAINER ID   IMAGE     COMMAND        STATUS         NAMES
8f2e91c4a3b7   ubuntu    "sleep 3600"   Up 3 minutes   lifecycle-demo
2b4f8a1c9d3e   ubuntu    "sleep 3600"   Up 2 seconds   another-lifecycle-demo
```
Now two independent containers exist, both from the same `ubuntu` image — reinforcing Part A.2's "one image → many containers" concept.

---

## Part G — Full Roadmap: Completed vs Remaining

This is the complete roadmap as laid out, including everything already learned (Parts A–F above) and everything still ahead.

### ✅ 1. Docker basics — DONE
- What Docker is; image vs container; Docker Hub
- `docker run`, `docker ps`, `docker ps -a`, `docker start`, `docker stop`, `docker restart`, `docker rm`
- Container names; detached mode `-d`
- `docker exec`, `docker logs`, `docker inspect`
- Container status values; why containers exit (need for a running main process)

### ✅ 2. Images — DONE
- `docker image ls` / `docker images`
- `docker history`
- Image vs container; pulling images (`docker pull`); image tags (`latest` etc.); image IDs
- Images used: `ubuntu`, `hello-world`, `redis`

### ✅ 3. Dockerfile — DONE (basic level)
- `FROM`, `RUN`, `CMD`
- Dockerfile location; build context
- `docker build`, `-t` flag, tags

### ✅ 4. Docker image layers & build cache — DONE
- Layers; the `CACHED` build output
- What happens when a Dockerfile instruction changes (cache invalidation)
- Why Dockerfile instruction ordering matters (critical for Node.js/MERN later)

### 🔄 5. Container lifecycle — CURRENT (fully walked in Part E above)
- `docker run`, `docker start`, `docker stop`, `docker restart`, `docker pause`, `docker unpause`, `docker rm`
- Full state diagram: CREATED → RUNNING → STOPPED/PAUSED → REMOVED
- The `sleep 3600` exercise, container name uniqueness rule

### 🔜 6. Docker volumes ⭐ VERY IMPORTANT — not yet started
```
Container
   │
   │ writes data
   ▼
Volume
   │
   ▼
Data survives container deletion
```
To be covered: `docker volume ls`, `docker volume create`, `docker volume inspect`, `docker volume rm`, named volumes vs bind mounts. Essential for MongoDB and Redis persistence.

### 🔜 7. Port mapping & networking ⭐ — not yet started
To be covered: `-p 3000:3000` / `-p 6379:6379` syntax (`HOST PORT : CONTAINER PORT`), bridge networks, custom networks, container-to-container communication, DNS between containers, `docker network ls`, `docker network create`, `docker network inspect`.
```
Node.js container
       │
       ▼
MongoDB container
       │
       ▼
Redis container
```

### 🔜 8. Environment variables & configuration ⭐ — not yet started
To be covered: `-e PORT=3000`, `-e MONGO_URI=...`, `-e REDIS_HOST=...`, `.env` files, `--env-file`. Purpose: avoid hard-coding configuration into the Node.js application.

### 🔜 9. Docker Compose ⭐⭐⭐ VERY IMPORTANT — not yet started
To be covered:
```yaml
services:
  backend:
  mongodb:
  redis:
```
Commands: `docker compose up`, `docker compose down`, `docker compose ps`, `docker compose logs`, `docker compose build`, `docker compose restart`. Purpose: start the entire backend stack (Node + MongoDB + Redis) with one command instead of managing each container manually.

### 🔜 10. Multi-container application — not yet started
Building an actual backend environment where Node.js/Express, MongoDB, and Redis all run as separate containers on the same Docker network and talk to each other.

### 🔜 11. Dockerizing the existing MERN backend ⭐⭐⭐ — not yet started
Taking the previously-built Express/Mongoose project and writing a proper Dockerfile for it:
```
Your Node project
       ↓
Dockerfile
       ↓
Node image
       ↓
Node container
```

### 🔜 12. Redis with Docker ⭐⭐⭐ — not yet started
`redis:latest` and a `redis-dev` container have already been pulled/created, but Redis itself hasn't been taught yet. To be covered: Redis CLI, keys, strings, TTL/expiration, `SET`, `GET`, `DEL`, `EXPIRE`, `TTL`, Redis persistence, Redis volumes, connecting Node.js → Redis, caching API responses.
```
Client
  │
  ▼
Express API
  │
  ├──── Redis → cached data
  │
  └──── MongoDB → permanent data
```

### 🔜 13. Docker image optimization — not yet started
`.dockerignore`, smaller images, layer optimization, build cache strategy, `node:alpine`, avoiding unnecessary packages, proper Dockerfile ordering for production.

### 🔜 14. Multi-stage builds — not yet started
```dockerfile
FROM node:24 AS builder
...
FROM node:24-alpine
...
```
Keeps the final production image smaller by discarding build-only tools from the final image.

### 🔜 15. Docker security basics — not yet started
Non-root users, secrets handling, environment variables, minimal images, exposing only required ports, image vulnerabilities, container isolation basics.

### 🔜 16. Docker debugging & troubleshooting — not yet started
Deliberately breaking things to learn to fix them: "port already allocated," container won't start, container exits immediately, can't connect to MongoDB/Redis, image not found, container name conflict (already experienced once, see Part F.2), permission problems, network problems, volume problems.

### 🔜 17. Docker registries & Docker Hub (publishing) — not yet started
`docker login`, `docker tag`, `docker push`, `docker pull`.
```
Local machine
     ↓
Docker image
     ↓
Docker Hub
     ↓
Server / another machine
```

### 🔜 18. Production basics — not yet started
```
Development
     ↓
Docker Compose
     ↓
Build image
     ↓
Registry
     ↓
Production server
     ↓
Container
```
Also: where Docker fits with CI/CD, cloud (AWS/Azure/GCP). Kubernetes is explicitly deferred to a later, separate stage.

### The overall mental model to hold onto throughout
```
IMAGE
  ↓ docker run
CONTAINER
  ↓
NETWORK
  ↓
VOLUME
  ↓
COMPOSE
  ↓
MULTI-CONTAINER APPLICATION
  ↓
PRODUCTION
```

---

## Part H — Full Command Index (Quick Lookup)

Every command covered so far, in one flat table for fast lookup (see the relevant Part above for the full explanation + example of each).

| Command | Section | One-line meaning |
|---|---|---|
| `docker run <image>` | A.4 | Create a new container from an image and start it (pulls the image first if needed). |
| `docker run -d --name <n> <image> <cmd>` | A.12, E.1 | Create + start a new container in the background with a chosen name. |
| `docker ps` | A.5 | List currently running containers. |
| `docker ps -a` | A.6 | List all containers, any state. |
| `docker start <name>` | A.7 | Start an existing (stopped) container. |
| `docker stop <name>` | A.8 | Gracefully stop a running container. |
| `docker restart <name>` | A.9 | Stop then start the same container. |
| `docker pause <name>` | E.6 | Freeze all processes inside a running container. |
| `docker unpause <name>` | E.7 | Resume a paused container. |
| `docker rm <name>` | A.10 | Permanently delete a stopped container. |
| `docker exec -it <name> bash` | A.13 | Open an interactive shell inside a running container. |
| `docker logs <name>` | A.14 | View a container's STDOUT/STDERR output. |
| `docker logs -f <name>` | A.14 | Follow (live-tail) a container's logs. |
| `docker inspect <name>` | A.15 | Full JSON metadata about a container/image. |
| `docker inspect --format '{{.State.Status}}' <name>` | A.16, E.2 | Extract just the status field from inspect output. |
| `docker images` / `docker image ls` | B.1 | List locally downloaded images. |
| `docker history <image>` | B.2 | Show an image's layer-by-layer build history. |
| `docker pull <image>` | B.3 | Download an image without running it. |
| `docker build -t <name> .` | C.6 | Build an image from a Dockerfile in the current directory. |

---

*Last updated: reflects learning progress through the full Container Lifecycle exercise (Part E, Steps 1–9) and both errors encountered (Part F), immediately before starting Part G item 6 — Docker Volumes.*