# Self-Training LLM Agents: Research Seed

---

# Part 1: Framing

*Why this matters and what we're trying to build.*

---

## Executive Summary

This document outlines a research direction for building **autonomous self-improving AI systems** - small language models (like Gemma 3 270M) that can identify knowledge gaps, curate their own training data, and fine-tune themselves to become domain experts.

This approach represents a paradigm shift from **static learners** (trained once on massive datasets) to **autonomous researchers** (adaptive systems that learn on-demand).

---

## Core Concept

### The Vision
Build a small, efficient LLM that can:
1. **Admit ignorance** - Recognize when it lacks knowledge to solve a task
2. **Self-diagnose** - Identify specific knowledge gaps through attempted problem-solving
3. **Curate data** - Autonomously find and gather relevant training material
4. **Self-train** - Fine-tune its own weights to permanently acquire new expertise

### Why This Matters
- Moves from "memorize everything" to "know what you don't know"
- Enables adaptive AI that isn't frozen at a training cutoff date
- Makes AI specialization economically viable (small model = cheap training loops)
- Creates domain experts on-demand rather than pre-training for all domains

---

## Differentiation from Existing Approaches

| Approach | How This Differs |
|----------|------------------|
| **In-Context Learning** | Permanent weight changes vs. temporary prompt-based adaptation |
| **RAG (Retrieval-Augmented Generation)** | Knowledge internalized vs. retrieved at inference time |
| **Traditional Fine-Tuning** | Self-directed curriculum vs. human-curated datasets |
| **RLHF** | Self-supervised quality signals vs. human preference data |

---

## Key Assumptions and Risks

Before committing research effort, acknowledge these foundational bets:

| Assumption | Risk Level | Mitigation |
|------------|------------|------------|
| **270M models can do meta-cognition** | HIGH | Most uncertainty research uses >1B models. Validate early with entropy distribution experiments. Consider starting with 1B+ or "growing" the model. |
| **Entropy reliably signals ignorance** | MEDIUM | Over-smoothed models may produce medium-entropy "generic" answers. May need meta-classifier backup. |
| **Self-generated curriculum is faithful** | HIGH | Curriculum generation is where hallucination inbreeding enters. Requires rigorous verification. |
| **Same model can self-critique** | MEDIUM | Circular dependency—model may not catch its own errors. May need external verifier. |
| **LoRA updates don't cause forgetting** | LOW | Well-studied; LoRA isolates changes. But monitor for drift over many iterations. |
| **Consumer hardware is sufficient** | MEDIUM | LoRA training + vector DB + graph + model + tools simultaneously may exceed typical VRAM. |

**Blocking Research Questions:** If assumptions #1 or #3 fail, the approach may not be viable for small models. Prioritize validating these first.

### Hallucination Inbreeding (Primary Risk)

The primary failure mode: model misinterprets search results → trains on wrong interpretation → becomes "confidently wrong"

**Mitigation Strategies:**
- External verifiers (second LLM as "judge")
- Deterministic validators (code compilers, math checkers)
- Multi-source verification before training
- Confidence thresholds for training data quality

---

## Model Selection & Scaling Strategies

The 270M target is optimistic. This section explores alternatives and progressive scaling approaches.

### Why Gemma 3 as Starting Point

| Property | Benefit |
|----------|---------|
| Small size | Fine-tuning is fast (~5-10 min) and cheap |
| Local execution | Entire loop can run on consumer hardware |
| Modern architecture | Better meta-cognition than older small models |
| Reasoning optimized | Built for high-reasoning despite size |

### Candidate Base Models

| Model | Size | Strengths | Weaknesses | Use Case |
|-------|------|-----------|------------|----------|
| **Gemma 3 270M IT** | 270M | Fastest training, lowest cost | May lack meta-cognitive capacity | Proof-of-concept, resource-constrained |
| **FunctionGemma 270M IT** | 270M | Native function calling, tool use patterns | Same size limitations | Agent-first architecture, tool-heavy workflows |
| **Gemma 3 1B IT** | 1B | Balance of capability and cost | 4x training cost vs 270M | Recommended starting point if 270M fails validation |
| **Gemma 3 4B IT** | 4B | Strong reasoning, proven capabilities | 16x training cost, needs better GPU | Production deployment, accuracy-critical domains |

### The FunctionGemma Consideration

Starting with **FunctionGemma-270M-IT** instead of base Gemma 3 270M offers potential advantages:

| Aspect | Base Gemma 3 | FunctionGemma |
|--------|--------------|---------------|
| **Tool calling** | Must learn from scratch | Pre-trained for function signatures |
| **Structured output** | General text generation | Optimized for JSON/schema compliance |
| **Agent patterns** | Generic instruction following | Native understanding of tool→result→reasoning loops |
| **Self-training fit** | Exploration phase needs tool use | Already knows how to call search/retrieval tools |

**Hypothesis:** The exploration phase (Phase 2) heavily relies on tool calling. A model pre-trained for function calling may:
- Require less curriculum for tool use mechanics
- Make fewer errors in structured exploration
- Allow the self-training loop to focus on domain knowledge rather than tool syntax

**Risk:** FunctionGemma may be over-specialized—good at calling tools but weaker at general reasoning. Needs empirical comparison.

### Neurogenesis: Growing the Model

Rather than starting large, consider **progressive model scaling**—analogous to biological neurogenesis where neural networks grow during development.

#### The Concept

```
Phase 1: Train on 270M → Validate approach works
Phase 2: "Distill up" to 1B → Transfer learned patterns to larger model
Phase 3: Continue self-training on 1B → Accumulate more expertise
Phase 4: (Optional) Scale to 4B for production
```

#### Potential Mechanisms

| Approach | How It Works | Feasibility |
|----------|--------------|-------------|
| **Knowledge Distillation Up** | Use trained small model as teacher for larger student | Well-established technique |
| **LoRA Transfer** | Apply small-model LoRA adapters to larger base | Unclear if adapter structure transfers across sizes |
| **Checkpoint Warm-Start** | Initialize larger model with smaller model's weights (where dimensions match) | Requires compatible architectures |
| **Curriculum Transfer** | Use small model's generated curriculum to train larger model from scratch | Loses efficiency of pre-training |

#### Why Neurogenesis Matters for Self-Training

| Benefit | Explanation |
|---------|-------------|
| **De-risk early experiments** | Validate the approach on cheap 270M before committing to expensive 1B+ training |
| **Progressive capability** | Start with fast iteration cycles, grow capacity as needed |
| **Economic efficiency** | Only pay for larger model when smaller proves insufficient |
| **Architectural flexibility** | If 270M fundamentally can't do meta-cognition, pivot without sunk cost |

#### Open Questions

- Can LoRA adapters trained on 270M transfer meaningfully to 1B?
- Does the curriculum generated by 270M remain valid for 1B training?
- At what point does "growing" become more expensive than starting large?

### Recommended Validation Strategy

```
Step 1: Run Phase 0 experiments on BOTH Gemma 3 270M and Gemma 3 1B
        → Compare entropy distributions, self-critique capability
        
Step 2: If 270M passes validation:
        → Proceed with 270M, plan neurogenesis path for later
        
Step 2 (alt): If 270M fails but 1B passes:
        → Pivot to 1B as minimum viable size
        → Document 270M failure modes for future reference
        
Step 3: Evaluate FunctionGemma as alternative starting point
        → Compare tool-calling accuracy in exploration phase
```

---

# Part 2: Technical Architecture

*How the self-training system works.*

---

## Technical Architecture Overview

### Three-Phase Learning Loop

| Phase | Name | Mechanism |
|-------|------|-----------|
| **Phase 1** | Gap Analysis | Model attempts task using Chain-of-Thought; flags steps where it can't explain "why" or "how" |
| **Phase 2** | Targeted Exploration | Agent uses tools (search, vector DB) to find information for specific gaps |
| **Phase 3** | Self-Training | Model generates synthetic training data, runs LoRA fine-tuning to update weights |

### Key Technical Components

1. **Uncertainty Estimation**
   - Confidence scores on outputs
   - Entropy monitoring of token probability distributions
   - Meta-classifier to detect "guessing" behavior

2. **Ignorance Admission Training**
   - Negative data fine-tuning (training on unanswerable questions)
   - Trigger tokens (e.g., `<NEED_INFO>`) for explicit uncertainty signaling
   - Verbalized confidence alongside answers

3. **Automated Curriculum Generation**
   - Transform retrieved information into structured learning materials
   - Generate synthetic Q&A pairs
   - Create step-by-step tutorials for the original task

   **⚠️ This is where hallucination enters.** The transformation pipeline must be carefully designed:

   ```
   Retrieved Docs → [Extraction] → Key Facts → [Generation] → Q&A Pairs → [Verification] → Training Data
   ```

   | Stage | Method | Risk |
   |-------|--------|------|
   | **Extraction** | Extract factual claims from retrieved text | May miss context or misinterpret |
   | **Generation** | Generate questions that test each fact | Questions may be ambiguous |
   | **Verification** | Check generated Q&A against source docs | If skipped, trains on hallucinations |

   **Critical:** The curriculum generator should NOT be the same model being trained. Use either:
   - A larger, more capable model (expensive but safer)
   - Template-based extraction (less flexible but deterministic)
   - Human spot-checks on a sample (doesn't scale but validates)

4. **Parameter-Efficient Fine-Tuning (PEFT)**
   - LoRA (Low-Rank Adaptation) for fast weight updates
   - Enables "digesting" knowledge permanently vs. temporary context learning

---

## Entropy-Gated Learning (Deep Dive)

Entropy is the mathematical signature of ignorance. This section details how to use it as the core mechanism for self-awareness.

### The Probability Distribution: Sharp vs. Flat

When an LLM predicts the next token, it assigns a probability to every word in its vocabulary (e.g., 256,000 tokens for Gemma).

| State | Description | Distribution Shape |
|-------|-------------|-------------------|
| **Low Entropy** (High Confidence) | Model assigns 99% to "Paris", 0.001% to everything else | Tall, thin spike |
| **High Entropy** (Guessing) | Model assigns 5% to "Paris", 4% to "London", 4% to "Berlin"... | Flat, spread out |

### The Ignorance Score: Shannon Entropy

We quantify "flatness" using Shannon Entropy:

\[
H(X) = -\sum_{i=1}^{n} P(x_i) \log P(x_i)
\]

Where \(P(x_i)\) is the probability of a specific token.

- **H ≈ 0** → Model is certain
- **H is high** → Model is effectively rolling dice

**Threshold Rule:** If the average entropy of a generated sequence exceeds threshold τ, the model halts and triggers exploration:

```
if H(X) > τ:
    halt_generation()
    trigger_phase_2_exploration(confused_tokens_as_keywords)
```

**⚠️ τ Is Domain-Dependent:**

Entropy distributions vary significantly by task type:

| Task Type | Natural Entropy | Implication |
|-----------|-----------------|-------------|
| Factual QA ("What is the capital of France?") | Low baseline | τ can be strict (e.g., 2.0) |
| Creative writing | High baseline | τ must be permissive (e.g., 5.0) |
| Code generation | Medium, spiky | Entropy spikes at decision points are normal |
| Specialized domains | Varies by vocabulary | May need per-domain calibration |

**Calibration Strategy:** Before deploying to a new domain, measure entropy distributions on known-correct vs. known-incorrect answers to set domain-specific τ. A single global threshold will produce false positives (creative tasks) or false negatives (factual tasks).

### The Meta-Classifier: Internal Monitor

Raw entropy looks at final output. A **Meta-Classifier** (tiny ~1MB neural net) monitors the model's **hidden states** during processing.

**How it works:**
1. **Feature Extraction** - As Gemma processes a query, it generates internal activations
2. **Pattern Recognition** - Meta-classifier learns that pre-hallucination states have disorganized neuron firing patterns
3. **Early Intervention** - Before the first token generates, it can veto: "Internal state is unstable. Abort and trigger search."

**⚠️ Open Research Questions for Meta-Classifier:**

This component is under-specified and requires dedicated research:

| Question | Why It Matters |
|----------|----------------|
| **Which hidden states?** | Monitor attention patterns? Feed-forward activations? Final layer only or intermediate? |
| **Training data source** | Where do you get labeled examples of "about to hallucinate" vs. "confident and correct"? |
| **Generalization** | If trained on domain A, does it transfer to domain B? Or is it domain-specific? |
| **Small model viability** | Does a 270M model have sufficiently rich hidden states to distinguish these patterns? |

**Fallback Strategy:** If meta-classifier proves impractical for small models, rely solely on entropy monitoring with domain-calibrated thresholds. The meta-classifier is an enhancement, not a requirement for the core loop.

### Why This Matters for Small Models

Small models like Gemma 270M are prone to **over-smoothing** - giving generic, medium-probability answers instead of admitting uncertainty.

Entropy monitoring forces binary behavior:
- Either the model has a high-probability "expert" path through its weights
- Or it admits it's in a "high-entropy fog"

This prevents wasting compute on generating junk and redirects energy into learning.

---

## Neuro-Cognitive Memory Architecture

*Informed by the Functional Neuro-Cognitive RAG architecture (cbmind_spec).*

A self-training agent requires multiple memory systems that mirror biological cognitive processes. The original three-phase loop implicitly assumes memory exists, but doesn't specify *what kind*.

### Four-Tier Memory Model

| Memory Type | Storage | Function | Update Frequency |
|-------------|---------|----------|------------------|
| **Working Memory** | In-process state (LangGraph) | Immediate task context; holds variables during reasoning | Per-step |
| **Episodic Memory** | Vector Store (LanceDB) | Raw experiences: "what happened", "what was said" | Per-interaction |
| **Semantic Memory** | Knowledge Graph (FalkorDB) | Structured facts and relationships: "how things relate" | Batch (daily) |
| **Procedural Memory** | LoRA Adapters | Internalized skills baked into weights | Batch (nightly) |

### Memory Type Distinctions

**Episodic vs. Semantic:**
- **Episodic**: "On Tuesday, the user asked about Python decorators and I retrieved these 5 documents"
- **Semantic**: `(Python decorators) --[are_a]--> (metaprogramming pattern) --[used_for]--> (function modification)`

Episodic memory is *what you experienced*. Semantic memory is *what you know* extracted from those experiences.

**Implications for Self-Training:**
1. Gap detection (Phase 1) queries **semantic memory** first: "Do I have structured knowledge about this?"
2. Exploration (Phase 2) retrieves from **episodic memory** and external sources
3. Self-training (Phase 3) updates **procedural memory** (LoRA) and consolidates into **semantic memory** (graph)

### The Embedded Store Paradigm

For latency-critical self-training loops, prefer **embedded databases** over centralized services:

| Approach | Latency | Scaling |
|----------|---------|---------|
| Centralized Vector DB | Network RTT + DB processing | Bottleneck as compute scales |
| Embedded (LanceDB + S3) | Local NVMe cache | Storage scales infinitely on S3 |

This favors **session-based workloads**: an agent working on a topic loads relevant vectors into local cache, making subsequent reasoning steps fast.

### Minimum Viable Architecture

The four-tier memory system is the target state, but introduces operational complexity (four systems to synchronize). Start simpler:

**Phase 1: Vector-Only MVP**
```
Working Memory (LangGraph state) + Episodic Memory (LanceDB vectors) + Procedural Memory (LoRA)
```
- Skip the knowledge graph initially
- Semantic relationships encoded in vector embeddings
- Faster to build, easier to debug

**Phase 2: Add Graph When Needed**
Add FalkorDB semantic memory when you observe:
- Vector search returning thematically similar but factually wrong results
- Multi-hop reasoning failures ("X relates to Y relates to Z")
- Need for explicit relationship types (not just similarity)

**Bootstrap Problem:** An empty knowledge graph provides no value. Options:
- Pre-populate from a domain ontology (e.g., medical taxonomy)
- Extract entities/relationships from the first N training documents
- Start with vector-only and migrate to graph after accumulating enough episodic data

---

## HybridRAG Exploration Pattern

The exploration phase (Phase 2) should not rely on vector search alone. **HybridRAG** combines two retrieval modalities:

### Parallel Retrieval

```
Query → [Vector Search (LanceDB)] → Semantically similar chunks
      → [Graph Traversal (FalkorDB)] → Structurally related concepts
      → [Fusion] → Combined context for reasoning
```

### Why Both?

| Modality | Excels At | Fails At |
|----------|-----------|----------|
| **Vector Search** | Broad thematic retrieval, finding "similar" content | Precise multi-hop relationships |
| **Graph Traversal** | Explicit relationships, structured reasoning | Understanding nuance, similarity |

**Example:** Query: "What drug treats Patient X's symptoms?"
- Vector search finds paragraphs mentioning the symptoms
- Graph traversal: `(Patient X) → (Symptom Y) ← (Patient Z) → (Drug A)` finds a treatment connection that pure similarity search misses

### Context Fusion Strategy

1. **Graph facts** = high-confidence assertions (deterministic)
2. **Vector chunks** = supporting evidence (probabilistic)

The self-training phase should weight graph-verified information higher when generating training data.

---

## Self-Reflective Loops (Self-RAG)

The original three-phase loop lacks explicit *critique* before training. Adding a **Self-RAG** (Self-Reflective RAG) pattern prevents training on bad data.

### Extended Learning Loop

| Phase | Name | Mechanism |
|-------|------|-----------|
| **Phase 1** | Gap Analysis | Entropy monitoring detects uncertainty |
| **Phase 2** | Exploration | HybridRAG retrieval (vector + graph) |
| **Phase 2.5** | **Critique** | Evaluate retrieved content before training |
| **Phase 3** | Self-Training | Only train on critique-approved data |

### The Critique Node

A separate evaluation scores retrieved content:

| Score | Question | Action if Failed |
|-------|----------|------------------|
| **Relevance** | Does this address the original gap? | Retry retrieval with refined query |
| **Faithfulness** | Is this consistent with known facts (graph)? | Flag as potentially wrong |
| **Quality** | Is this training-worthy or noise? | Discard, don't train |

**⚠️ The Self-Critique Circularity Problem:**

If the model being trained also performs critique, there's a circular dependency: the model that didn't know the answer is now judging whether the answer is correct.

| Critique Approach | Pros | Cons |
|-------------------|------|------|
| **Same model critiques** | Fast, no extra inference | Circular—may not catch own errors |
| **Larger model as verifier** | More reliable | Expensive, negates "small model" benefit |
| **Rule-based validators** | Deterministic, fast | Only works for structured domains (code, math) |
| **Cross-verification** | Multiple sources must agree | Slower, may still share blind spots |

**Recommended Strategy:** Layer the approaches:
1. **First pass:** Rule-based validators for anything checkable (syntax, type consistency, math)
2. **Second pass:** Cross-verify claims against multiple retrieved sources
3. **Third pass (optional):** Larger model spot-checks on a sample of training data

Accept that critique is probabilistic. Design the training pipeline to be robust to occasional bad examples rather than requiring perfect filtering.

### Conditional Retry Logic

```
if critique.relevance < threshold:
    retry_exploration(refined_query)
elif critique.faithfulness < threshold:
    flag_for_verification()
elif critique.quality < threshold:
    discard()
else:
    proceed_to_training()
```

This creates a **closed-loop** system that "thinks before it learns."

---

## Batch Learning: The Sleep Cycle

Not all learning should happen online. A **Sleep/Wake cycle** separates active inference from consolidation.

### Day Phase (Active)

- Agent handles tasks, logs all interactions
- Checkpoints state after every reasoning step
- Accumulates raw experiences in episodic memory

### Night Phase (Batch Consolidation)

An **Extractor Agent** reviews daily logs:

1. **Fact Extraction**: Identify new assertions → write to **semantic memory** (graph)
   - "User confirmed Project X deadline is Friday" → `(Project X) --[deadline]--> (Friday)`

2. **Pattern Recognition**: Cluster similar queries, identify successful resolution paths

3. **Golden Q&A Generation**: Export high-rated interactions as training pairs
   - Successful resolutions become fine-tuning data

4. **LoRA Training**: Run Unsloth/QLoRA on curated dataset
   - Updates procedural memory with "muscle memory" for common tasks

### Why Batch?

| Online Learning | Batch Learning |
|-----------------|----------------|
| Immediate but noisy | Curated and verified |
| Risk of training on single bad example | Aggregates signal across many examples |
| Compute contention with inference | Dedicated training window |

The "Sleep Cycle" effectively **distills** daily experiences into permanent knowledge.

---

## Governance & Safety Patterns

Self-improvement loops risk infinite recursion ("cognitive neuroses") or runaway training on bad data.

### Loop Governance

| Mechanism | Purpose | Implementation |
|-----------|---------|----------------|
| **Recursion Limit** | Prevent infinite critique loops | `max_critique_iterations = 3` |
| **Critique Counter** | Track self-reflection depth | State variable incremented each loop |
| **Circuit Breaker** | Force conclusion if stuck | Supervisor override after threshold |
| **Time Travel** | Revert bad reasoning paths | Checkpoint system allows rollback |

### Training Safeguards

| Risk | Mitigation |
|------|------------|
| Training on hallucinated content | Multi-source verification before training |
| Catastrophic forgetting | LoRA isolates changes; base model untouched |
| Confidently wrong | Require graph-consistency check before training |
| Runaway self-modification | IAM separation: inference pods can't write to training data |

### Rollback Capability

Every training run produces a versioned LoRA adapter. If post-training evaluation shows degradation:
1. Revert to previous adapter version
2. Quarantine the bad training data
3. Log failure for analysis

---

## Multi-Adapter Serving Architecture

A self-training agent accumulates domain-specific expertise over time. This requires serving multiple LoRA adapters efficiently.

### The Multi-LoRA Pattern

Instead of N separate model deployments for N domains:
- Deploy **one base model** (e.g., Gemma 3)
- Load **multiple LoRA adapters** (~100MB each)
- Route requests to appropriate adapter by domain

```
Request: {"domain": "legal", "query": "..."}
       → vLLM routes to legal-adapter-v3
       → Inference with legal expertise

Request: {"domain": "medical", "query": "..."}
       → vLLM routes to medical-adapter-v2
       → Inference with medical expertise
```

### Adapter Lifecycle

1. **Creation**: Nightly training produces new adapter version
2. **Registration**: New adapter saved to S3/model registry
3. **Hot Swap**: Inference engine loads new adapter without restart
4. **Retirement**: Old adapters archived after validation period

### Implications for Self-Training

Each domain the agent learns becomes a **separate adapter**:
- Legal expertise → `legal-adapter-v1, v2, v3...`
- Medical expertise → `medical-adapter-v1, v2...`

The agent can thus become a **multi-domain expert** without base model bloat.

---

## Related Work: Titans & MIRAS

Google Research's [Titans architecture and MIRAS framework](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) (December 2024) introduces **test-time memorization** - a complementary approach that shares key concepts with self-training agents.

### The Connection: Surprise as a Signal

Titans uses a "surprise metric" conceptually similar to our entropy-based gap detection:

| Our System | Titans |
|------------|--------|
| High entropy = "I'm guessing" | High gradient = "This is unexpected" |
| Triggers exploration phase | Triggers memory update |
| Leads to weight update via LoRA | Updates memory module weights in real-time |

### How Titans Works

1. **Deep Neural Memory** - Instead of fixed-size RNN state, uses a multi-layer perceptron as memory
2. **Surprise-Driven Updates** - Large gradient between expected and actual input = "important, memorize this"
3. **Momentum + Forgetting** - Balances recent context with selective forgetting for long sequences

### Integration Opportunity

Titans solves a different but related problem: **how to maintain long-term memory efficiently during inference**.

A combined architecture could:
- Use **entropy gating** to detect knowledge gaps (our approach)
- Use **Titans-style memory** to maintain context during exploration
- Use **LoRA fine-tuning** to permanently internalize new knowledge

| Component | Role in Combined System |
|-----------|------------------------|
| Entropy Monitor | Detect "I don't know" states |
| Titans Memory Module | Maintain long context during search/exploration |
| LoRA Training | Permanently bake knowledge into weights |
| Meta-Classifier | Early intervention before hallucination |

### Key Insight from MIRAS

MIRAS provides a unified framework showing that transformers, RNNs, and state-space models are all forms of **associative memory** with different design choices:

- Memory architecture (vector, matrix, or deep MLP)
- Attentional bias (what to prioritize)
- Retention gate (how to forget)
- Memory algorithm (how to update)

This framework could inform the design of our self-training agent's memory system during the exploration phase.

---

# Part 3: Worked Example

*Putting it all together with a concrete scenario.*

---

## Worked Example: Learning the Rust Borrow Checker

A concrete end-to-end example of the self-training loop in action.

### Initial State
- Model: Gemma 3 270M with base weights (no domain adapters)
  - *Alternative: Run same test on 1B and FunctionGemma-270M for comparison*
- Query: "Explain why this Rust code fails to compile: `let x = String::from("hello"); let y = x; println!("{}", x);`"

### Phase 1: Gap Detection

Model attempts Chain-of-Thought reasoning:

```
Thinking: This is Rust code... String is a type... 
let y = x assigns x to y... then we print x...
[INTERNAL: entropy spike H=4.8 on tokens related to "ownership", "move", "borrow"]
```

**Entropy Analysis:**
- Average sequence entropy: H = 4.2
- Domain threshold τ (code): 3.0
- **Decision:** H > τ → trigger exploration

**Extracted Knowledge Gaps:** `["Rust ownership", "move semantics", "borrow checker"]`

### Phase 2: Targeted Exploration

Agent queries external sources with extracted keywords:

```
Vector Search (LanceDB): "Rust ownership move semantics" → 5 relevant chunks from Rust Book
Graph Traversal (if available): (Rust) → (ownership) → (move) → (String type)
```

**Retrieved Content:**
- "In Rust, each value has a single owner..."
- "When you assign a value to another variable, the original variable is *moved*..."
- "String does not implement Copy, so assignment moves ownership..."

### Phase 2.5: Critique

| Check | Score | Result |
|-------|-------|--------|
| Relevance | 0.92 | ✓ Directly addresses ownership question |
| Faithfulness | 0.88 | ✓ Consistent with official Rust docs |
| Quality | 0.85 | ✓ Clear, authoritative source |

**Decision:** Proceed to training.

### Phase 3: Curriculum Generation

**Extracted Facts:**
1. Each Rust value has exactly one owner
2. Assignment transfers ownership (move)
3. Moved values cannot be used
4. `String` is a move type (not `Copy`)

**Generated Q&A Pairs:**

```json
[
  {
    "question": "What happens when you assign a String variable to another variable in Rust?",
    "answer": "The ownership is moved to the new variable. The original variable becomes invalid and cannot be used."
  },
  {
    "question": "Why does `let y = x; println!(\"{}\", x);` fail when x is a String?",
    "answer": "Because String does not implement Copy. The assignment `let y = x` moves ownership to y, making x invalid. Attempting to use x after the move is a compile error."
  },
  {
    "question": "Which Rust types are moved vs copied on assignment?",
    "answer": "Types implementing the Copy trait (integers, booleans, chars) are copied. Heap-allocated types like String, Vec, and Box are moved."
  }
]
```

**Verification:** Each Q&A pair checked against source documents. All pass.

### Phase 3: LoRA Training

```
Training Config:
- Adapter: rust-ownership-v1
- Examples: 12 Q&A pairs
- Method: QLoRA (4-bit quantization)
- Duration: ~6 minutes on RTX 4090
```

### Post-Training Evaluation

**Same Query Re-asked:**

```
Query: "Explain why this Rust code fails to compile..."

Response: "This code fails because of Rust's ownership rules. When you write 
`let y = x`, ownership of the String is moved from x to y. After this move, 
x is no longer valid. The println! macro then tries to use x, which the 
compiler rejects because x has been moved. To fix this, you could either 
clone the String (`let y = x.clone()`) or borrow it (`let y = &x`)."

Entropy: H = 1.4 (below threshold)
```

**Result:** Model now answers confidently with correct explanation.

---

# Part 4: Research Planning

*What to investigate and how to proceed.*

---

## Evaluation Methodology

Before building, define what success looks like. Without clear metrics, you can't distinguish "the system works" from "the system overfits."

### Core Metrics

| Metric | What It Measures | How to Compute |
|--------|------------------|----------------|
| **Knowledge Acquisition Rate** | Does the model learn from exploration? | Pre/post accuracy on held-out test questions |
| **Generalization Score** | Does learning transfer beyond training examples? | Accuracy on related-but-different questions |
| **Hallucination Rate** | Does self-training introduce errors? | Factual accuracy on domain-specific benchmarks |
| **Calibration** | Do confidence scores match actual accuracy? | Expected Calibration Error (ECE) |
| **Efficiency** | Is self-training cost-effective vs. alternatives? | Accuracy-per-training-hour compared to static fine-tuning |

### Evaluation Protocol

**1. Held-Out Test Sets**

For each domain, maintain three test sets:
- **In-distribution:** Questions similar to training data (measures learning)
- **Near-distribution:** Related questions with different phrasing (measures generalization)
- **Out-of-distribution:** Unrelated questions (measures that learning doesn't break other capabilities)

**2. Ablation Checkpoints**

Measure at each stage of the loop:
- After gap detection: Was the gap correctly identified?
- After exploration: Was relevant information retrieved?
- After critique: Was bad data filtered?
- After training: Did accuracy improve?

**3. Longitudinal Tracking**

Over multiple self-training iterations:
- Does accuracy monotonically improve, or oscillate?
- Does the model accumulate errors (hallucination inbreeding)?
- Does it forget earlier knowledge (catastrophic forgetting)?

### Existing Benchmarks to Consider

| Benchmark | Domain | Relevance |
|-----------|--------|-----------|
| **TruthfulQA** | Factual accuracy | Tests resistance to common misconceptions |
| **MMLU** | Multi-domain knowledge | Baseline knowledge before/after |
| **HumanEval** | Code generation | If targeting code domains |
| **SelfCheckGPT** | Hallucination detection | Validates critique node effectiveness |

### Minimum Success Criteria (Proposed)

Before declaring the approach viable:
1. Post-training accuracy ≥ pre-training + 15% on target domain
2. Generalization score ≥ 70% of in-distribution accuracy
3. Hallucination rate does not increase after self-training
4. System remains calibrated (ECE < 0.1)

---

## Research Questions

Questions are prioritized into tiers:
- **🔴 Blocking:** Must answer before proceeding. If these fail, the approach may not be viable.
- **🟡 Important:** Significant impact on system design. Answer early.
- **🟢 Refinement:** Can iterate on after initial prototype works.

### Foundation

| # | Question | Priority |
|---|----------|----------|
| 1 | How do we reliably train a model to output calibrated uncertainty estimates? | 🔴 Blocking |
| 2 | What is the minimum model size needed for effective meta-cognition? | 🔴 Blocking |
| 3 | How do we prevent reward hacking in self-improvement loops? | 🟡 Important |

### Architecture

| # | Question | Priority |
|---|----------|----------|
| 4 | What verifier architecture best prevents hallucination propagation? | 🔴 Blocking |
| 5 | How should the exploration phase balance breadth vs. depth? | 🟢 Refinement |
| 6 | What's the optimal frequency/size of self-training updates? | 🟢 Refinement |

### Entropy & Meta-Cognition

| # | Question | Priority |
|---|----------|----------|
| 7 | What is the optimal entropy threshold τ for different task domains? | 🟡 Important |
| 8 | How do we train the meta-classifier to recognize pre-hallucination hidden states? | 🟡 Important |
| 9 | Can entropy monitoring work reliably on models as small as 270M parameters? | 🔴 Blocking |
| 10 | How do we distinguish "genuinely uncertain" from "poorly phrased question"? | 🟡 Important |

### Memory Architecture

| # | Question | Priority |
|---|----------|----------|
| 11 | How can Titans-style deep memory modules integrate with self-training loops? | 🟢 Refinement |
| 12 | What is the right balance between in-context memory and permanent weight updates? | 🟡 Important |
| 13 | How does the MIRAS framework inform retention/forgetting during exploration? | 🟢 Refinement |

### Neuro-Cognitive Memory (from cbmind)

| # | Question | Priority |
|---|----------|----------|
| 14 | How should episodic memory (vector) vs. semantic memory (graph) be partitioned? | 🟢 Refinement |
| 15 | What triggers consolidation from episodic → semantic memory? | 🟢 Refinement |
| 16 | How do we prevent semantic memory (graph) from becoming stale or inconsistent? | 🟢 Refinement |

### HybridRAG & Exploration

| # | Question | Priority |
|---|----------|----------|
| 17 | Should exploration use HybridRAG (vector + graph) or single-modality retrieval? | 🟢 Refinement |
| 18 | How do we fuse vector similarity results with graph traversal results? | 🟢 Refinement |
| 19 | What graph schema best supports self-training knowledge accumulation? | 🟢 Refinement |

### Self-Reflection & Critique

| # | Question | Priority |
|---|----------|----------|
| 20 | What critique model architecture balances accuracy with latency? | 🟡 Important |
| 21 | How many critique iterations before diminishing returns? | 🟢 Refinement |
| 22 | Can the same model self-critique, or does it require a separate verifier? | 🔴 Blocking |

### Batch Learning & Sleep Cycle

| # | Question | Priority |
|---|----------|----------|
| 23 | What is the optimal batch window for consolidation (hourly, daily, weekly)? | 🟢 Refinement |
| 24 | How do we identify "Golden Q&A" candidates from interaction logs? | 🟡 Important |
| 25 | How do we balance online learning responsiveness vs. batch learning quality? | 🟢 Refinement |

### Governance & Multi-Agent

| # | Question | Priority |
|---|----------|----------|
| 26 | Should self-training be single-agent or distributed across specialized sub-agents? | 🟢 Refinement |
| 27 | How do we implement effective circuit breakers for stuck reasoning loops? | 🟡 Important |
| 28 | What rollback strategies work for LoRA adapter versioning? | 🟡 Important |

### Data Quality

| # | Question | Priority |
|---|----------|----------|
| 29 | How do we ensure curated training data quality without human review? | 🔴 Blocking |
| 30 | What retrieval strategies minimize noise in gathered knowledge? | 🟡 Important |
| 31 | How do we detect and recover from training on bad data? | 🟡 Important |

### Evaluation

| # | Question | Priority |
|---|----------|----------|
| 32 | How do we measure genuine expertise vs. overfitting to specific examples? | 🟡 Important |
| 33 | What benchmarks exist for self-improving systems? | 🟡 Important |
| 34 | How do we track knowledge accumulation over time? | 🟢 Refinement |

### Model Selection & Neurogenesis

| # | Question | Priority |
|---|----------|----------|
| 35 | What is the minimum model size for reliable meta-cognition and self-critique? | 🔴 Blocking |
| 36 | Does FunctionGemma-270M-IT outperform base Gemma 3 for tool-heavy self-training loops? | 🟡 Important |
| 37 | Can LoRA adapters trained on 270M transfer meaningfully to 1B or 4B models? | 🟡 Important |
| 38 | Is "neurogenesis" (progressive scaling) more cost-effective than starting with a larger model? | 🟡 Important |
| 39 | What distillation techniques work for transferring self-trained knowledge to larger models? | 🟢 Refinement |
| 40 | Should the exploration agent use a different (larger) model than the model being trained? | 🟡 Important |
| 41 | At what model size does self-training become economically uncompetitive vs. static fine-tuning? | 🟢 Refinement |

### Summary of Blocking Questions

These seven questions must be answered positively before the approach is viable:

1. **#1:** Can we get calibrated uncertainty from small models?
2. **#2:** Is 270M large enough for meta-cognition?
3. **#4:** Can we build a verifier that catches hallucinations reliably?
4. **#9:** Does entropy monitoring work at 270M scale?
5. **#22:** Can the model self-critique, or is external verification required?
6. **#29:** Can we ensure training data quality without human review?
7. **#35:** What is the minimum model size for reliable self-training? (May override #2 and #9)

---

## Next Research Steps

### Phase 0.0: Environment Setup (Prerequisites)

Before running experiments, set up the research environment:

**Models**
- [ ] Download Gemma 3 270M IT weights (via Hugging Face or Kaggle)
- [ ] Download Gemma 3 1B IT weights (for comparison experiments)
- [ ] Download FunctionGemma 270M IT weights (for tool-calling comparison)
- [ ] Verify all models load and generate coherent outputs

**Infrastructure**
- [ ] Set up inference environment (vLLM recommended for logit access, or Hugging Face Transformers)
- [ ] Configure GPU environment (RTX 3090/4090 or cloud equivalent for training experiments)
- [ ] Install Unsloth or PEFT for LoRA fine-tuning
- [ ] Set up LanceDB for vector storage (exploration phase)

**Instrumentation**
- [ ] Implement entropy logging: capture token-level probability distributions during generation
- [ ] Create utilities to compute Shannon entropy from logits
- [ ] Build logging pipeline to record: prompt, response, per-token entropy, average entropy

**Test Data**
- [ ] Prepare test prompts across 3-4 domains:
  - Factual QA (e.g., geography, history—low expected entropy)
  - Code explanation (e.g., Rust, Python—medium expected entropy)
  - Creative writing (e.g., story generation—high expected entropy)
  - Specialized domain the model likely doesn't know (e.g., obscure API documentation)
- [ ] For each domain, prepare 20-50 prompts with known-correct answers
- [ ] Label prompts as "model should know" vs. "model likely doesn't know"

**Estimated Setup Time:** 1-2 days for a researcher familiar with the tools.

---

### Phase 0: Validate Core Assumptions (Do This First)

Before building anything, answer the blocking questions:

| Step | Goal | Output |
|------|------|--------|
| **0.1** | Entropy viability at 270M | Measure entropy distributions on Gemma 3 across known vs. unknown domains. Document whether entropy reliably separates "confident" from "guessing." |
| **0.2** | Uncertainty calibration | Survey existing work on uncertainty quantification in small LLMs. Identify if calibrated confidence is achievable or if we need a different signal. |
| **0.3** | Self-critique feasibility | Test whether Gemma 3 can critique its own outputs. Run experiments with simple factual questions where ground truth is known. |
| **0.4** | Model size comparison | Run 0.1-0.3 on Gemma 3 270M, 1B, and FunctionGemma-270M. Document capability differences vs. cost tradeoffs. |
| **0.5** | FunctionGemma evaluation | Compare tool-calling accuracy between base Gemma and FunctionGemma in exploration scenarios. |

**Decision Gate:** If Phase 0 shows entropy doesn't work at 270M scale, either:
- Target a larger model (1B+)
- Use FunctionGemma if tool-calling is the bottleneck
- Plan neurogenesis path (start 270M, scale to 1B later)
- Pivot to external verification only
- Abandon the small-model self-training approach

### Phase 1: Literature Review

| Step | Goal | Output |
|------|------|--------|
| **1.1** | Self-training landscape | Analyze Self-Instruct, STaR, and related self-training papers. Identify what works and what fails. |
| **1.2** | Titans/MIRAS deep dive | Read the papers, understand the surprise metric implementation. Assess integration opportunity. |
| **1.3** | Verifier architectures | Investigate verifier architectures that scale to open-ended domains. |

### Phase 2: Prototype Core Loop

| Step | Goal | Output |
|------|------|--------|
| **2.1** | Gap detection module | Implement entropy monitoring with configurable threshold τ. Validate on known domains. |
| **2.2** | Exploration agent | Build retrieval agent (vector-only MVP, skip graph initially). |
| **2.3** | Curriculum generator | Implement Q&A pair generation with verification against source docs. |
| **2.4** | LoRA training integration | Wire up Unsloth/QLoRA training on generated curriculum. |
| **2.5** | End-to-end test | Run the Rust borrow checker example (or similar) end-to-end. Measure before/after accuracy. |

### Phase 3: Refinement

Only after Phase 2 demonstrates value:
- Add meta-classifier for hidden state monitoring
- Add HybridRAG (graph layer)
- Implement sleep cycle batch consolidation
- Add multi-adapter serving

### Phase 4: Neurogenesis (If Applicable)

If starting with 270M and need to scale:
- Experiment with LoRA transfer from 270M → 1B
- Test knowledge distillation approaches
- Validate curriculum transfer (reuse 270M-generated training data for 1B)
- Document cost/benefit of progressive scaling vs. starting large

### Deliverables After Each Phase

| Phase | Deliverable |
|-------|-------------|
| Phase 0.0 | Working environment with all models loaded, entropy instrumentation verified |
| Phase 0 | Go/no-go decision document with experimental evidence, model size recommendation |
| Phase 1 | Literature review summary, architectural recommendations |
| Phase 2 | Working prototype, evaluation results against baseline |
| Phase 3 | Production-ready system specification |
| Phase 4 | Neurogenesis playbook (if scaling path validated) |

---

## Target Spec Outputs

After research, produce specifications for:

### Core Components
- [ ] Gap detection module architecture
- [ ] **Entropy monitoring system** with configurable threshold τ
- [ ] **Meta-classifier** for hidden state analysis
- [ ] Exploration/retrieval agent design
- [ ] Curriculum generation pipeline
- [ ] Evaluation framework for measuring expertise acquisition

### Memory Architecture (from cbmind)
- [ ] **Four-tier memory system** (Working, Episodic, Semantic, Procedural)
- [ ] **Episodic memory** schema (vector store design, embedding strategy)
- [ ] **Semantic memory** schema (knowledge graph ontology)
- [ ] Memory consolidation pipeline (episodic → semantic transfer)

### Retrieval & Exploration
- [ ] **HybridRAG retrieval** combining vector search + graph traversal
- [ ] Context fusion strategy (prioritizing graph facts vs. vector evidence)
- [ ] Query refinement for failed retrievals

### Self-Reflection & Critique
- [ ] **Critique node architecture** (relevance, faithfulness, quality scoring)
- [ ] Conditional retry logic for failed critiques
- [ ] Verification system to prevent hallucination propagation

### Learning & Training
- [ ] **Sleep Cycle pipeline** (batch consolidation architecture)
- [ ] Golden Q&A extraction from interaction logs
- [ ] Self-training loop with safety guardrails
- [ ] **Multi-LoRA adapter management** (versioning, hot-swap, rollback)

### Governance & Safety
- [ ] **Loop governance** (recursion limits, circuit breakers)
- [ ] Rollback strategy for bad training runs
- [ ] IAM separation between inference and training writes

### Model Selection & Neurogenesis
- [ ] **Base model comparison matrix** (270M vs 1B vs 4B vs FunctionGemma)
- [ ] **Minimum viable model size** for self-training (empirical results)
- [ ] **Neurogenesis pipeline** (LoRA transfer, distillation up, curriculum transfer)
- [ ] FunctionGemma evaluation for agent-first architectures
- [ ] Cost model: progressive scaling vs. starting large

---

## Keywords for Deep Research

### Core Concepts
`self-evolving LLM` `autonomous training` `uncertainty quantification` `calibrated confidence` `Self-Instruct` `STaR (Self-Taught Reasoner)` `LoRA fine-tuning` `meta-cognition in LLMs` `recursive self-improvement` `active learning` `curriculum learning`

### Entropy & Uncertainty
`Shannon entropy` `predictive entropy` `logit calibration` `confidence calibration` `epistemic uncertainty` `aleatoric uncertainty` `out-of-distribution detection` `selective prediction`

### Memory & Architecture
`Titans architecture` `MIRAS framework` `test-time memorization` `neural long-term memory` `associative memory` `state space models` `linear attention` `deep memory MLP`

### Neuro-Cognitive Memory (from cbmind)
`episodic memory` `semantic memory` `procedural memory` `working memory` `memory consolidation` `hippocampus-neocortex model` `embedded vector database` `knowledge graph` `LanceDB` `FalkorDB`

### HybridRAG & Retrieval
`HybridRAG` `graph RAG` `vector + graph retrieval` `context fusion` `multi-hop reasoning` `knowledge graph traversal` `semantic similarity` `structural relationships`

### Orchestration & Agents
`LangGraph` `cyclic orchestration` `stateful agents` `multi-agent topology` `supervisor-worker pattern` `blackboard architecture` `checkpointing` `time travel debugging`

### Self-Reflection
`Self-RAG` `critique loops` `faithfulness scoring` `relevance evaluation` `closed-loop reasoning` `iterative refinement`

### Batch Learning
`sleep cycle` `memory consolidation` `Golden Q&A` `nightly fine-tuning` `Unsloth` `QLoRA` `batch training` `online vs offline learning`

### Multi-Adapter Serving
`Multi-LoRA` `vLLM` `adapter hot-swap` `dynamic adapter loading` `domain-specific adapters` `adapter versioning`

### Safety & Verification
`hallucination detection` `LLM self-correction` `knowledge gap detection` `verbalized confidence` `meta-classifier` `hidden state analysis`

### Governance
`recursion limits` `circuit breakers` `loop governance` `rollback strategies` `IAM separation` `training data quarantine`

### Model Selection & Scaling
`neurogenesis` `progressive scaling` `knowledge distillation` `model growing` `LoRA transfer` `cross-size adaptation` `FunctionGemma` `function calling models` `tool-use pretraining` `distillation up` `capacity scaling`

---

# Appendix

---

## References

- [Titans + MIRAS: Helping AI have long-term memory](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) - Google Research, December 2024
- [Functional Neuro-Cognitive RAG with Embedded Stores](./cbmind_spec.md) - Architecture spec informing memory, HybridRAG, and Sleep Cycle patterns
- [LanceDB Documentation](https://lancedb.com/docs/overview/) - Embedded vector database
- [FalkorDB Documentation](https://docs.falkordb.com/) - Graph database for semantic memory
- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) - Stateful agent orchestration
- [Unsloth Fine-Tuning Guide](https://docs.unsloth.ai/get-started/fine-tuning-llms-guide) - Efficient LoRA training
- [vLLM Multi-LoRA](https://docs.vllm.ai/en/stable/features/lora.html) - Multi-adapter serving
