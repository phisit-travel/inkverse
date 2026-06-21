/**
 * ThaiSpellcheck — Tiptap v3 / ProseMirror decoration layer.
 *
 * Responsibilities:
 *  - Hold a DecorationSet of inline underline decorations (never touches doc nodes).
 *  - Accept new issues via a meta-key transaction dispatched from the editor component.
 *  - Map decorations through doc changes so they survive typing without a full rebuild.
 *
 * WHAT THIS FILE DOES NOT DO:
 *  - It does NOT call checkThaiRules() or the API — the editor component owns that
 *    debounce loop and dispatches the results here as a meta transaction.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Issue } from "@/lib/thaiSpellcheck/rules";

// ── Mapped-issue type (adds doc positions on top of char offsets) ─────────────
// Defined here (not in the editor) so the plugin meta type is self-contained.
export interface MappedIssue extends Issue {
  /** Absolute ProseMirror doc position (from = start of text node + char offset). */
  from: number;
  to: number;
  /** The literal offending text, sliced from the text node. */
  offendingText: string;
  /** Node-level index — for deduplication if multiple passes run. */
  nodeIndex: number;
}

// ── public key so the editor component can dispatch meta updates ──────────────
// The meta value is MappedIssue[] (which has from/to for doc positions).
export const thaiSpellcheckKey = new PluginKey<DecorationSet>("thaiSpellcheck");

// ── The Tiptap extension ──────────────────────────────────────────────────────
export const ThaiSpellcheck = Extension.create({
  name: "thaiSpellcheck",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: thaiSpellcheckKey,

        // State: a DecorationSet that is updated via meta OR mapped through changes.
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, old, _oldState, newState) {
            // If the transaction carries new issue data, rebuild decorations from scratch.
            const issues: MappedIssue[] | undefined = tr.getMeta(thaiSpellcheckKey);
            if (issues !== undefined) {
              if (issues.length === 0) return DecorationSet.empty;
              const decos = issues.map((issue) =>
                Decoration.inline(issue.from, issue.to, {
                  class: `thai-typo thai-typo-${issue.severity}`,
                  "data-typo-type": issue.type,
                  "data-typo-message": issue.message,
                })
              );
              return DecorationSet.create(newState.doc, decos);
            }
            // Otherwise just map existing decorations through doc changes —
            // this keeps underlines in place while the user types.
            return old.map(tr.mapping, tr.doc);
          },
        },

        // Feed the decoration set to ProseMirror's view layer.
        props: {
          decorations(state) {
            return thaiSpellcheckKey.getState(state);
          },
        },
      }),
    ];
  },
});
