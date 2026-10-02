# AGENTS.md

This file tells AI coding agents (Claude Code, Copilot, Cursor, Codex, etc.) how to work in this repository. It is written for an **Applied Programming** course project: a web or mobile app designed and built by a student. Agents must follow these rules for every change, large or small.

---

## 1. Project Details (student fills this in)

- **App name:** Cookmarked
- **One-sentence description:**
- **Platform:** PWA
- **Language(s):** TypeScript
- **Frameworks:** React with TypeScript and Vite
- **Data storage:** Supabase
- **Test framework(s):** ViTest
- **Command to run the app:**
- **Command to run all tests:**
- **Command to run a single test file:**
- **Command to run the linter/formatter:**
- **Notes:** The domain layer is to be implemented in Supabase edge functions. Deployment will be done using CloudFlare. We'll use pnpm instead of npm where possible.

---

## 2. How Agents Should Behave in This Project

This is a learning environment. The student is responsible for understanding every line of code in the project. Agents must support that.

1. **Work in small steps.** Make one focused change at a time. Prefer several small, reviewable changes over one large one.
2. **Explain your reasoning.** After each change, briefly state what you changed, which layer it belongs to, and why.
3. **Follow the architecture in Section 3.** If a request would violate it, say so and propose a version that fits.
4. **Follow the test-first process in Section 4.** No production code without a failing test first.
5. **Ask before big decisions.** Adding a new dependency, changing the database schema, restructuring folders, or introducing a new pattern requires the student's approval first.
6. **Do not invent requirements.** If behavior is unclear, ask the student instead of guessing.
7. **Never hide failures.** If tests fail, a command errors, or you are unsure something works, say so plainly.
8. **Keep secrets out of code.** API keys, passwords, and tokens go in environment variables or config files that are excluded by `.gitignore`. Never commit them.

---

## 3. Architecture: Three-Tier Design

Every piece of code in this project belongs to exactly one of three layers. Before writing any code, identify which layer it belongs in.

```
┌─────────────────────────────────────────┐
│  1. PRESENTATION LAYER                  │  What the user sees and touches
│     (UI, screens, components, routes)   │
└───────────────────┬─────────────────────┘
                    │ calls
┌───────────────────▼─────────────────────┐
│  2. BUSINESS LOGIC LAYER                │  The rules of your app
│     (services, domain models, rules)    │
└───────────────────┬─────────────────────┘
                    │ calls (through interfaces)
┌───────────────────▼─────────────────────┐
│  3. DATA ACCESS LAYER                   │  Where data lives and how it's fetched
│     (repositories, DB, APIs, storage)   │
└─────────────────────────────────────────┘
```

### The Dependency Rule

- **Presentation** may call **Business Logic**. It must **never** talk to the Data layer directly.
- **Business Logic** may use the **Data** layer only through **interfaces** (abstract contracts) that the Business layer defines. It must never import a database driver, ORM, HTTP client, or UI framework.
- **Data Access** implements those interfaces. It must never contain business rules and must never import UI code.
- Dependencies point **downward only**. A lower layer never imports from a higher one.

If you catch yourself importing a database library into a UI component, or a UI library into a service, stop: the code is in the wrong layer.

---

### 3.1 Presentation Layer

**Responsibility:** Display information and collect user input. It should be "thin": it knows _how to show things_, not _what the rules are_.

**Belongs here:**

- Screens, pages, views, and UI components
- Navigation and routing
- Local UI state (is this modal open? which tab is selected? is a spinner showing?)
- Form handling and **input format** checks (field is empty, email "looks like" an email) for immediate user feedback
- Formatting data for display (dates, currency, pluralization)
- Calling services in the Business layer and rendering the result or error
- Styling, layout, animations, accessibility attributes
- For web backends: HTTP route handlers / controllers that parse the request, call a service, and turn the result into an HTTP response. These are entry points, so they are presentation code and must stay thin.

**Does NOT belong here:**

- SQL, ORM queries, `fetch` calls to your database or third-party APIs, reading/writing local storage
- Business rules (pricing, permissions, eligibility, scoring, state transitions)
- Calculations that matter to the app's correctness
- Anything you would need to copy if you built a second UI (e.g., a mobile version of your web app)

**Typical locations:**

- Web: `src/ui/`, `src/components/`, `src/pages/`, `src/routes/`, `src/controllers/`
- Mobile: `lib/ui/` (Flutter), `src/screens/` (React Native), `Views/` and `ViewModels/` (SwiftUI/Android)

---

### 3.2 Business Logic Layer

**Responsibility:** The heart of the app. It enforces the rules that make your app _your app_. It should be plain code in your language with no framework dependencies, which makes it the easiest layer to test.

**Belongs here:**

- Domain models / entities (e.g., `Task`, `Workout`, `Order`, `Recipe`) and their behavior
- Business rules and **real validation** (a task's due date cannot be in the past; a user cannot join more than 5 groups; a score cannot be negative)
- Services / use cases that perform one meaningful action (e.g., `completeTask`, `placeOrder`, `logWorkout`)
- Calculations (totals, streaks, averages, rankings, recommendations)
- Authorization rules (who is allowed to do what)
- **Interfaces** for data access (e.g., `TaskRepository` with `findById`, `save`, `delete`)
- Custom domain errors (e.g., `TaskNotFoundError`, `DueDateInPastError`)

**Does NOT belong here:**

- Any import of a UI framework (React, Flutter widgets, SwiftUI, Android views)
- Any import of a database driver, ORM, HTTP client, or storage API
- HTTP status codes, request/response objects, or UI strings meant for display
- Knowledge of _where_ data is stored

**Typical locations:** `src/domain/`, `src/services/`, `src/core/`, `lib/domain/`

---

### 3.3 Data Access Layer

**Responsibility:** Store and retrieve data. It translates between your domain models and whatever storage or external service you use.

**Belongs here:**

- Repository implementations (e.g., `PostgresTaskRepository`, `SqliteTaskRepository`, `FirebaseTaskRepository`) that implement the interfaces from the Business layer
- Database queries, ORM models, migrations, schema definitions
- HTTP clients for external APIs (weather, maps, payments, AI services)
- Local device storage (SQLite, AsyncStorage, SharedPreferences, Core Data, IndexedDB)
- Caching
- Mappers that convert database rows or API JSON (DTOs) into domain models and back

**Does NOT belong here:**

- Business rules or decisions ("if the user is premium, then...")
- UI code or display formatting
- Validation beyond what the storage itself requires

**Typical locations:** `src/data/`, `src/repositories/`, `src/infrastructure/`, `lib/data/`

---

### 3.4 Example: One Feature Across All Three Layers

Feature: _"A user can mark a task as complete, but not if it's already complete."_

```ts
// ── BUSINESS LAYER: src/domain/TaskRepository.ts ──
export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  save(task: Task): Promise<void>;
}

// ── BUSINESS LAYER: src/services/completeTask.ts ──
export async function completeTask(repo: TaskRepository, taskId: string): Promise<Task> {
  const task = await repo.findById(taskId);
  if (!task) throw new TaskNotFoundError(taskId);
  if (task.isComplete) throw new TaskAlreadyCompleteError(taskId);   // business rule
  const updated = { ...task, isComplete: true, completedAt: new Date() };
  await repo.save(updated);
  return updated;
}

// ── DATA LAYER: src/data/SqlTaskRepository.ts ──
export class SqlTaskRepository implements TaskRepository {
  constructor(private db: Database) {}
  async findById(id: string) {
    const row = await this.db.get("SELECT * FROM tasks WHERE id = ?", id);
    return row ? toTask(row) : null;                                  // mapping only
  }
  async save(task: Task) { /* INSERT or UPDATE */ }
}

// ── PRESENTATION LAYER: src/ui/TaskItem.tsx ──
function TaskItem({ task, taskService }) {
  const [error, setError] = useState<string | null>(null);
  const onCheck = async () => {
    try { await taskService.complete(task.id); }
    catch (e) { setError("This task is already done."); }             // display only
  };
  return <Checkbox checked={task.isComplete} onChange={onCheck} error={error} />;
}
```

Notice: the rule lives in one place (the service), the SQL lives in one place (the repository), and the UI only displays and reacts.

### 3.5 Wiring the Layers Together

Concrete data implementations are connected to services in **one place** at app startup (often called the _composition root_, e.g., `src/main.ts`, `src/app.ts`, `lib/main.dart`, or a dependency injection container). Services receive repositories as constructor or function parameters; they never create them. This is what lets tests swap in fakes.

---

## 4. Test-First Development (Required)

All production code in this project is written **test-first**. Agents must follow the Red → Green → Refactor cycle for every feature and every bug fix.

### 4.1 The Cycle

1. **RED — Write a failing test.**
   - Write the smallest test that describes one piece of the desired behavior.
   - Run it. Confirm it **fails**, and that it fails **for the expected reason** (e.g., an assertion fails or a function doesn't exist yet, not a typo or broken import).
   - Show the student the failing output.
2. **GREEN — Make it pass with the simplest code.**
   - Write only enough production code to make that test pass. No extra features "while you're in there."
   - Run the test again and confirm it passes. Then run the **full test suite** to confirm nothing else broke.
3. **REFACTOR — Clean up with tests as a safety net.**
   - Improve names, remove duplication, and simplify, without changing behavior.
   - Run the full suite again. It must still be green.
4. **Repeat** with the next small behavior.

### 4.2 Hard Rules for Agents

- **Never write production code before a failing test exists for it.**
- **Never delete, skip, or weaken a test to make it pass.** If a test seems wrong, stop and explain why to the student; let them decide.
- **Never change a test's expected value just to match what the code currently does**, unless the student confirms the requirement changed.
- **Bugs start with a test.** Before fixing a bug, write a test that reproduces it and fails. Then fix it. The test stays forever to prevent regressions.
- **One behavior per test.** If a test name needs the word "and," it's probably two tests.
- **Tests must be deterministic.** No reliance on the current time, random values, network access, or test execution order. Inject clocks and random generators when needed.
- **Do not mark work as done while any test is failing.**

### 4.3 What to Test in Each Layer

Follow the testing pyramid: many fast unit tests at the bottom, fewer slow tests at the top.

| Layer              | Test type                               | What to test                                                                                                                 | How                                                                                                                                  |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Business Logic** | Unit tests (the majority of your tests) | Every rule, calculation, validation, and error case in services and domain models                                            | Use **fake/in-memory repositories** that implement the interfaces. No database, no network, no UI. These should run in milliseconds. |
| **Data Access**    | Integration tests                       | Repositories correctly save, load, update, delete, and map data                                                              | Run against a real test database, in-memory SQLite, an emulator, or recorded API responses. Reset data between tests.                |
| **Presentation**   | Component / widget tests                | Components render the right thing for each state (loading, empty, error, success) and call the right service on user actions | Use your framework's testing library with **mocked services**. Test what the user sees, not internal implementation details.         |
| **Whole app**      | A few end-to-end tests                  | The most important user journeys (e.g., sign up → create item → see it in list)                                              | Playwright, Cypress, Detox, Maestro, or integration_test. Keep these few; they're slow.                                              |

**Start new features in the Business layer.** Test-drive the rule first, then the repository, then the UI.

### 4.4 Test Structure and Naming

Use **Arrange → Act → Assert**, and name tests so a failure explains itself:

```ts
describe("completeTask", () => {
  it("marks an incomplete task as complete", async () => {
    // Arrange
    const repo = new InMemoryTaskRepository([
      { id: "1", title: "Study", isComplete: false },
    ]);
    // Act
    const result = await completeTask(repo, "1");
    // Assert
    expect(result.isComplete).toBe(true);
  });

  it("throws TaskAlreadyCompleteError when the task is already complete", async () => {
    const repo = new InMemoryTaskRepository([
      { id: "1", title: "Study", isComplete: true },
    ]);
    await expect(completeTask(repo, "1")).rejects.toThrow(
      TaskAlreadyCompleteError,
    );
  });

  it("throws TaskNotFoundError when the task does not exist", async () => {
    const repo = new InMemoryTaskRepository([]);
    await expect(completeTask(repo, "missing")).rejects.toThrow(
      TaskNotFoundError,
    );
  });
});
```

For every behavior, consider: the normal case, edge cases (empty, zero, maximum, boundary values), and error cases.

### 4.5 Test File Locations

Mirror the source structure so tests are easy to find. Use whichever convention your framework prefers, and be consistent:

- Side by side: `src/services/completeTask.ts` and `src/services/completeTask.test.ts`
- Separate folder: `src/services/completeTask.ts` and `tests/services/completeTask.test.ts`

Shared fakes (like `InMemoryTaskRepository`) go in `tests/fakes/` or `test/support/`.

---

## 5. Suggested Folder Structure

Adapt names to your framework, but keep the three layers clearly separated.

```
src/
├── ui/              # PRESENTATION: screens, components, routes, view models
├── services/        # BUSINESS: use cases / application services
├── domain/          # BUSINESS: models, rules, errors, repository interfaces
├── data/            # DATA ACCESS: repository implementations, API clients, mappers
└── main.*           # Composition root: wires data implementations into services
tests/
├── unit/            # Business layer tests (most tests live here)
├── integration/     # Data layer tests
├── ui/              # Component / widget tests
├── e2e/             # End-to-end tests
└── fakes/           # In-memory repositories and other test doubles
```

---

## 6. Workflow for Every Task

When the student asks for a feature or fix, the agent should:

1. **Restate the requirement** in one or two sentences and ask about anything ambiguous.
2. **Identify the layers involved** and list the files you expect to create or change.
3. **Write the first failing test** (usually in the Business layer). Run it and show that it fails.
4. **Implement the minimum code** to pass. Run the full suite.
5. **Refactor** if needed. Run the full suite again.
6. **Repeat** steps 3–5 for the next behavior, moving outward to the Data and Presentation layers.
7. **Summarize** what was done: tests added, files changed, which layer each change belongs to, and anything the student should review or decide.

---

## 7. Definition of Done

A change is complete only when **all** of these are true:

- [ ] Every new behavior has a test that was written first and seen failing
- [ ] The full test suite passes
- [ ] Code is in the correct layer and follows the Dependency Rule
- [ ] No business rules in the UI; no database or API code in services
- [ ] No tests were deleted, skipped, or weakened without the student's approval
- [ ] Linter/formatter passes
- [ ] No secrets, credentials, or personal data committed
- [ ] The agent has explained the change so the student can understand and defend it

---

## 8. Common Mistakes to Refuse or Flag

Agents should push back on (and explain) any of these:

- Calling `fetch`, an ORM, or local storage directly inside a UI component
- Putting `if` statements that encode business rules inside a component or route handler
- Services that import UI or database libraries
- Writing implementation first and "adding tests later"
- Tests that hit the real network or production database
- Giant commits that touch many features at once
- Copying the same rule into several places instead of putting it in one service
