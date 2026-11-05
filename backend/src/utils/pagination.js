/**
 * Pagination helper adhering to company api-design standard:
 * - Accepts query params `page` and `limit`
 * - Emits pagination metadata & headers:
 *   X-Total-Count, X-Page, X-Limit, X-Total-Pages
 */
function paginate(req, res, items, totalCount = null) {
  const hasPageParam = req.query.page !== undefined;
  const hasLimitParam = req.query.limit !== undefined;

  const total = totalCount !== null ? totalCount : items.length;

  if (hasPageParam || hasLimitParam) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 1 : 1);
    const offset = (page - 1) * limit;

    const paginatedItems = totalCount !== null ? items : items.slice(offset, offset + limit);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', totalPages);

    return {
      isPaginated: true,
      body: {
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };
  }

  // Legacy / unpaginated request (backward compatibility):
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page', 1);
  res.setHeader('X-Limit', total);
  res.setHeader('X-Total-Pages', 1);

  return {
    isPaginated: false,
    body: items,
  };
}

module.exports = { paginate };
