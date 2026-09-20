/**
 * Fetch ALL records from a Base44 entity, paginating through the ~100 record
 * default cap on list()/filter() calls.
 *
 * The Base44 SDK's list() and filter() methods silently cap results at ~100
 * records regardless of the limit parameter passed. This helper loops with
 * skip-based pagination to retrieve the complete set.
 *
 * @param {Function} entity  - The base44 entity handler (e.g. base44.entities.Project)
 * @param {Object}   query   - Filter query object (default {})
 * @param {string}   sort    - Sort field (default '-created_date')
 * @param {number}   pageSize - Page size (default 1000)
 * @returns {Promise<Array>} All matching records
 */
export async function fetchAllRecords(entity, query = {}, sort = '-created_date', pageSize = 1000) {
  const all = [];
  let skip = 0;
  // Safety cap to avoid infinite loops if a data source keeps returning full pages
  // indefinitely (e.g. due to a backend bug). 50 pages × 1000 = 50k records max.
  const MAX_PAGES = 50;
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await entity.filter(query, sort, pageSize, skip);
    all.push(...batch);
    if (batch.length < pageSize) break;
    skip += pageSize;
  }
  return all;
}