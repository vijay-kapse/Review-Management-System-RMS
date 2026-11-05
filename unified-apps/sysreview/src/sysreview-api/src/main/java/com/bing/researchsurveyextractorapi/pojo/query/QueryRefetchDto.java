package com.bing.researchsurveyextractorapi.pojo.query;

import lombok.*;

/**
 * Result of re-running a saved query: the query as it now stands, and what changed in its papers.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QueryRefetchDto {
    private QueryDto query;
    // Papers the new search still returned: same rows, so category, collections and model rating stay.
    private int kept;
    // Papers new to this query.
    private int added;
    // Papers the new search no longer returned, removed from this query.
    private int removed;
    // Collection memberships dropped along with the removed papers.
    private int removedFromCollections;
}
