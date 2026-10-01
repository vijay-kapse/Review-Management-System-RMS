package com.bing.researchsurveyextractorapi.util;

import java.time.DateTimeException;
import java.time.YearMonth;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Month-level date-range checks for sources whose APIs only filter by year.
 * A record whose month can't be determined is kept rather than guessed away.
 */
public final class PublicationDates {

    private static final Pattern ISO_DATE = Pattern.compile("^(\\d{4})-(\\d{2})");
    private static final Pattern MONTH_NAME = Pattern.compile(
            "\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?", Pattern.CASE_INSENSITIVE);
    private static final Pattern YEAR = Pattern.compile("\\b(19|20)\\d{2}\\b");
    private static final String MONTHS = "janfebmaraprmayjunjulaugsepoctnovdec";

    private PublicationDates() {
    }

    /**
     * Reads a publication month from "2016-10-15" (Scopus coverDate) or free text such as
     * "2-6 Oct. 2016" or "Oct.-Dec. 2016" (IEEE), taking the first month named.
     */
    public static YearMonth parse(String text, Integer fallbackYear) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        try {
            Matcher iso = ISO_DATE.matcher(text.trim());
            if (iso.find()) {
                return YearMonth.of(Integer.parseInt(iso.group(1)), Integer.parseInt(iso.group(2)));
            }
            Matcher month = MONTH_NAME.matcher(text);
            if (!month.find()) {
                return null;
            }
            int monthNumber = MONTHS.indexOf(month.group(1).toLowerCase(Locale.ROOT)) / 3 + 1;
            Matcher year = YEAR.matcher(text);
            Integer y = year.find() ? Integer.valueOf(year.group()) : fallbackYear;
            return y == null ? null : YearMonth.of(y, monthNumber);
        } catch (NumberFormatException | DateTimeException e) {
            return null;
        }
    }

    /** True when no range is set, the month is unknown, or the month falls inside [from, to]. */
    public static boolean within(YearMonth published, YearMonth from, YearMonth to) {
        if (published == null || from == null || to == null) {
            return true;
        }
        return !published.isBefore(from) && !published.isAfter(to);
    }
}
