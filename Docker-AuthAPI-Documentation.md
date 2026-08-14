# Dockerizing the MERN `auth-api` Backend — Exercise 5 Documentation

> **Purpose of this document:** A complete, self-contained reference for everything covered while Dockerizing the real `auth-api` (Node.js + Express + MongoDB) project — starting from Exercise 5 of the Docker learning path. Written so that even after weeks/months, re-reading this alone is enough to re-understand *what* was done, *why* it was done, and *how* every command/file works.

---

## 1. Context — Where This Exercise Started

Before Exercise 5, the following Docker fundamentals were already covered:

| Topic | Status |
|---|---|
| Docker installation & verification (`docker --version`, `docker compose version`) | ✅ |
| `docker run hello-world` | ✅ |
| Images vs Containers concept | ✅ |
| Running containers, port mapping | ✅ |
| Docker Compose basics | ✅ |
| Running a standalone Redis container (`docker run --name redis-dev -p 6379:6379 -d redis`) | ✅ |

The **project used for practice** is a real, previously-built MERN backend called **`auth-api`**, originally created during a React/Node introduction session. It already had:

- Node.js + Express server
- MongoDB + Mongoose
- REST API routes (auth, users)
- `express.json()` middleware
- Postman-tested CRUD endpoints

**Goal of Exercise 5:** Instead of using a throwaway demo project, take this *real* backend and progressively containerize it — first with a plain `Dockerfile`, then with `docker-compose.yml` to add MongoDB as a second connected service.

---

## 2. Overall Architecture Goal

```
auth-api (project)
   │
   ├── Node.js / Express API
   ├── Dockerfile          → defines HOW to build the API's image
   ├── .dockerignore       → defines WHAT to exclude from the image
   └── docker-compose.yml  → defines HOW multiple containers run together
          │
          ├── auth-api container (Node + Express, port 3000)
          └── mongo container    (MongoDB, port 27017)
```

Later stages (not yet done) will add Redis, environment-based prod/dev configs, and eventually deployment to Render.

---

## 3. Step 1 — Locate the Existing Project

Before touching Docker, the existing project folder was confirmed. This matters because **Docker doesn't create your app — it packages an app that already exists.**

```powershell
cd "F:\NODE JS\Practise\auth-api"
dir
```

Expected structure:

```
auth-api
│
├── node_modules
├── models
├── routes
├── controllers
├── package.json
├── package-lock.json
└── server.js
```

**Why this step matters:** Docker builds an image from the *current directory's contents* (via the `COPY` instruction later). Confirming the folder structure first avoids building an image from the wrong location or missing key files like `server.js` or `package.json`.

---

## 4. Step 2 — The `Dockerfile`

A `Dockerfile` is a **text file with build instructions** that Docker reads top-to-bottom to produce a Docker **image** (a snapshot/blueprint of the app + its environment).

### The Dockerfile used:

```dockerfile
FROM node:24

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Line-by-line explanation

| Instruction | What it does | Why it's used here |
|---|---|---|
| `FROM node:24` | Sets the **base image**. Every image starts from another image — here, an official Node.js v24 image that already has Node + npm installed. | Matches the local Node version (`v24.14.1`) used to build/test the project, avoiding version mismatch bugs. |
| `WORKDIR /app` | Sets the **working directory inside the container**. All subsequent instructions (`COPY`, `RUN`, `CMD`) execute relative to this path. If `/app` doesn't exist, Docker creates it. | Keeps the container's filesystem organized and avoids dumping files into `/` (root). |
| `COPY package*.json ./` | Copies only `package.json` and `package-lock.json` from the host into `/app` in the image. | **Layer-caching optimization**: Docker caches each instruction as a "layer." By copying only the dependency files first, `npm ci` only re-runs when dependencies actually change — not every time application code changes. This makes rebuilds much faster. |
| `RUN npm ci` | Installs exact dependency versions from `package-lock.json` inside the image. | `npm ci` (vs `npm install`) is stricter and faster for reproducible builds — it installs exactly what's locked, and fails if `package-lock.json` and `package.json` are out of sync. |
| `COPY . .` | Copies the **rest of the project** (source code, `routes/`, `controllers/`, `models/`, `server.js`, etc.) into `/app`. | Done *after* `npm ci` so that changing application code doesn't invalidate the dependency-install cache layer. |
| `EXPOSE 3000` | Documents that the container listens on port 3000. | This is **informational only** — it does NOT actually publish the port to the host. Actual publishing happens later via `-p` (docker run) or `ports:` (docker compose). |
| `CMD ["node", "server.js"]` | The **default command** run when a container starts from this image. | This is what actually starts the Express server inside the container. Written in "exec form" (JSON array) rather than shell form, which is best practice (proper signal handling, no extra shell process). |

### Key Docker concepts reinforced here

- **Image vs Container**: The `Dockerfile` + `docker build` produces an **image** (a static, reusable blueprint). Running that image with `docker run` produces a **container** (a live, running instance of that image).
- **Build context**: The `.` in `docker build -t auth-api .` tells Docker to use the current folder as the "build context" — the set of files Docker is allowed to `COPY` from.

---

## 5. Step 3 — `.dockerignore`

Just like `.gitignore` excludes files from Git, `.dockerignore` excludes files from being sent into the Docker **build context** and copied via `COPY . .`.

Typical contents used:

```
node_modules
.env
npm-debug.log
.git
```

### Why each entry matters

- **`node_modules`** — Never copy host `node_modules` into the image. It was installed for the host OS/architecture and may not work inside the Linux-based container. The image installs its own fresh copy via `RUN npm ci`.
- **`.env`** — Contains secrets (DB URIs, JWT secrets, email/cloudinary credentials). Must **never** be baked into an image, since images can be shared/pushed and would leak secrets. Environment variables are instead injected at *runtime* (via `env_file` in Compose, or Render's environment variable settings).
- **`.git`** — The git history/metadata isn't needed inside the running container and only bloats the image.

**Effect:** Smaller, faster, more secure image builds.

---

## 6. Step 4 — Building the Image Manually

```powershell
docker build -t auth-api .
```

### Explanation

- `docker build` — Reads the `Dockerfile` in the current directory and executes each instruction to produce an image.
- `-t auth-api` — **Tags** (names) the resulting image `auth-api` (equivalent to `auth-api:latest`). Without a tag, the image would only be referenceable by a long hash ID.
- `.` — The **build context**: the current directory, which Docker sends to the Docker daemon so `COPY` instructions have something to copy from.

At this stage, Docker:
1. Pulls `node:24` if not already cached locally.
2. Creates `/app` working directory.
3. Copies `package*.json`, runs `npm ci`.
4. Copies the rest of the source code.
5. Records that the container should run `node server.js` and listen on port 3000.
6. Saves all of this as a new local image named `auth-api`.

---

## 7. Step 5 — Running the Image as a Standalone Container

Before introducing Compose, the image was run manually to validate it works:

```powershell
docker run -p 3000:3000 auth-api
```

### Explanation

- `docker run` — Creates and starts a **new container** from an image.
- `-p 3000:3000` — **Port mapping** in the format `HOST_PORT:CONTAINER_PORT`. This means: traffic hitting `localhost:3000` on the Windows host is forwarded to port `3000` inside the container (where Express is listening).
- `auth-api` — The image to run (built in the previous step).

At this stage, without MongoDB also containerized, the API would either fail to connect to a database or would need to connect to a MongoDB instance running directly on the host — which is exactly the limitation Compose solves next.

---

## 8. Step 6 — Introducing `docker-compose.yml`

**Why Compose is needed:** The app now needs *two* coordinated containers — `auth-api` and `mongo` — that can talk to each other, share a network, and be started/stopped together with a single command. Managing this by hand with multiple `docker run` and `docker network` commands is error-prone; Compose declares the whole setup in one YAML file.

### The Compose file used (conceptually, based on what was built):

```yaml
services:
  auth-api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - mongo

  mongo:
    image: mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Section-by-section explanation

#### `services:`
Declares each container the application needs. Each key under `services` (`auth-api`, `mongo`) becomes both:
1. The container's identity in Compose, and
2. A **DNS hostname** that other containers on the same Compose network can use to reach it.

#### `auth-api:` service
| Key | Meaning |
|---|---|
| `build: .` | Instead of pulling a pre-made image, build one from the `Dockerfile` in the current directory (the same one from Step 2). |
| `ports: "3000:3000"` | Same host:container port mapping as the manual `docker run -p` earlier — makes the API reachable at `localhost:3000` from Windows. |
| `env_file: .env` | Loads environment variables (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, email/Cloudinary credentials, etc.) from a local `.env` file into the container at runtime — **without baking them into the image**. |
| `depends_on: mongo` | Tells Compose to start the `mongo` service before `auth-api`. (Note: this only controls *start order*, not "wait until MongoDB is actually ready to accept connections" — that's a separate, more advanced concern.) |

#### `mongo:` service
| Key | Meaning |
|---|---|
| `image: mongo` | Instead of building a custom image, pull the official pre-built MongoDB image from Docker Hub. |
| `ports: "27017:27017"` | Publishes MongoDB's default port to the host too — mainly useful for connecting via MongoDB Compass/GUI tools from Windows directly, for debugging. Not strictly required for `auth-api` to talk to `mongo` (they can already reach each other over the internal Compose network). |
| `volumes: mongo-data:/data/db` | Mounts a **named volume** called `mongo-data` to `/data/db` inside the container — the exact path where MongoDB stores its database files. This is what makes data survive container restarts/recreation (explained in detail in Section 10). |

#### `volumes:` (top-level)
```yaml
volumes:
  mongo-data:
```
Declares `mongo-data` as a **Docker-managed named volume**. Docker stores this data outside the container's writable layer, in a location it manages on the host — so it persists independently of the container's lifecycle.

---

## 9. Step 7 — The Critical Networking Fix: `127.0.0.1` vs `mongo`

### The problem encountered

The `MONGODB_URI` originally pointed to:

```
mongodb://127.0.0.1:27017/authDB
```

This **worked when Node ran directly on Windows** (because MongoDB was also running directly on Windows, on `localhost`). But once both services moved into **separate containers**, this connection string **failed inside the `auth-api` container**.

### Why it failed

Inside a container, `127.0.0.1` / `localhost` refers to **the container itself**, not the host machine and not any other container. Since the `auth-api` container has no MongoDB process running inside it, connecting to `127.0.0.1:27017` inside that container finds nothing.

### The fix

```
mongodb://mongo:27017/authDB
```

### Why this works

Docker Compose automatically creates an internal **network** shared by all services defined in the same `docker-compose.yml`. On this network, Compose runs an internal DNS resolver that maps **each service's name** (`mongo`, `auth-api`) to that service's container IP address.

So `mongo` in the connection string isn't a placeholder — it is literally resolved via Docker's internal DNS to the `mongo` container's private IP address on the Compose network.

```
auth-api container                    mongo container
   (Express)          ── DNS: "mongo" ──►   (MongoDB)
   connects to                                :27017
   mongodb://mongo:27017/authDB
```

**Concept learned:** *Inside Docker Compose, containers should refer to each other by service name, never by `127.0.0.1`/`localhost` — that always means "myself."* This is one of the most common real-world Docker networking bugs, and encountering + fixing it firsthand is a strong practical milestone.

---

## 10. Step 8 — Building and Running via Compose

```powershell
docker compose up
```

### Explanation

- `docker compose up` — Reads `docker-compose.yml`, builds any images that need building (`auth-api`, via its `build: .`), pulls any images that need pulling (`mongo`), creates the shared network, creates the named volume if it doesn't exist, and starts all services.
- Running it without `-d` streams logs from all containers directly to the terminal (useful the first time, to watch for connection errors like the `127.0.0.1` issue above).

### Detached mode (used after the setup was confirmed working)

```powershell
docker compose up -d
```
`-d` = "detached" — runs containers in the background and returns control of the terminal immediately.

### Checking running services

```powershell
docker compose ps
```
Lists containers belonging to this Compose project, their status, and port mappings. Confirmed output looked like:

```
auth-api-auth-api-1   Up 5 minutes   0.0.0.0:3000->3000/tcp
auth-api-mongo-1      Up 5 minutes   27017/tcp
```

**Naming pattern explanation:** Compose auto-names containers as `<project-folder>-<service-name>-<index>`. Since the project folder is `auth-api` and the services are `auth-api` and `mongo`, Compose produced `auth-api-auth-api-1` and `auth-api-mongo-1`.

### Validating the merged configuration

```powershell
docker compose config
```
Prints the fully resolved configuration Compose will actually use (after merging defaults, `.env` substitutions, etc.) — useful for confirming environment variables and settings are being read correctly before starting containers.

---

## 11. Step 9 — Testing the API End-to-End

```powershell
Invoke-RestMethod http://localhost:3000
```

(PowerShell's equivalent of `curl`.)

### Expected result

```
message
-------
Authentication API Running
```

This came directly from the app's root route:

```js
app.get("/", (req, res) => {
    res.json({
        message: "Authentication API Running",
    });
});
```

### What this single test actually proves

```
Browser / PowerShell (Windows host)
        │
        ▼
   localhost:3000
        │
        ▼   (Docker port mapping: 3000 → 3000)
   auth-api container
        │
        ▼
     Express
        │
        ▼
     GET "/"
        │
        ▼
   JSON response returned
```

A successful response confirms the **entire chain** works: host-to-container port mapping, the container's Node process running correctly, Express routing, and (implicitly, since the server started without crashing) a successful MongoDB connection via Mongoose at startup.

---

## 12. Step 10 — MongoDB Persistence via Named Volumes (Concept Introduced)

### The core question this addresses
**"What happens to my data if I stop, remove, or recreate the MongoDB container?"**

### Why this matters
By default, anything written *inside* a container's own filesystem is deleted when that container is removed (`docker rm` / `docker compose down` without volume flags, or recreated via `docker compose up --build`). For a database, this would mean **losing all data every time the container is rebuilt** — clearly unacceptable.

### The solution already in place

```yaml
volumes:
  mongo-data:

services:
  mongo:
    volumes:
      - mongo-data:/data/db
```

- `mongo-data:/data/db` mounts the **named volume** `mongo-data` at MongoDB's actual data directory, `/data/db`.
- Docker stores the *actual* volume data in a location it manages on the host (outside any single container's writable layer).
- When the `mongo` container is stopped, removed, and recreated, Docker **reattaches the same `mongo-data` volume** to the new container — so MongoDB sees its existing data files at `/data/db` again, as if nothing happened.

```
Container lifecycle (ephemeral):
  mongo container v1 ──(removed)──► gone
  mongo container v2 ──(created)──► fresh container, SAME mongo-data volume attached

Volume lifecycle (persistent):
  mongo-data volume ───────────────────────────────────────► survives across all of the above
```

### Practical verification plan (for the *next* exercise)
1. Insert data into MongoDB (e.g., register a user through the API).
2. Stop and remove the `mongo` container (`docker compose down`, or `docker rm` after `docker stop`).
3. Recreate it (`docker compose up`).
4. Confirm the previously-inserted data is still present (e.g., `GET` the user again).

This turns "Docker volumes persist data" from an abstract statement into a directly observed, hands-on fact.

---

## 13. Full Command Reference (Everything Used So Far)

| Command | Purpose |
|---|---|
| `docker --version` | Check installed Docker Engine version. |
| `docker compose version` | Check installed Docker Compose version. |
| `docker run hello-world` | Sanity-check that Docker is installed and can run containers. |
| `docker run --name redis-dev -p 6379:6379 -d redis` | Run a standalone Redis container by name, mapped to host port 6379, detached. |
| `cd "path"` / `dir` | Navigate to and inspect the existing project folder before containerizing it. |
| `docker build -t auth-api .` | Build a Docker image named `auth-api` from the `Dockerfile` in the current directory. |
| `docker run -p 3000:3000 auth-api` | Run a single container from the `auth-api` image, mapping port 3000. |
| `docker compose up` | Build/pull images and start **all** services defined in `docker-compose.yml`, streaming logs. |
| `docker compose up -d` | Same as above, but detached (runs in background). |
| `docker compose ps` | List containers belonging to the current Compose project and their status/ports. |
| `docker compose config` | Print the fully resolved/merged Compose configuration (good for debugging env vars). |
| `Invoke-RestMethod http://localhost:3000` | PowerShell equivalent of `curl` — used to test the API is reachable and responding. |

---

## 14. Concept Glossary (Plain-English Reference)

| Term | Plain-English meaning |
|---|---|
| **Image** | A read-only blueprint/snapshot containing an app + everything it needs to run (OS layer, runtime, dependencies, code). Built once, run many times. |
| **Container** | A live, running instance of an image — like an object is to a class. |
| **Dockerfile** | The recipe used to build an image. |
| **Build context** | The set of files/folders Docker is allowed to see and `COPY` from during a build (controlled by where you run `docker build` and by `.dockerignore`). |
| **Layer caching** | Docker caches the result of each Dockerfile instruction; unchanged instructions (and everything before them) are reused on rebuild, speeding things up — hence copying `package*.json` before the rest of the code. |
| **`.dockerignore`** | Excludes files/folders from the build context (e.g., `node_modules`, `.env`, `.git`). |
| **Port mapping (`-p` / `ports:`)** | Connects a port on the host machine to a port inside a container, in `HOST:CONTAINER` format. |
| **Docker Compose** | A tool for defining and running multi-container applications from a single YAML file, instead of many manual `docker run` commands. |
| **Service (in Compose)** | One container definition inside `docker-compose.yml`; its name doubles as a DNS hostname other services can use. |
| **Compose network** | An internal, private network Compose automatically creates so services can reach each other by service name. |
| **Named volume** | Docker-managed persistent storage that lives outside any single container, so data survives container removal/recreation. |
| **`env_file`** | Loads environment variables from a file (e.g., `.env`) into a container at runtime, without baking secrets into the image itself. |
| **`depends_on`** | Controls the *start order* of services in Compose (does not guarantee the dependency is fully "ready," only that it has started). |

---

## 15. Status Summary at End of This Session

```
Docker fundamentals       ████████████████████ 100%
Docker Compose basics     ████████████████████ 100%
Real Node + Mongo app     ████████████████████ 100%   ← Exercise 5 complete

Production preparation    ███████░░░░░░░░░░░░░  ~35%
Render deployment         ░░░░░░░░░░░░░░░░░░░░   0%
React production deploy   ░░░░░░░░░░░░░░░░░░░░   0%
```

### Exercise 5 — Completed items
- [x] `Dockerfile` created and explained instruction-by-instruction
- [x] `.dockerignore` created and explained
- [x] Image built manually (`docker build`)
- [x] Container run manually (`docker run -p`)
- [x] `docker-compose.yml` created for `auth-api` + `mongo`
- [x] Compose networking understood (service-name DNS, `mongo:27017` vs `127.0.0.1:27017` bug fixed)
- [x] Named volume (`mongo-data`) added for MongoDB persistence
- [x] Full stack started via `docker compose up` / `-d`
- [x] Verified via `docker compose ps`
- [x] API tested end-to-end via `Invoke-RestMethod http://localhost:3000` → `"Authentication API Running"`

### Not yet done (planned next)
- [ ] **Exercise 6**: Prove volume persistence hands-on (insert data → remove `mongo` container → recreate → confirm data survived)
- [ ] Production vs development Docker configuration
- [ ] Moving secrets fully to Render's environment variable system
- [ ] Switching MongoDB from a local container to a cloud-hosted MongoDB provider for production
- [ ] Hardening the Dockerfile for production (non-root user, image size, caching strategy)
- [ ] Correctly listening on Render's dynamic `process.env.PORT`
- [ ] Git/GitHub setup ensuring `.env` is never committed
- [ ] Actual Render deployment walkthrough
- [ ] Production CORS configuration
- [ ] React frontend production build + deployment, pointed at the deployed API URL
- [ ] Full production testing pass (auth, JWT, cookies, uploads, Cloudinary, email, CORS, error handling)

---

*End of Exercise 5 documentation. This file is meant to be a standalone reference — re-reading Sections 4–12 alone should be enough to fully reconstruct the reasoning behind every file and command used to Dockerize `auth-api`.*


