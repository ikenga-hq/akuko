/**
 * com.ikenga.studio — schema v1 (LANDED source of truth)
 *
 * This file is the canonical schema for com.ikenga.studio. It lives at
 * `ikenga-pkgs/packages/apps/studio/shared/schema.ts` and is published as
 * `@ikenga/studio-schema`. Earlier copies under `plans/studio/drafts/` are
 * superseded by this file — edit here, not there.
 *
 * LIFT PROVENANCE (prose only — no live imports back to these paths):
 *   pkgs/_review/studio/src/ui/video/lib/storyboard-schema.ts
 *   (byte-identical with royalti-video-engine/src/lib/storyboard-schema.ts —
 *    that engine was retired and deleted on 2026-09-08, WP-16; the path is kept
 *    here as provenance, not as somewhere to go looking)
 *
 * Lifted base: BeatStatus, Rung, the three per-rung schemas, Comment, the rung structure on Beat,
 * and the Narration block. Renamed Beat -> Cell at the boundary. Composition-engine-specific
 * fields (tsx_anchor, fixed still_path conventions) dropped or generalized to URI.
 *
 * Added on top (Round-2): Block, BlockParameter, Archetype, Anchor, AssetRef, Script, ScriptBeat,
 * project-level anchor library, archetype_id on Project, block_id? on Cell.
 *
 * Personal-mode collapse (Round-2): the 7-state approval machine collapses to `approved: boolean`.
 * Inline per-rung comments stay in the schema (they're cheap, useful even solo, and re-expanding
 * to threaded/attributed comments later is non-breaking).
 *
 * Added (Round-7): Project.aspect_ratio + resolution (G1), Project.audio_analysis (G4),
 * RenderRecord.{engine_version, model_id, cost_estimate, cost_actual} (G3 + model-churn traceability),
 * `.passthrough()` on Project / Cell / RenderRecord so unknown keys survive version skew (G9).
 */
import { z } from 'zod';
/**
 * Approval state on a (cell, rung) pair. **VESTIGIAL in personal mode (Round 8 / G13).**
 * Three approval representations exist in this schema — the per-rung `status` below,
 * `Cell.approved`, and `Project.approved`. Personal mode's live signal is `Cell.approved`
 * (single boolean, Round 2); **nothing writes per-rung `status` in P1**. It's lifted from
 * `_review/studio` and kept (like `Comment`) because it's cheap and re-expanding to the full
 * 7-state machine in Phase 3 is non-breaking — not because P1 populates it. Default writers
 * should set `'pending'` and leave it; the canvas reads `Cell.approved`, not these.
 */
export declare const BeatStatusSchema: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
export type BeatStatus = z.infer<typeof BeatStatusSchema>;
/** Fidelity rung. `0` = beat sheet (text only), `1` = lo-fi (wireframe), `2` = hi-fi. */
export declare const RungSchema: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
export type Rung = z.infer<typeof RungSchema>;
export declare const RUNG_LABELS: Record<number, Rung>;
export declare const RUNG_NUMBERS: Record<Rung, number>;
/**
 * On-disk directory token for a rung (Round 8 / G14). The filesystem uses the SHORT token,
 * not the enum value: `cells/<rungDir>/<uid>/…` and `renders/<engine>/<rungDir>/<uid>.mp4`.
 * Single source of truth — the sidecar + every renderer adapter derive paths via `rungDir(cell.rung)`,
 * never by string-slicing the enum. Keep every path example in 01-plan/05-tracking aligned to these.
 */
export declare const RUNG_DIR: Record<Rung, string>;
export declare const rungDir: (rung: Rung) => string;
/** Shot types (Storyboarder-aligned). */
export declare const ShotTypeSchema: z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>;
export type ShotType = z.infer<typeof ShotTypeSchema>;
/** Camera move enum. */
export declare const CameraMoveSchema: z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>;
export type CameraMove = z.infer<typeof CameraMoveSchema>;
/**
 * Output framing (Round 7 / G1). TikTok-first label content makes 9:16 a default
 * deliverable, not an export-time afterthought. Threaded through RenderContext +
 * composition.render({aspect_ratio?}). Default resolutions:
 *   16:9 → 1920×1080, 9:16 → 1080×1920, 1:1 → 1080×1080.
 */
export declare const AspectRatioSchema: z.ZodEnum<["16:9", "9:16", "1:1"]>;
export type AspectRatio = z.infer<typeof AspectRatioSchema>;
export declare const DEFAULT_RESOLUTION: Record<AspectRatio, {
    w: number;
    h: number;
}>;
/**
 * Cross-engine asset reference. URI is the only required field — relative paths
 * resolve against the project root, `file://` and `http(s)://` are absolute.
 * Never embed binary content in JSON.
 */
export declare const AssetRefSchema: z.ZodObject<{
    uri: z.ZodString;
    mime: z.ZodOptional<z.ZodString>;
    hash: z.ZodOptional<z.ZodString>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    uri: string;
    mime?: string | undefined;
    hash?: string | undefined;
    duration_ms?: number | undefined;
}, {
    uri: string;
    mime?: string | undefined;
    hash?: string | undefined;
    duration_ms?: number | undefined;
}>;
export type AssetRef = z.infer<typeof AssetRefSchema>;
/**
 * Project-level reusable reference. Used three ways:
 *   1. Plain asset reference for HF / Remotion cells (resolves to <img/>, <video/>, <audio/>).
 *   2. Style prior for AI-gen adapters (Phase 3 — character/style/location locking).
 *   3. Shared asset library — one source of truth across all cells in a project.
 *
 * Universal field on every Cell (`anchors: Anchor.id[]`); renderer-specific interpretation.
 */
export declare const AnchorSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
    asset: z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
    asset: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    };
    tags: string[];
    metadata: Record<string, unknown>;
}, {
    id: string;
    name: string;
    kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
    asset: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    };
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type Anchor = z.infer<typeof AnchorSchema>;
/** Type tag for a Block parameter. */
export declare const BlockParameterTypeSchema: z.ZodEnum<["string", "number", "boolean", "asset_ref", "anchor_ref", "enum"]>;
export type BlockParameterType = z.infer<typeof BlockParameterTypeSchema>;
/** A typed input to a Block's template. */
export declare const BlockParameterSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["string", "number", "boolean", "asset_ref", "anchor_ref", "enum"]>;
    default: z.ZodOptional<z.ZodUnknown>;
    required: z.ZodDefault<z.ZodBoolean>;
    enum_values: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
    name: string;
    required: boolean;
    default?: unknown;
    enum_values?: string[] | undefined;
    description?: string | undefined;
}, {
    type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
    name: string;
    default?: unknown;
    required?: boolean | undefined;
    enum_values?: string[] | undefined;
    description?: string | undefined;
}>;
export type BlockParameter = z.infer<typeof BlockParameterSchema>;
/**
 * Reusable composition atom. Ships inside the archetype skill that introduces it
 * (or `studio-core-blocks` for universals). The MCP `block.*` namespace aggregates
 * blocks from all installed archetype skills + core; `template_path` resolves
 * relative to the owning skill's directory.
 */
export declare const BlockSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["hook", "beat", "transition", "narration_pattern", "anchor_pack", "sfx", "music_preset", "cta", "sketch"]>;
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodOptional<z.ZodEnum<["narrative", "visual", "audio", "timing", "style"]>>;
    default_duration_ms: z.ZodOptional<z.ZodNumber>;
    default_renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "auto"]>>;
    template_path: z.ZodString;
    parameters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["string", "number", "boolean", "asset_ref", "anchor_ref", "enum"]>;
        default: z.ZodOptional<z.ZodUnknown>;
        required: z.ZodDefault<z.ZodBoolean>;
        enum_values: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
        name: string;
        required: boolean;
        default?: unknown;
        enum_values?: string[] | undefined;
        description?: string | undefined;
    }, {
        type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
        name: string;
        default?: unknown;
        required?: boolean | undefined;
        enum_values?: string[] | undefined;
        description?: string | undefined;
    }>, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    kind: "sketch" | "hook" | "beat" | "transition" | "narration_pattern" | "anchor_pack" | "sfx" | "music_preset" | "cta";
    tags: string[];
    metadata: Record<string, unknown>;
    description: string;
    default_renderer: "hyperframes" | "remotion" | "excalidraw" | "auto";
    template_path: string;
    parameters: {
        type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
        name: string;
        required: boolean;
        default?: unknown;
        enum_values?: string[] | undefined;
        description?: string | undefined;
    }[];
    category?: "audio" | "style" | "narrative" | "visual" | "timing" | undefined;
    default_duration_ms?: number | undefined;
}, {
    id: string;
    name: string;
    kind: "sketch" | "hook" | "beat" | "transition" | "narration_pattern" | "anchor_pack" | "sfx" | "music_preset" | "cta";
    description: string;
    template_path: string;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    category?: "audio" | "style" | "narrative" | "visual" | "timing" | undefined;
    default_duration_ms?: number | undefined;
    default_renderer?: "hyperframes" | "remotion" | "excalidraw" | "auto" | undefined;
    parameters?: {
        type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
        name: string;
        default?: unknown;
        required?: boolean | undefined;
        enum_values?: string[] | undefined;
        description?: string | undefined;
    }[] | undefined;
}>;
export type Block = z.infer<typeof BlockSchema>;
/** A single step in an archetype's chain — references a Block + per-instance bindings. */
export declare const ArchetypeChainEntrySchema: z.ZodObject<{
    block_id: z.ZodString;
    bindings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    block_id: string;
    bindings: Record<string, unknown>;
}, {
    block_id: string;
    bindings?: Record<string, unknown> | undefined;
}>;
export type ArchetypeChainEntry = z.infer<typeof ArchetypeChainEntrySchema>;
/**
 * A curated chain of Blocks. Seven built-in presets ship with the pkg
 * (explainer / product / ai-short / narrative / montage / tutorial / music-video);
 * user-custom archetypes save into `<project>/archetypes/` or the user-global dir.
 */
export declare const ArchetypeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    builtin: z.ZodDefault<z.ZodBoolean>;
    chain: z.ZodArray<z.ZodObject<{
        block_id: z.ZodString;
        bindings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        block_id: string;
        bindings: Record<string, unknown>;
    }, {
        block_id: string;
        bindings?: Record<string, unknown> | undefined;
    }>, "many">;
    default_total_duration_ms: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    metadata: Record<string, unknown>;
    description: string;
    builtin: boolean;
    chain: {
        block_id: string;
        bindings: Record<string, unknown>;
    }[];
    default_total_duration_ms?: number | undefined;
}, {
    id: string;
    name: string;
    description: string;
    chain: {
        block_id: string;
        bindings?: Record<string, unknown> | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
    builtin?: boolean | undefined;
    default_total_duration_ms?: number | undefined;
}>;
export type Archetype = z.infer<typeof ArchetypeSchema>;
/**
 * Per-beat script entry. OTIO-style scene/shot IDs (`sc3_sh2A`) make script ↔ storyboard
 * binding stable — beats carry `scene_id?` + `shot_id?` so external tools (FCPXML, OTIO,
 * Final Draft) can round-trip.
 */
export declare const ScriptBeatSchema: z.ZodObject<{
    id: z.ZodString;
    scene_id: z.ZodOptional<z.ZodString>;
    shot_id: z.ZodOptional<z.ZodString>;
    vo: z.ZodDefault<z.ZodString>;
    on_screen_text: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    duration_ms: z.ZodNumber;
    sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    transition: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    duration_ms: number;
    id: string;
    metadata: Record<string, unknown>;
    sfx: string[];
    vo: string;
    transition?: string | undefined;
    scene_id?: string | undefined;
    shot_id?: string | undefined;
    on_screen_text?: string | undefined;
    action?: string | undefined;
}, {
    duration_ms: number;
    id: string;
    metadata?: Record<string, unknown> | undefined;
    transition?: string | undefined;
    sfx?: string[] | undefined;
    scene_id?: string | undefined;
    shot_id?: string | undefined;
    vo?: string | undefined;
    on_screen_text?: string | undefined;
    action?: string | undefined;
}>;
export type ScriptBeat = z.infer<typeof ScriptBeatSchema>;
/**
 * Per-archetype script. Stored as `<project>/script.json` for most archetypes;
 * the `narrative` archetype reads `<project>/script.fountain` natively (parser
 * outputs to the same Zod shape in memory).
 */
export declare const ScriptArchetypeSchema: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
export type ScriptArchetype = z.infer<typeof ScriptArchetypeSchema>;
export declare const ScriptSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<1>;
    archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
    title: z.ZodString;
    duration_ms: z.ZodNumber;
    style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    music_preset: z.ZodOptional<z.ZodString>;
    beats: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        scene_id: z.ZodOptional<z.ZodString>;
        shot_id: z.ZodOptional<z.ZodString>;
        vo: z.ZodDefault<z.ZodString>;
        on_screen_text: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        transition: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        id: string;
        metadata: Record<string, unknown>;
        sfx: string[];
        vo: string;
        transition?: string | undefined;
        scene_id?: string | undefined;
        shot_id?: string | undefined;
        on_screen_text?: string | undefined;
        action?: string | undefined;
    }, {
        duration_ms: number;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        transition?: string | undefined;
        sfx?: string[] | undefined;
        scene_id?: string | undefined;
        shot_id?: string | undefined;
        vo?: string | undefined;
        on_screen_text?: string | undefined;
        action?: string | undefined;
    }>, "many">;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    duration_ms: number;
    metadata: Record<string, unknown>;
    schema_version: 1;
    archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
    title: string;
    style_anchors: string[];
    beats: {
        duration_ms: number;
        id: string;
        metadata: Record<string, unknown>;
        sfx: string[];
        vo: string;
        transition?: string | undefined;
        scene_id?: string | undefined;
        shot_id?: string | undefined;
        on_screen_text?: string | undefined;
        action?: string | undefined;
    }[];
    music_preset?: string | undefined;
}, {
    duration_ms: number;
    schema_version: 1;
    archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
    title: string;
    beats: {
        duration_ms: number;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        transition?: string | undefined;
        sfx?: string[] | undefined;
        scene_id?: string | undefined;
        shot_id?: string | undefined;
        vo?: string | undefined;
        on_screen_text?: string | undefined;
        action?: string | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
    music_preset?: string | undefined;
    style_anchors?: string[] | undefined;
}>;
export type Script = z.infer<typeof ScriptSchema>;
/**
 * Word-level alignment entry. Times in milliseconds from start of composition audio.
 * Lifted format aligns with ElevenLabs convert-with-timestamps output.
 */
export declare const NarrationWordSchema: z.ZodObject<{
    word: z.ZodString;
    start_ms: z.ZodNumber;
    end_ms: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    word: string;
    start_ms: number;
    end_ms: number;
}, {
    word: string;
    start_ms: number;
    end_ms: number;
}>;
export type NarrationWord = z.infer<typeof NarrationWordSchema>;
/**
 * Composition-level narration block. Populated after TTS; stale when any beat's
 * narration_excerpt changes after `generated_at`.
 */
export declare const NarrationBlockSchema: z.ZodObject<{
    audio: z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>;
    words: z.ZodArray<z.ZodObject<{
        word: z.ZodString;
        start_ms: z.ZodNumber;
        end_ms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        word: string;
        start_ms: number;
        end_ms: number;
    }, {
        word: string;
        start_ms: number;
        end_ms: number;
    }>, "many">;
    voice_id: z.ZodOptional<z.ZodString>;
    duration_ms: z.ZodNumber;
    generated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    duration_ms: number;
    audio: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    };
    words: {
        word: string;
        start_ms: number;
        end_ms: number;
    }[];
    generated_at: string;
    voice_id?: string | undefined;
}, {
    duration_ms: number;
    audio: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    };
    words: {
        word: string;
        start_ms: number;
        end_ms: number;
    }[];
    generated_at: string;
    voice_id?: string | undefined;
}>;
export type NarrationBlock = z.infer<typeof NarrationBlockSchema>;
/**
 * Music-video beat-map (Round 7 / G4). The music-video archetype is the one archetype
 * with audio-structural needs the other six lack. Populated by the `studio-beat-detect`
 * skill (shells `python3` + librosa — primary; madmom is an optional/contingency detector
 * only, Round 8 / G12 — over the project audio track). The Composition
 * timeline snaps cell durations to bar/beat boundaries when present. Optional everywhere —
 * absent for the other six archetypes. All arrays are millisecond offsets from track start.
 */
export declare const AudioAnalysisSchema: z.ZodObject<{
    bpm: z.ZodNumber;
    downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    source: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    analysed_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    beats: number[];
    bpm: number;
    downbeats: number[];
    onsets: number[];
    source?: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    } | undefined;
    analysed_at?: string | undefined;
}, {
    bpm: number;
    beats?: number[] | undefined;
    downbeats?: number[] | undefined;
    onsets?: number[] | undefined;
    source?: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    } | undefined;
    analysed_at?: string | undefined;
}>;
export type AudioAnalysis = z.infer<typeof AudioAnalysisSchema>;
/**
 * Rung 0 — beat sheet (text-only). The lifted shape is exactly right for our needs.
 */
export declare const BeatSheet0Schema: z.ZodObject<{
    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
    content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "pending-review" | "approved" | "needs-rework";
    content?: string | undefined;
}, {
    status: "pending" | "pending-review" | "approved" | "needs-rework";
    content?: string | undefined;
}>;
/**
 * Rung 1 — lo-fi. Lifted, but dropped `tsx_anchor` (composition-engine-specific path).
 * `still_path` generalized to optional AssetRef — works for HF, Remotion, AI adapters,
 * and arbitrary-folder projects.
 */
export declare const Lofi1Schema: z.ZodObject<{
    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
    still: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "pending-review" | "approved" | "needs-rework";
    still?: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    } | undefined;
}, {
    status: "pending" | "pending-review" | "approved" | "needs-rework";
    still?: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    } | undefined;
}>;
/**
 * Rung 2 — hi-fi. Lifted, `still_path` generalized as above.
 */
export declare const Hifi2Schema: z.ZodObject<{
    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
    still: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "pending-review" | "approved" | "needs-rework";
    still?: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    } | undefined;
}, {
    status: "pending" | "pending-review" | "approved" | "needs-rework";
    still?: {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    } | undefined;
}>;
/**
 * Inline per-rung note. Kept in the schema even though personal-mode UI doesn't
 * surface comment threading — useful for `TODO`-style annotations the
 * agent might leave for itself or the user. Round-3 comments + threading + pin
 * coordinates expand non-breaking.
 */
export declare const CommentSchema: z.ZodObject<{
    ts: z.ZodNumber;
    rung: z.ZodNumber;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ts: number;
    rung: number;
    text: string;
}, {
    ts: number;
    rung: number;
    text: string;
}>;
export type Comment = z.infer<typeof CommentSchema>;
export declare const RenderStatusSchema: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
export type RenderStatus = z.infer<typeof RenderStatusSchema>;
/**
 * Output of one renderer adapter invocation. Multiple records per cell allowed
 * (one per engine × variant). The latest `done` record per (engine, variant) is canonical.
 */
export declare const RenderRecordSchema: z.ZodObject<{
    id: z.ZodString;
    cell_uid: z.ZodString;
    engine: z.ZodString;
    engine_version: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    variant: z.ZodDefault<z.ZodString>;
    status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
    output: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    preview: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    cost_estimate: z.ZodOptional<z.ZodNumber>;
    cost_actual: z.ZodOptional<z.ZodNumber>;
    started_at: z.ZodOptional<z.ZodString>;
    finished_at: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    cell_uid: z.ZodString;
    engine: z.ZodString;
    engine_version: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    variant: z.ZodDefault<z.ZodString>;
    status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
    output: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    preview: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    cost_estimate: z.ZodOptional<z.ZodNumber>;
    cost_actual: z.ZodOptional<z.ZodNumber>;
    started_at: z.ZodOptional<z.ZodString>;
    finished_at: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    cell_uid: z.ZodString;
    engine: z.ZodString;
    engine_version: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    variant: z.ZodDefault<z.ZodString>;
    status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
    output: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    preview: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    cost_estimate: z.ZodOptional<z.ZodNumber>;
    cost_actual: z.ZodOptional<z.ZodNumber>;
    started_at: z.ZodOptional<z.ZodString>;
    finished_at: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
export type RenderRecord = z.infer<typeof RenderRecordSchema>;
/**
 * The atom of a storyboard. Lifted shape: id + label + time/frames ranges +
 * narration_excerpt + intent + rungs + comments. Added on top: production fields
 * (shot_type, camera_move, duration_ms, audio_cue), AI/reference-adherence
 * (prompt, anchors, seed, action, camera_text), content (renderer hint, content_path,
 * notes, reference_layer), block back-reference (block_id?), simplified approval.
 *
 * Renamed from `Beat` → `Cell` to disambiguate from `ScriptBeat` (script-side) and
 * from the lifted `_review/studio` Beat type.
 */
export declare const CellSchema: z.ZodObject<{
    uid: z.ZodString;
    beat_id: z.ZodString;
    rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
    index: z.ZodNumber;
    label: z.ZodString;
    block_id: z.ZodOptional<z.ZodString>;
    time: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>;
    frames: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>;
    narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    intent: z.ZodOptional<z.ZodString>;
    shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
    camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
    duration_ms: z.ZodDefault<z.ZodNumber>;
    audio_cue: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    prompt: z.ZodDefault<z.ZodString>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    seed: z.ZodOptional<z.ZodNumber>;
    action: z.ZodOptional<z.ZodString>;
    camera_text: z.ZodOptional<z.ZodString>;
    renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
    content_path: z.ZodString;
    notes: z.ZodDefault<z.ZodString>;
    reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>, "many">>;
    rungs: z.ZodObject<{
        '0_beat_sheet': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            content: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        }>;
        '1_lofi': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            still: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }>;
        '2_hifi': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            still: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        '0_beat_sheet': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        };
        '1_lofi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
        '2_hifi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
    }, {
        '0_beat_sheet': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        };
        '1_lofi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
        '2_hifi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
    }>;
    comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ts: z.ZodNumber;
        rung: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ts: number;
        rung: number;
        text: string;
    }, {
        ts: number;
        rung: number;
        text: string;
    }>, "many">>;
    approved: z.ZodDefault<z.ZodBoolean>;
    last_edited: z.ZodString;
    renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    uid: z.ZodString;
    beat_id: z.ZodString;
    rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
    index: z.ZodNumber;
    label: z.ZodString;
    block_id: z.ZodOptional<z.ZodString>;
    time: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>;
    frames: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>;
    narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    intent: z.ZodOptional<z.ZodString>;
    shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
    camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
    duration_ms: z.ZodDefault<z.ZodNumber>;
    audio_cue: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    prompt: z.ZodDefault<z.ZodString>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    seed: z.ZodOptional<z.ZodNumber>;
    action: z.ZodOptional<z.ZodString>;
    camera_text: z.ZodOptional<z.ZodString>;
    renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
    content_path: z.ZodString;
    notes: z.ZodDefault<z.ZodString>;
    reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>, "many">>;
    rungs: z.ZodObject<{
        '0_beat_sheet': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            content: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        }>;
        '1_lofi': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            still: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }>;
        '2_hifi': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            still: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        '0_beat_sheet': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        };
        '1_lofi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
        '2_hifi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
    }, {
        '0_beat_sheet': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        };
        '1_lofi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
        '2_hifi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
    }>;
    comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ts: z.ZodNumber;
        rung: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ts: number;
        rung: number;
        text: string;
    }, {
        ts: number;
        rung: number;
        text: string;
    }>, "many">>;
    approved: z.ZodDefault<z.ZodBoolean>;
    last_edited: z.ZodString;
    renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    uid: z.ZodString;
    beat_id: z.ZodString;
    rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
    index: z.ZodNumber;
    label: z.ZodString;
    block_id: z.ZodOptional<z.ZodString>;
    time: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>;
    frames: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>;
    narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    intent: z.ZodOptional<z.ZodString>;
    shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
    camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
    duration_ms: z.ZodDefault<z.ZodNumber>;
    audio_cue: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>>;
    prompt: z.ZodDefault<z.ZodString>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    seed: z.ZodOptional<z.ZodNumber>;
    action: z.ZodOptional<z.ZodString>;
    camera_text: z.ZodOptional<z.ZodString>;
    renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
    content_path: z.ZodString;
    notes: z.ZodDefault<z.ZodString>;
    reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>, "many">>;
    rungs: z.ZodObject<{
        '0_beat_sheet': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            content: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        }>;
        '1_lofi': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            still: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }>;
        '2_hifi': z.ZodObject<{
            status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
            still: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }, {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        '0_beat_sheet': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        };
        '1_lofi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
        '2_hifi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
    }, {
        '0_beat_sheet': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            content?: string | undefined;
        };
        '1_lofi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
        '2_hifi': {
            status: "pending" | "pending-review" | "approved" | "needs-rework";
            still?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
        };
    }>;
    comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ts: z.ZodNumber;
        rung: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ts: number;
        rung: number;
        text: string;
    }, {
        ts: number;
        rung: number;
        text: string;
    }>, "many">>;
    approved: z.ZodDefault<z.ZodBoolean>;
    last_edited: z.ZodString;
    renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
export type Cell = z.infer<typeof CellSchema>;
export declare const ProjectModeSchema: z.ZodEnum<["studio", "watch", "oneshot"]>;
export type ProjectMode = z.infer<typeof ProjectModeSchema>;
/**
 * Top-level project document. Stored as `<project>/storyboard.json`.
 *
 * Lifted base: slug, title, narration (full shape), current_rung, selected_concepts(_note),
 * beats[] (now `cells[]`).
 * Added: schema_version, mode, archetype_id, anchors[], script, approved, created_at,
 * updated_at, metadata.
 */
export declare const ProjectSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<1>;
    slug: z.ZodString;
    title: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["studio", "watch", "oneshot"]>>;
    archetype_id: z.ZodString;
    aspect_ratio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    resolution: z.ZodOptional<z.ZodObject<{
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        w: number;
        h: number;
    }, {
        w: number;
        h: number;
    }>>;
    audio_analysis: z.ZodOptional<z.ZodObject<{
        bpm: z.ZodNumber;
        downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        source: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        analysed_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        beats: number[];
        bpm: number;
        downbeats: number[];
        onsets: number[];
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }, {
        bpm: number;
        beats?: number[] | undefined;
        downbeats?: number[] | undefined;
        onsets?: number[] | undefined;
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }>>;
    selected_concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        role?: string | undefined;
    }, {
        filename: string;
        role?: string | undefined;
    }>, "many">>;
    selected_concepts_note: z.ZodOptional<z.ZodString>;
    current_rung: z.ZodDefault<z.ZodNumber>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
        asset: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags: string[];
        metadata: Record<string, unknown>;
    }, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">>;
    script: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        schema_version: z.ZodLiteral<1>;
        archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
        title: z.ZodString;
        duration_ms: z.ZodNumber;
        style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        music_preset: z.ZodOptional<z.ZodString>;
        beats: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            scene_id: z.ZodOptional<z.ZodString>;
            shot_id: z.ZodOptional<z.ZodString>;
            vo: z.ZodDefault<z.ZodString>;
            on_screen_text: z.ZodOptional<z.ZodString>;
            action: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            transition: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }, {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }>, "many">;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        metadata: Record<string, unknown>;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        style_anchors: string[];
        beats: {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        music_preset?: string | undefined;
    }, {
        duration_ms: number;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        beats: {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        metadata?: Record<string, unknown> | undefined;
        music_preset?: string | undefined;
        style_anchors?: string[] | undefined;
    }>>>;
    cells: z.ZodDefault<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    narration: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        audio: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        words: z.ZodArray<z.ZodObject<{
            word: z.ZodString;
            start_ms: z.ZodNumber;
            end_ms: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            word: string;
            start_ms: number;
            end_ms: number;
        }, {
            word: string;
            start_ms: number;
            end_ms: number;
        }>, "many">;
        voice_id: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        generated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }>>>;
    approved: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    schema_version: z.ZodLiteral<1>;
    slug: z.ZodString;
    title: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["studio", "watch", "oneshot"]>>;
    archetype_id: z.ZodString;
    aspect_ratio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    resolution: z.ZodOptional<z.ZodObject<{
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        w: number;
        h: number;
    }, {
        w: number;
        h: number;
    }>>;
    audio_analysis: z.ZodOptional<z.ZodObject<{
        bpm: z.ZodNumber;
        downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        source: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        analysed_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        beats: number[];
        bpm: number;
        downbeats: number[];
        onsets: number[];
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }, {
        bpm: number;
        beats?: number[] | undefined;
        downbeats?: number[] | undefined;
        onsets?: number[] | undefined;
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }>>;
    selected_concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        role?: string | undefined;
    }, {
        filename: string;
        role?: string | undefined;
    }>, "many">>;
    selected_concepts_note: z.ZodOptional<z.ZodString>;
    current_rung: z.ZodDefault<z.ZodNumber>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
        asset: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags: string[];
        metadata: Record<string, unknown>;
    }, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">>;
    script: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        schema_version: z.ZodLiteral<1>;
        archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
        title: z.ZodString;
        duration_ms: z.ZodNumber;
        style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        music_preset: z.ZodOptional<z.ZodString>;
        beats: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            scene_id: z.ZodOptional<z.ZodString>;
            shot_id: z.ZodOptional<z.ZodString>;
            vo: z.ZodDefault<z.ZodString>;
            on_screen_text: z.ZodOptional<z.ZodString>;
            action: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            transition: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }, {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }>, "many">;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        metadata: Record<string, unknown>;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        style_anchors: string[];
        beats: {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        music_preset?: string | undefined;
    }, {
        duration_ms: number;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        beats: {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        metadata?: Record<string, unknown> | undefined;
        music_preset?: string | undefined;
        style_anchors?: string[] | undefined;
    }>>>;
    cells: z.ZodDefault<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    narration: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        audio: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        words: z.ZodArray<z.ZodObject<{
            word: z.ZodString;
            start_ms: z.ZodNumber;
            end_ms: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            word: string;
            start_ms: number;
            end_ms: number;
        }, {
            word: string;
            start_ms: number;
            end_ms: number;
        }>, "many">;
        voice_id: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        generated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }>>>;
    approved: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    schema_version: z.ZodLiteral<1>;
    slug: z.ZodString;
    title: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["studio", "watch", "oneshot"]>>;
    archetype_id: z.ZodString;
    aspect_ratio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    resolution: z.ZodOptional<z.ZodObject<{
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        w: number;
        h: number;
    }, {
        w: number;
        h: number;
    }>>;
    audio_analysis: z.ZodOptional<z.ZodObject<{
        bpm: z.ZodNumber;
        downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        source: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        analysed_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        beats: number[];
        bpm: number;
        downbeats: number[];
        onsets: number[];
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }, {
        bpm: number;
        beats?: number[] | undefined;
        downbeats?: number[] | undefined;
        onsets?: number[] | undefined;
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }>>;
    selected_concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        role?: string | undefined;
    }, {
        filename: string;
        role?: string | undefined;
    }>, "many">>;
    selected_concepts_note: z.ZodOptional<z.ZodString>;
    current_rung: z.ZodDefault<z.ZodNumber>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
        asset: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags: string[];
        metadata: Record<string, unknown>;
    }, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">>;
    script: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        schema_version: z.ZodLiteral<1>;
        archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
        title: z.ZodString;
        duration_ms: z.ZodNumber;
        style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        music_preset: z.ZodOptional<z.ZodString>;
        beats: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            scene_id: z.ZodOptional<z.ZodString>;
            shot_id: z.ZodOptional<z.ZodString>;
            vo: z.ZodDefault<z.ZodString>;
            on_screen_text: z.ZodOptional<z.ZodString>;
            action: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            transition: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }, {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }>, "many">;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        metadata: Record<string, unknown>;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        style_anchors: string[];
        beats: {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        music_preset?: string | undefined;
    }, {
        duration_ms: number;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        beats: {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        metadata?: Record<string, unknown> | undefined;
        music_preset?: string | undefined;
        style_anchors?: string[] | undefined;
    }>>>;
    cells: z.ZodDefault<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    narration: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        audio: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        words: z.ZodArray<z.ZodObject<{
            word: z.ZodString;
            start_ms: z.ZodNumber;
            end_ms: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            word: string;
            start_ms: number;
            end_ms: number;
        }, {
            word: string;
            start_ms: number;
            end_ms: number;
        }>, "many">;
        voice_id: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        generated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }>>>;
    approved: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
export type Project = z.infer<typeof ProjectSchema>;
export declare const Schemas: {
    readonly AssetRef: z.ZodObject<{
        uri: z.ZodString;
        mime: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }, {
        uri: string;
        mime?: string | undefined;
        hash?: string | undefined;
        duration_ms?: number | undefined;
    }>;
    readonly Anchor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
        asset: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags: string[];
        metadata: Record<string, unknown>;
    }, {
        id: string;
        name: string;
        kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
        asset: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        tags?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
    readonly AudioAnalysis: z.ZodObject<{
        bpm: z.ZodNumber;
        downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        source: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        analysed_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        beats: number[];
        bpm: number;
        downbeats: number[];
        onsets: number[];
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }, {
        bpm: number;
        beats?: number[] | undefined;
        downbeats?: number[] | undefined;
        onsets?: number[] | undefined;
        source?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
        analysed_at?: string | undefined;
    }>;
    readonly Block: z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<["hook", "beat", "transition", "narration_pattern", "anchor_pack", "sfx", "music_preset", "cta", "sketch"]>;
        name: z.ZodString;
        description: z.ZodString;
        category: z.ZodOptional<z.ZodEnum<["narrative", "visual", "audio", "timing", "style"]>>;
        default_duration_ms: z.ZodOptional<z.ZodNumber>;
        default_renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "auto"]>>;
        template_path: z.ZodString;
        parameters: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodEnum<["string", "number", "boolean", "asset_ref", "anchor_ref", "enum"]>;
            default: z.ZodOptional<z.ZodUnknown>;
            required: z.ZodDefault<z.ZodBoolean>;
            enum_values: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
            name: string;
            required: boolean;
            default?: unknown;
            enum_values?: string[] | undefined;
            description?: string | undefined;
        }, {
            type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
            name: string;
            default?: unknown;
            required?: boolean | undefined;
            enum_values?: string[] | undefined;
            description?: string | undefined;
        }>, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        kind: "sketch" | "hook" | "beat" | "transition" | "narration_pattern" | "anchor_pack" | "sfx" | "music_preset" | "cta";
        tags: string[];
        metadata: Record<string, unknown>;
        description: string;
        default_renderer: "hyperframes" | "remotion" | "excalidraw" | "auto";
        template_path: string;
        parameters: {
            type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
            name: string;
            required: boolean;
            default?: unknown;
            enum_values?: string[] | undefined;
            description?: string | undefined;
        }[];
        category?: "audio" | "style" | "narrative" | "visual" | "timing" | undefined;
        default_duration_ms?: number | undefined;
    }, {
        id: string;
        name: string;
        kind: "sketch" | "hook" | "beat" | "transition" | "narration_pattern" | "anchor_pack" | "sfx" | "music_preset" | "cta";
        description: string;
        template_path: string;
        tags?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
        category?: "audio" | "style" | "narrative" | "visual" | "timing" | undefined;
        default_duration_ms?: number | undefined;
        default_renderer?: "hyperframes" | "remotion" | "excalidraw" | "auto" | undefined;
        parameters?: {
            type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
            name: string;
            default?: unknown;
            required?: boolean | undefined;
            enum_values?: string[] | undefined;
            description?: string | undefined;
        }[] | undefined;
    }>;
    readonly BlockParameter: z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["string", "number", "boolean", "asset_ref", "anchor_ref", "enum"]>;
        default: z.ZodOptional<z.ZodUnknown>;
        required: z.ZodDefault<z.ZodBoolean>;
        enum_values: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
        name: string;
        required: boolean;
        default?: unknown;
        enum_values?: string[] | undefined;
        description?: string | undefined;
    }, {
        type: "string" | "number" | "boolean" | "asset_ref" | "anchor_ref" | "enum";
        name: string;
        default?: unknown;
        required?: boolean | undefined;
        enum_values?: string[] | undefined;
        description?: string | undefined;
    }>;
    readonly Archetype: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        builtin: z.ZodDefault<z.ZodBoolean>;
        chain: z.ZodArray<z.ZodObject<{
            block_id: z.ZodString;
            bindings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            block_id: string;
            bindings: Record<string, unknown>;
        }, {
            block_id: string;
            bindings?: Record<string, unknown> | undefined;
        }>, "many">;
        default_total_duration_ms: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        metadata: Record<string, unknown>;
        description: string;
        builtin: boolean;
        chain: {
            block_id: string;
            bindings: Record<string, unknown>;
        }[];
        default_total_duration_ms?: number | undefined;
    }, {
        id: string;
        name: string;
        description: string;
        chain: {
            block_id: string;
            bindings?: Record<string, unknown> | undefined;
        }[];
        metadata?: Record<string, unknown> | undefined;
        builtin?: boolean | undefined;
        default_total_duration_ms?: number | undefined;
    }>;
    readonly ArchetypeChainEntry: z.ZodObject<{
        block_id: z.ZodString;
        bindings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        block_id: string;
        bindings: Record<string, unknown>;
    }, {
        block_id: string;
        bindings?: Record<string, unknown> | undefined;
    }>;
    readonly Script: z.ZodObject<{
        schema_version: z.ZodLiteral<1>;
        archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
        title: z.ZodString;
        duration_ms: z.ZodNumber;
        style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        music_preset: z.ZodOptional<z.ZodString>;
        beats: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            scene_id: z.ZodOptional<z.ZodString>;
            shot_id: z.ZodOptional<z.ZodString>;
            vo: z.ZodDefault<z.ZodString>;
            on_screen_text: z.ZodOptional<z.ZodString>;
            action: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            transition: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }, {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }>, "many">;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        metadata: Record<string, unknown>;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        style_anchors: string[];
        beats: {
            duration_ms: number;
            id: string;
            metadata: Record<string, unknown>;
            sfx: string[];
            vo: string;
            transition?: string | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        music_preset?: string | undefined;
    }, {
        duration_ms: number;
        schema_version: 1;
        archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
        title: string;
        beats: {
            duration_ms: number;
            id: string;
            metadata?: Record<string, unknown> | undefined;
            transition?: string | undefined;
            sfx?: string[] | undefined;
            scene_id?: string | undefined;
            shot_id?: string | undefined;
            vo?: string | undefined;
            on_screen_text?: string | undefined;
            action?: string | undefined;
        }[];
        metadata?: Record<string, unknown> | undefined;
        music_preset?: string | undefined;
        style_anchors?: string[] | undefined;
    }>;
    readonly ScriptBeat: z.ZodObject<{
        id: z.ZodString;
        scene_id: z.ZodOptional<z.ZodString>;
        shot_id: z.ZodOptional<z.ZodString>;
        vo: z.ZodDefault<z.ZodString>;
        on_screen_text: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        transition: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        id: string;
        metadata: Record<string, unknown>;
        sfx: string[];
        vo: string;
        transition?: string | undefined;
        scene_id?: string | undefined;
        shot_id?: string | undefined;
        on_screen_text?: string | undefined;
        action?: string | undefined;
    }, {
        duration_ms: number;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        transition?: string | undefined;
        sfx?: string[] | undefined;
        scene_id?: string | undefined;
        shot_id?: string | undefined;
        vo?: string | undefined;
        on_screen_text?: string | undefined;
        action?: string | undefined;
    }>;
    readonly Narration: z.ZodObject<{
        audio: z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>;
        words: z.ZodArray<z.ZodObject<{
            word: z.ZodString;
            start_ms: z.ZodNumber;
            end_ms: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            word: string;
            start_ms: number;
            end_ms: number;
        }, {
            word: string;
            start_ms: number;
            end_ms: number;
        }>, "many">;
        voice_id: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        generated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }, {
        duration_ms: number;
        audio: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        };
        words: {
            word: string;
            start_ms: number;
            end_ms: number;
        }[];
        generated_at: string;
        voice_id?: string | undefined;
    }>;
    readonly NarrationWord: z.ZodObject<{
        word: z.ZodString;
        start_ms: z.ZodNumber;
        end_ms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        word: string;
        start_ms: number;
        end_ms: number;
    }, {
        word: string;
        start_ms: number;
        end_ms: number;
    }>;
    readonly BeatSheet0: z.ZodObject<{
        status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
        content: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "pending-review" | "approved" | "needs-rework";
        content?: string | undefined;
    }, {
        status: "pending" | "pending-review" | "approved" | "needs-rework";
        content?: string | undefined;
    }>;
    readonly Lofi1: z.ZodObject<{
        status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
        still: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "pending-review" | "approved" | "needs-rework";
        still?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
    }, {
        status: "pending" | "pending-review" | "approved" | "needs-rework";
        still?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
    }>;
    readonly Hifi2: z.ZodObject<{
        status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
        still: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "pending-review" | "approved" | "needs-rework";
        still?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
    }, {
        status: "pending" | "pending-review" | "approved" | "needs-rework";
        still?: {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        } | undefined;
    }>;
    readonly Comment: z.ZodObject<{
        ts: z.ZodNumber;
        rung: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ts: number;
        rung: number;
        text: string;
    }, {
        ts: number;
        rung: number;
        text: string;
    }>;
    readonly RenderRecord: z.ZodObject<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        cell_uid: z.ZodString;
        engine: z.ZodString;
        engine_version: z.ZodOptional<z.ZodString>;
        model_id: z.ZodOptional<z.ZodString>;
        variant: z.ZodDefault<z.ZodString>;
        status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
        output: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        preview: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        cost_estimate: z.ZodOptional<z.ZodNumber>;
        cost_actual: z.ZodOptional<z.ZodNumber>;
        started_at: z.ZodOptional<z.ZodString>;
        finished_at: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly Cell: z.ZodObject<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        uid: z.ZodString;
        beat_id: z.ZodString;
        rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
        index: z.ZodNumber;
        label: z.ZodString;
        block_id: z.ZodOptional<z.ZodString>;
        time: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        frames: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>;
        narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        intent: z.ZodOptional<z.ZodString>;
        shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
        camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
        duration_ms: z.ZodDefault<z.ZodNumber>;
        audio_cue: z.ZodOptional<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>>;
        prompt: z.ZodDefault<z.ZodString>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        seed: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodString>;
        camera_text: z.ZodOptional<z.ZodString>;
        renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
        content_path: z.ZodString;
        notes: z.ZodDefault<z.ZodString>;
        reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            mime: z.ZodOptional<z.ZodString>;
            hash: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }, {
            uri: string;
            mime?: string | undefined;
            hash?: string | undefined;
            duration_ms?: number | undefined;
        }>, "many">>;
        rungs: z.ZodObject<{
            '0_beat_sheet': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                content: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            }>;
            '1_lofi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
            '2_hifi': z.ZodObject<{
                status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                still: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }, {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }, {
            '0_beat_sheet': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                content?: string | undefined;
            };
            '1_lofi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
            '2_hifi': {
                status: "pending" | "pending-review" | "approved" | "needs-rework";
                still?: {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                } | undefined;
            };
        }>;
        comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ts: z.ZodNumber;
            rung: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ts: number;
            rung: number;
            text: string;
        }, {
            ts: number;
            rung: number;
            text: string;
        }>, "many">>;
        approved: z.ZodDefault<z.ZodBoolean>;
        last_edited: z.ZodString;
        renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            cell_uid: z.ZodString;
            engine: z.ZodString;
            engine_version: z.ZodOptional<z.ZodString>;
            model_id: z.ZodOptional<z.ZodString>;
            variant: z.ZodDefault<z.ZodString>;
            status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
            output: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            preview: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            cost_estimate: z.ZodOptional<z.ZodNumber>;
            cost_actual: z.ZodOptional<z.ZodNumber>;
            started_at: z.ZodOptional<z.ZodString>;
            finished_at: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly Project: z.ZodObject<{
        schema_version: z.ZodLiteral<1>;
        slug: z.ZodString;
        title: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        mode: z.ZodDefault<z.ZodEnum<["studio", "watch", "oneshot"]>>;
        archetype_id: z.ZodString;
        aspect_ratio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
        resolution: z.ZodOptional<z.ZodObject<{
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            w: number;
            h: number;
        }, {
            w: number;
            h: number;
        }>>;
        audio_analysis: z.ZodOptional<z.ZodObject<{
            bpm: z.ZodNumber;
            downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            source: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            analysed_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            beats: number[];
            bpm: number;
            downbeats: number[];
            onsets: number[];
            source?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
            analysed_at?: string | undefined;
        }, {
            bpm: number;
            beats?: number[] | undefined;
            downbeats?: number[] | undefined;
            onsets?: number[] | undefined;
            source?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
            analysed_at?: string | undefined;
        }>>;
        selected_concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            filename: z.ZodString;
            role: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            filename: string;
            role?: string | undefined;
        }, {
            filename: string;
            role?: string | undefined;
        }>, "many">>;
        selected_concepts_note: z.ZodOptional<z.ZodString>;
        current_rung: z.ZodDefault<z.ZodNumber>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
            asset: z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
            asset: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            tags: string[];
            metadata: Record<string, unknown>;
        }, {
            id: string;
            name: string;
            kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
            asset: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            tags?: string[] | undefined;
            metadata?: Record<string, unknown> | undefined;
        }>, "many">>;
        script: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            schema_version: z.ZodLiteral<1>;
            archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
            title: z.ZodString;
            duration_ms: z.ZodNumber;
            style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            music_preset: z.ZodOptional<z.ZodString>;
            beats: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                scene_id: z.ZodOptional<z.ZodString>;
                shot_id: z.ZodOptional<z.ZodString>;
                vo: z.ZodDefault<z.ZodString>;
                on_screen_text: z.ZodOptional<z.ZodString>;
                action: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodNumber;
                sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                transition: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strip", z.ZodTypeAny, {
                duration_ms: number;
                id: string;
                metadata: Record<string, unknown>;
                sfx: string[];
                vo: string;
                transition?: string | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }, {
                duration_ms: number;
                id: string;
                metadata?: Record<string, unknown> | undefined;
                transition?: string | undefined;
                sfx?: string[] | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                vo?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }>, "many">;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            metadata: Record<string, unknown>;
            schema_version: 1;
            archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
            title: string;
            style_anchors: string[];
            beats: {
                duration_ms: number;
                id: string;
                metadata: Record<string, unknown>;
                sfx: string[];
                vo: string;
                transition?: string | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }[];
            music_preset?: string | undefined;
        }, {
            duration_ms: number;
            schema_version: 1;
            archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
            title: string;
            beats: {
                duration_ms: number;
                id: string;
                metadata?: Record<string, unknown> | undefined;
                transition?: string | undefined;
                sfx?: string[] | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                vo?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }[];
            metadata?: Record<string, unknown> | undefined;
            music_preset?: string | undefined;
            style_anchors?: string[] | undefined;
        }>>>;
        cells: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        narration: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            audio: z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>;
            words: z.ZodArray<z.ZodObject<{
                word: z.ZodString;
                start_ms: z.ZodNumber;
                end_ms: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                word: string;
                start_ms: number;
                end_ms: number;
            }, {
                word: string;
                start_ms: number;
                end_ms: number;
            }>, "many">;
            voice_id: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            generated_at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            audio: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            words: {
                word: string;
                start_ms: number;
                end_ms: number;
            }[];
            generated_at: string;
            voice_id?: string | undefined;
        }, {
            duration_ms: number;
            audio: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            words: {
                word: string;
                start_ms: number;
                end_ms: number;
            }[];
            generated_at: string;
            voice_id?: string | undefined;
        }>>>;
        approved: z.ZodDefault<z.ZodBoolean>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        schema_version: z.ZodLiteral<1>;
        slug: z.ZodString;
        title: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        mode: z.ZodDefault<z.ZodEnum<["studio", "watch", "oneshot"]>>;
        archetype_id: z.ZodString;
        aspect_ratio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
        resolution: z.ZodOptional<z.ZodObject<{
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            w: number;
            h: number;
        }, {
            w: number;
            h: number;
        }>>;
        audio_analysis: z.ZodOptional<z.ZodObject<{
            bpm: z.ZodNumber;
            downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            source: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            analysed_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            beats: number[];
            bpm: number;
            downbeats: number[];
            onsets: number[];
            source?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
            analysed_at?: string | undefined;
        }, {
            bpm: number;
            beats?: number[] | undefined;
            downbeats?: number[] | undefined;
            onsets?: number[] | undefined;
            source?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
            analysed_at?: string | undefined;
        }>>;
        selected_concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            filename: z.ZodString;
            role: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            filename: string;
            role?: string | undefined;
        }, {
            filename: string;
            role?: string | undefined;
        }>, "many">>;
        selected_concepts_note: z.ZodOptional<z.ZodString>;
        current_rung: z.ZodDefault<z.ZodNumber>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
            asset: z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
            asset: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            tags: string[];
            metadata: Record<string, unknown>;
        }, {
            id: string;
            name: string;
            kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
            asset: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            tags?: string[] | undefined;
            metadata?: Record<string, unknown> | undefined;
        }>, "many">>;
        script: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            schema_version: z.ZodLiteral<1>;
            archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
            title: z.ZodString;
            duration_ms: z.ZodNumber;
            style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            music_preset: z.ZodOptional<z.ZodString>;
            beats: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                scene_id: z.ZodOptional<z.ZodString>;
                shot_id: z.ZodOptional<z.ZodString>;
                vo: z.ZodDefault<z.ZodString>;
                on_screen_text: z.ZodOptional<z.ZodString>;
                action: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodNumber;
                sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                transition: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strip", z.ZodTypeAny, {
                duration_ms: number;
                id: string;
                metadata: Record<string, unknown>;
                sfx: string[];
                vo: string;
                transition?: string | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }, {
                duration_ms: number;
                id: string;
                metadata?: Record<string, unknown> | undefined;
                transition?: string | undefined;
                sfx?: string[] | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                vo?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }>, "many">;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            metadata: Record<string, unknown>;
            schema_version: 1;
            archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
            title: string;
            style_anchors: string[];
            beats: {
                duration_ms: number;
                id: string;
                metadata: Record<string, unknown>;
                sfx: string[];
                vo: string;
                transition?: string | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }[];
            music_preset?: string | undefined;
        }, {
            duration_ms: number;
            schema_version: 1;
            archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
            title: string;
            beats: {
                duration_ms: number;
                id: string;
                metadata?: Record<string, unknown> | undefined;
                transition?: string | undefined;
                sfx?: string[] | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                vo?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }[];
            metadata?: Record<string, unknown> | undefined;
            music_preset?: string | undefined;
            style_anchors?: string[] | undefined;
        }>>>;
        cells: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        narration: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            audio: z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>;
            words: z.ZodArray<z.ZodObject<{
                word: z.ZodString;
                start_ms: z.ZodNumber;
                end_ms: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                word: string;
                start_ms: number;
                end_ms: number;
            }, {
                word: string;
                start_ms: number;
                end_ms: number;
            }>, "many">;
            voice_id: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            generated_at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            audio: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            words: {
                word: string;
                start_ms: number;
                end_ms: number;
            }[];
            generated_at: string;
            voice_id?: string | undefined;
        }, {
            duration_ms: number;
            audio: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            words: {
                word: string;
                start_ms: number;
                end_ms: number;
            }[];
            generated_at: string;
            voice_id?: string | undefined;
        }>>>;
        approved: z.ZodDefault<z.ZodBoolean>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        schema_version: z.ZodLiteral<1>;
        slug: z.ZodString;
        title: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        mode: z.ZodDefault<z.ZodEnum<["studio", "watch", "oneshot"]>>;
        archetype_id: z.ZodString;
        aspect_ratio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
        resolution: z.ZodOptional<z.ZodObject<{
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            w: number;
            h: number;
        }, {
            w: number;
            h: number;
        }>>;
        audio_analysis: z.ZodOptional<z.ZodObject<{
            bpm: z.ZodNumber;
            downbeats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            beats: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            onsets: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            source: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            analysed_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            beats: number[];
            bpm: number;
            downbeats: number[];
            onsets: number[];
            source?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
            analysed_at?: string | undefined;
        }, {
            bpm: number;
            beats?: number[] | undefined;
            downbeats?: number[] | undefined;
            onsets?: number[] | undefined;
            source?: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            } | undefined;
            analysed_at?: string | undefined;
        }>>;
        selected_concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            filename: z.ZodString;
            role: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            filename: string;
            role?: string | undefined;
        }, {
            filename: string;
            role?: string | undefined;
        }>, "many">>;
        selected_concepts_note: z.ZodOptional<z.ZodString>;
        current_rung: z.ZodDefault<z.ZodNumber>;
        anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            kind: z.ZodEnum<["image", "video", "audio", "style", "character", "location", "sketch"]>;
            asset: z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
            asset: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            tags: string[];
            metadata: Record<string, unknown>;
        }, {
            id: string;
            name: string;
            kind: "image" | "video" | "audio" | "style" | "character" | "location" | "sketch";
            asset: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            tags?: string[] | undefined;
            metadata?: Record<string, unknown> | undefined;
        }>, "many">>;
        script: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            schema_version: z.ZodLiteral<1>;
            archetype: z.ZodEnum<["explainer", "product", "ai_short", "narrative", "montage", "tutorial", "music_video", "custom"]>;
            title: z.ZodString;
            duration_ms: z.ZodNumber;
            style_anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            music_preset: z.ZodOptional<z.ZodString>;
            beats: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                scene_id: z.ZodOptional<z.ZodString>;
                shot_id: z.ZodOptional<z.ZodString>;
                vo: z.ZodDefault<z.ZodString>;
                on_screen_text: z.ZodOptional<z.ZodString>;
                action: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodNumber;
                sfx: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                transition: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strip", z.ZodTypeAny, {
                duration_ms: number;
                id: string;
                metadata: Record<string, unknown>;
                sfx: string[];
                vo: string;
                transition?: string | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }, {
                duration_ms: number;
                id: string;
                metadata?: Record<string, unknown> | undefined;
                transition?: string | undefined;
                sfx?: string[] | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                vo?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }>, "many">;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            metadata: Record<string, unknown>;
            schema_version: 1;
            archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
            title: string;
            style_anchors: string[];
            beats: {
                duration_ms: number;
                id: string;
                metadata: Record<string, unknown>;
                sfx: string[];
                vo: string;
                transition?: string | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }[];
            music_preset?: string | undefined;
        }, {
            duration_ms: number;
            schema_version: 1;
            archetype: "custom" | "narrative" | "explainer" | "product" | "ai_short" | "montage" | "tutorial" | "music_video";
            title: string;
            beats: {
                duration_ms: number;
                id: string;
                metadata?: Record<string, unknown> | undefined;
                transition?: string | undefined;
                sfx?: string[] | undefined;
                scene_id?: string | undefined;
                shot_id?: string | undefined;
                vo?: string | undefined;
                on_screen_text?: string | undefined;
                action?: string | undefined;
            }[];
            metadata?: Record<string, unknown> | undefined;
            music_preset?: string | undefined;
            style_anchors?: string[] | undefined;
        }>>>;
        cells: z.ZodDefault<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            uid: z.ZodString;
            beat_id: z.ZodString;
            rung: z.ZodEnum<["0_beat_sheet", "1_lofi", "2_hifi"]>;
            index: z.ZodNumber;
            label: z.ZodString;
            block_id: z.ZodOptional<z.ZodString>;
            time: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            frames: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>;
            narration_excerpt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            intent: z.ZodOptional<z.ZodString>;
            shot_type: z.ZodDefault<z.ZodEnum<["ews", "ws", "ls", "fs", "ms", "cu", "ecu", "ots", "pov", "insert", "aerial", "unset"]>>;
            camera_move: z.ZodDefault<z.ZodEnum<["static", "pan", "tilt", "dolly", "truck", "crane", "handheld", "zoom-in", "zoom-out", "orbit", "unset"]>>;
            duration_ms: z.ZodDefault<z.ZodNumber>;
            audio_cue: z.ZodOptional<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>>;
            prompt: z.ZodDefault<z.ZodString>;
            anchors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seed: z.ZodOptional<z.ZodNumber>;
            action: z.ZodOptional<z.ZodString>;
            camera_text: z.ZodOptional<z.ZodString>;
            renderer: z.ZodDefault<z.ZodEnum<["hyperframes", "remotion", "excalidraw", "blender", "fal", "veo", "kling", "runway", "auto"]>>;
            content_path: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
            reference_layer: z.ZodDefault<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>, "many">>;
            rungs: z.ZodObject<{
                '0_beat_sheet': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    content: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                }>;
                '1_lofi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
                '2_hifi': z.ZodObject<{
                    status: z.ZodEnum<["pending", "pending-review", "approved", "needs-rework"]>;
                    still: z.ZodOptional<z.ZodObject<{
                        uri: z.ZodString;
                        mime: z.ZodOptional<z.ZodString>;
                        hash: z.ZodOptional<z.ZodString>;
                        duration_ms: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }, {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }, {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }, {
                '0_beat_sheet': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    content?: string | undefined;
                };
                '1_lofi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
                '2_hifi': {
                    status: "pending" | "pending-review" | "approved" | "needs-rework";
                    still?: {
                        uri: string;
                        mime?: string | undefined;
                        hash?: string | undefined;
                        duration_ms?: number | undefined;
                    } | undefined;
                };
            }>;
            comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                ts: z.ZodNumber;
                rung: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ts: number;
                rung: number;
                text: string;
            }, {
                ts: number;
                rung: number;
                text: string;
            }>, "many">>;
            approved: z.ZodDefault<z.ZodBoolean>;
            last_edited: z.ZodString;
            renders: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
                id: z.ZodString;
                cell_uid: z.ZodString;
                engine: z.ZodString;
                engine_version: z.ZodOptional<z.ZodString>;
                model_id: z.ZodOptional<z.ZodString>;
                variant: z.ZodDefault<z.ZodString>;
                status: z.ZodEnum<["queued", "running", "done", "failed", "cancelled"]>;
                output: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                preview: z.ZodOptional<z.ZodObject<{
                    uri: z.ZodString;
                    mime: z.ZodOptional<z.ZodString>;
                    hash: z.ZodOptional<z.ZodString>;
                    duration_ms: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }, {
                    uri: string;
                    mime?: string | undefined;
                    hash?: string | undefined;
                    duration_ms?: number | undefined;
                }>>;
                cost_estimate: z.ZodOptional<z.ZodNumber>;
                cost_actual: z.ZodOptional<z.ZodNumber>;
                started_at: z.ZodOptional<z.ZodString>;
                finished_at: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.ZodTypeAny, "passthrough">>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        narration: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            audio: z.ZodObject<{
                uri: z.ZodString;
                mime: z.ZodOptional<z.ZodString>;
                hash: z.ZodOptional<z.ZodString>;
                duration_ms: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }, {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            }>;
            words: z.ZodArray<z.ZodObject<{
                word: z.ZodString;
                start_ms: z.ZodNumber;
                end_ms: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                word: string;
                start_ms: number;
                end_ms: number;
            }, {
                word: string;
                start_ms: number;
                end_ms: number;
            }>, "many">;
            voice_id: z.ZodOptional<z.ZodString>;
            duration_ms: z.ZodNumber;
            generated_at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number;
            audio: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            words: {
                word: string;
                start_ms: number;
                end_ms: number;
            }[];
            generated_at: string;
            voice_id?: string | undefined;
        }, {
            duration_ms: number;
            audio: {
                uri: string;
                mime?: string | undefined;
                hash?: string | undefined;
                duration_ms?: number | undefined;
            };
            words: {
                word: string;
                start_ms: number;
                end_ms: number;
            }[];
            generated_at: string;
            voice_id?: string | undefined;
        }>>>;
        approved: z.ZodDefault<z.ZodBoolean>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>;
};
