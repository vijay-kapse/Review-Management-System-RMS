package com.bing.researchsurveyextractorapi.util;

import com.bing.researchsurveyextractorapi.models.Document;

/**
 * The normalized title every part of TRACE groups papers on. Mirrors normalize_title in
 * unified-apps/relevance/worker.py, normalizeResultTitle in the UI, and the SQL in
 * PaperDetailsServiceImpl; keep all four in step.
 */
public final class TitleKey {

    private TitleKey() {
        throw new IllegalStateException("Utility class");
    }

    public static String of(String title) {
        String key = title == null ? "" : title.trim();
        key = key.replaceAll("[.\\s]+$", "");
        key = key.replaceAll("\\s+", " ");
        return key.toLowerCase();
    }

    /** Title key, or the URL when a paper has no title, so untitled papers are not all merged into one. */
    public static String of(Document document) {
        if (document == null) return "";
        String key = of(document.getTitle());
        if (!key.isEmpty()) return key;
        String url = document.getUrl() == null ? "" : document.getUrl().trim().toLowerCase();
        return url.isEmpty() ? "" : "url:" + url;
    }
}
