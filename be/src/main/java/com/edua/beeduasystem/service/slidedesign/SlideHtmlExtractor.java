package com.edua.beeduasystem.service.slidedesign;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Robust HTML extractor for slide-design AI output.
 *
 * SimChatResponseCleaner only strips a fence at the very start/end of the
 * string — it fails when AI adds preamble ("Dưới đây là slide HTML...") before
 * the fence. Very common with Vietnamese prompts even when prompt forbids it.
 *
 * Strategy:
 *   1. Strip &lt;think&gt;...&lt;/think&gt; blocks (reasoning models).
 *   2. If a ```html ... ``` fenced block exists anywhere → return its content.
 *   3. Else find the first HTML opening (&lt;!doctype, &lt;html, &lt;div) and
 *      take from there to end of string, trimming any trailing fence/text.
 *   4. Fallback: return cleaned input as-is.
 */
public final class SlideHtmlExtractor {

    private static final Pattern THINK_BLOCK = Pattern.compile(
            "<think>[\\s\\S]*?</think>", Pattern.CASE_INSENSITIVE);

    private static final Pattern FENCED_BLOCK = Pattern.compile(
            "```(?:html)?\\s*\\n?([\\s\\S]*?)\\n?```",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern HTML_START = Pattern.compile(
            "(<!doctype\\s+html|<html\\b|<div\\b)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern TRAILING_FENCE = Pattern.compile("\\s*```[\\s\\S]*$");

    private SlideHtmlExtractor() {}

    public static String extract(String raw) {
        if (raw == null) return "";

        String s = THINK_BLOCK.matcher(raw).replaceAll("").strip();

        Matcher fence = FENCED_BLOCK.matcher(s);
        if (fence.find()) {
            return fence.group(1).strip();
        }

        Matcher start = HTML_START.matcher(s);
        if (start.find()) {
            String tail = s.substring(start.start()).strip();
            return TRAILING_FENCE.matcher(tail).replaceFirst("").strip();
        }

        return s;
    }
}
