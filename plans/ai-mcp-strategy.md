# AI & MCP Strategy — Supply Chain Tracker Logistics

> This document plans the AI/MCP aspects: the required MCP server, the required `IA.md` file, and optional AI-powered features. Combined, these directly affect the **5% AI/MCP grade criterion** and contribute to **Innovation (15%)**.

---

## 1. Required: MCP Server — Foundry CLI Wrapper

**Source (README.md):** *"Construccion de un MCP que envuelva los cli de foundry anvil, cast, forge"*  
**Location:** `mcp-server/`  
**Language:** TypeScript  
**SDK:** `@modelcontextprotocol/sdk`

### Purpose

Allow Claude Code (or Claude Desktop) to operate the entire Foundry dev environment via natural language — compile, test, deploy, and interact with the smart contract — without leaving the AI interface.

### Setup

```bash
mkdir mcp-server && cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
npx tsc --init
```

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "esModuleInterop": true,
    "strict": true
  }
}
```

Update `package.json`:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Core Implementation Pattern

**File:** `mcp-server/src/index.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SC_DIR = path.join(PROJECT_ROOT, "sc");

async function runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout))
    );
  });
}

const server = new Server({ name: "foundry-mcp-server", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "forge_build",    description: "Compile smart contracts with forge build", inputSchema: { type: "object", properties: {} } },
    { name: "forge_test",     description: "Run Foundry tests", inputSchema: { type: "object", properties: { match: { type: "string" }, verbosity: { type: "number" } } } },
    { name: "forge_coverage", description: "Run forge coverage report", inputSchema: { type: "object", properties: {} } },
    { name: "forge_deploy",   description: "Deploy contract via forge script", inputSchema: { type: "object", properties: { rpcUrl: { type: "string" }, privateKey: { type: "string" } }, required: ["rpcUrl", "privateKey"] } },
    { name: "anvil_start",    description: "Start local Anvil blockchain", inputSchema: { type: "object", properties: { port: { type: "number" } } } },
    { name: "cast_call",      description: "Read-only contract call via cast", inputSchema: { type: "object", properties: { address: { type: "string" }, signature: { type: "string" }, args: { type: "array" }, rpcUrl: { type: "string" } }, required: ["address", "signature"] } },
    { name: "cast_send",      description: "State-changing contract call via cast", inputSchema: { type: "object", properties: { address: { type: "string" }, signature: { type: "string" }, args: { type: "array" }, privateKey: { type: "string" }, rpcUrl: { type: "string" } }, required: ["address", "signature", "privateKey"] } },
    { name: "cast_balance",   description: "Get ETH balance of an address", inputSchema: { type: "object", properties: { address: { type: "string" }, rpcUrl: { type: "string" } }, required: ["address"] } },
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const rpc = (args?.rpcUrl as string) || "http://localhost:8545";

  try {
    let result = "";
    switch (name) {
      case "forge_build":
        result = await runCommand("forge", ["build"], SC_DIR);
        break;
      case "forge_test": {
        const testArgs = ["test"];
        if (args?.match) testArgs.push("--match-test", args.match as string);
        const v = args?.verbosity ?? 2;
        testArgs.push("-" + "v".repeat(v as number));
        result = await runCommand("forge", testArgs, SC_DIR);
        break;
      }
      case "forge_coverage":
        result = await runCommand("forge", ["coverage"], SC_DIR);
        break;
      case "forge_deploy":
        result = await runCommand("forge", [
          "script", "script/Deploy.s.sol",
          "--rpc-url", rpc,
          "--private-key", args!.privateKey as string,
          "--broadcast"
        ], SC_DIR);
        break;
      case "anvil_start":
        result = "Anvil started. Run `anvil` manually in a terminal — spawning a persistent process from MCP is not recommended. Accounts: see anvil output.";
        break;
      case "cast_call":
        result = await runCommand("cast", [
          "call", args!.address as string, args!.signature as string,
          ...((args?.args as string[]) || []),
          "--rpc-url", rpc
        ], PROJECT_ROOT);
        break;
      case "cast_send":
        result = await runCommand("cast", [
          "send", args!.address as string, args!.signature as string,
          ...((args?.args as string[]) || []),
          "--private-key", args!.privateKey as string,
          "--rpc-url", rpc
        ], PROJECT_ROOT);
        break;
      case "cast_balance":
        result = await runCommand("cast", ["balance", args!.address as string, "--rpc-url", rpc], PROJECT_ROOT);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### Claude Code Integration

**File:** `/.mcp.json` (project root — committed to Git)
```json
{
  "mcpServers": {
    "foundry": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"]
    }
  }
}
```

After running `npm run build` in `mcp-server/`, Claude Code will expose all 8 tools. You can then say things like:
- *"Run all forge tests"*
- *"Build the contracts and tell me if there are any errors"*
- *"Call getShipment(1) on contract 0x..."*

---

## 2. Optional Extension: Natural Language Blockchain Queries (O16)

Add a 9th tool `query_shipment` that fetches shipment data and returns it human-readably:

```typescript
case "query_shipment": {
  const id = args!.shipmentId as string;
  const statusRaw = await runCommand("cast", [
    "call", CONTRACT_ADDRESS, "getShipment(uint256)(uint256,address,address,string,string,string,uint256,uint256,uint8,bool)",
    id, "--rpc-url", rpc
  ], PROJECT_ROOT);
  // Parse and format the output
  result = `Shipment ${id}:\n${statusRaw}`;
  break;
}
```

This lets Claude answer: *"What is the current status and route of shipment 3?"*

---

## 3. Required: IA.md File

**Location:** `IA.md` (project root)  
**Template to fill during development:**

```markdown
# AI Usage Documentation — LogistChain TFM

## 1. AI Tools Used

| Tool | Version | Purpose |
|---|---|---|
| Claude Code | claude-sonnet-4-6 | Primary dev assistant: contract design, Next.js pages, debugging, planning |
| Claude API | claude-sonnet-4-6 | In-app incident analysis (optional feature O17) |
| GitHub Copilot | — | Inline code completion in VS Code |

## 2. Time Breakdown (Approximate)

| Component | Total Hours | Hours with AI | Est. without AI |
|---|---|---|---|
| Smart contract (LogisticsTracker.sol) | | | |
| Contract tests (LogisticsTracker.t.sol) | | | |
| Frontend — Web3 infrastructure | | | |
| Frontend — Pages and components | | | |
| MCP server (mcp-server/) | | | |
| Documentation (README, diagrams, IA.md) | | | |
| **Total** | | | |

## 3. Most Common AI Errors Encountered

*(Fill this in as you develop — keep a log of issues)*

| Error | How AI got it wrong | Solution |
|---|---|---|
| ethers.js version mismatch | AI suggested v5 API (`provider.getSigner()`) in a v6 project | Explicitly tell AI "use ethers v6" in every prompt |
| Next.js 14 params as Promise | AI used sync `params.id` instead of `use(params).id` | Specify "Next.js 14 App Router" in prompts |
| Foundry test event syntax | AI used incorrect `vm.expectEmit` argument order | Cross-reference Foundry Book during review |
| Solidity mapping in struct | AI suggested `mapping` inside `Checkpoint` struct | Mappings can't be in structs in Solidity; use separate mapping |
| | | |

## 4. AI Chat References

- Claude Code session logs: saved in `.claude/` project directory
- Key prompts used:
  - "Design a Solidity contract for logistics shipment tracking with Foundry, using checkpoints and incidents..."
  - "Create a Next.js 14 App Router page for DHL-style shipment tracking timeline..."
  - "Build an MCP server in TypeScript that wraps forge, anvil, and cast CLI tools..."
```

---

## 4. Optional: AI-Powered Incident Analysis (O17)

**Component:** `web/src/app/api/analyze-incident/route.ts`

When an actor reports an incident, a "Get AI Analysis" button triggers this API route:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var

export async function POST(req: NextRequest) {
  const { incident, shipment, checkpoints } = await req.json();

  const prompt = `You are a logistics quality analyst. Analyze this shipping incident and suggest the most likely root cause and resolution steps.

Incident: ${incident.incidentType} - "${incident.description}"
Shipment: ${shipment.product} from ${shipment.origin} to ${shipment.destination}
Cold chain required: ${shipment.requiresColdChain}
Checkpoints so far: ${checkpoints.map((c: any) => `[${c.checkpointType}] ${c.location} - ${c.notes}`).join("; ")}

Provide:
1. Most likely root cause (2-3 sentences)
2. Recommended immediate actions (3 bullet points)
3. Preventive measures for future shipments (2 bullet points)`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  return NextResponse.json({
    analysis: (message.content[0] as { text: string }).text
  });
}
```

**Frontend integration** in `IncidentCard.tsx`:
```tsx
const [analysis, setAnalysis] = useState<string | null>(null);

const handleAnalyze = async () => {
  const res = await fetch("/api/analyze-incident", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incident, shipment, checkpoints }),
  });
  const data = await res.json();
  setAnalysis(data.analysis);
};
```

Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 5. Optional: Automated Shipment Report (O18)

**Component:** `web/src/app/api/generate-report/route.ts`

Generates a formatted summary of a shipment's full history using Claude:

```typescript
// Input: { shipment, checkpoints, incidents }
// Output: { report: string }  (markdown formatted)
// Prompt: "Generate a professional logistics shipment report..."
// Model: claude-haiku-4-5  (fast + cheap for simple report generation)
```

---

## 6. Documentation Strategy for Maximum AI/MCP Score

To score all 5% AI/MCP points:

1. **IA.md** — complete all 4 sections; be specific about time savings and error patterns
2. **README** — include a dedicated "Integración con Model Context Protocol" section with:
   - List of MCP tools implemented
   - Example: *"During development, I could run `forge test` directly through Claude Code by saying 'run the tests for the checkpoint recording function'"*
   - Code snippet of the `.mcp.json` config
3. **Demo video** — at 1:00-1:30 say: *"I built a custom MCP server so Claude Code can directly compile, test, and deploy the smart contracts. Let me show you..."* → demonstrate one forge_test call through Claude
4. **Be able to explain** every line of AI-generated code if asked in defense

### What the academy rewards

Per Instrucciones Generales §9:
- MCP server with documented tools (**3% of 5%**)
- Other AI tool usage documented (**2% of 5%**)
- Extra innovation points for AI features in the app (O17, O18) → counts toward Innovation **15%**
