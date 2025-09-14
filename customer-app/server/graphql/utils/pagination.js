/**
 * Pagination utilities for Prisma/GraphQL
 * Converted from MongoDB to Prisma-compatible pagination
 */

/**
 * Creates a cursor-based connection for pagination with Prisma
 * @param {Object} prismaModel - Prisma model client
 * @param {Object} paginationArgs - Pagination arguments {first, after, last, before}
 * @param {Object} where - Prisma where clause
 * @param {Object} orderBy - Prisma orderBy clause
 * @returns {Object} Connection object with edges, pageInfo, and totalCount
 */
const createCursorConnection = async (
  prismaModel,
  paginationArgs = {},
  where = {},
  orderBy = { id: 'asc' }
) => {
  const { first, after, last, before } = paginationArgs;

  // Validate pagination arguments
  if (first && first < 0) {
    throw new Error('Argument "first" must be a non-negative integer');
  }
  if (last && last < 0) {
    throw new Error('Argument "last" must be a non-negative integer');
  }
  if (first && last) {
    throw new Error('Cannot provide both "first" and "last" arguments');
  }

  // Default to forward pagination with first: 10 if no args provided
  const limit = first || last || 10;
  const isForward = Boolean(first || (!first && !last));

  // Build the base query
  let prismaQuery = {
    where,
    orderBy,
    take: limit + 1, // +1 to check if there are more results
  };

  // Handle cursor-based filtering
  if (after) {
    prismaQuery.cursor = { id: after };
    prismaQuery.skip = 1; // Skip the cursor item
  }

  if (before) {
    prismaQuery.cursor = { id: before };
    prismaQuery.skip = 1; // Skip the cursor item
    // Reverse order for backward pagination
    if (Array.isArray(orderBy)) {
      prismaQuery.orderBy = orderBy.map(order => {
        const key = Object.keys(order)[0];
        return { [key]: order[key] === 'asc' ? 'desc' : 'asc' };
      });
    } else {
      const key = Object.keys(orderBy)[0];
      prismaQuery.orderBy = { [key]: orderBy[key] === 'asc' ? 'desc' : 'asc' };
    }
  }

  // Execute the query
  const documents = await prismaModel.findMany(prismaQuery);

  // Check if there are more results
  const hasMore = documents.length > limit;
  if (hasMore) {
    documents.pop(); // Remove the extra document
  }

  // Reverse results for backward pagination
  if (before) {
    documents.reverse();
  }

  // Create edges
  const edges = documents.map(doc => ({
    node: doc,
    cursor: doc.id.toString(),
  }));

  // Calculate page info
  const hasNextPage = isForward ? hasMore : Boolean(after);
  const hasPreviousPage = isForward ? Boolean(after) : hasMore;

  const startCursor = edges.length > 0 ? edges[0].cursor : null;
  const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

  // Get total count (only when needed)
  const totalCount = await prismaModel.count({ where });

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
    },
    totalCount,
  };
};

/**
 * Creates simple offset-based pagination for Prisma
 * @param {Object} prismaModel - Prisma model client
 * @param {Object} paginationArgs - Pagination arguments {page, limit}
 * @param {Object} where - Prisma where clause
 * @param {Object} orderBy - Prisma orderBy clause
 * @returns {Object} Paginated results with metadata
 */
const createOffsetPagination = async (
  prismaModel,
  paginationArgs = {},
  where = {},
  orderBy = { id: 'asc' }
) => {
  const { page = 1, limit = 10 } = paginationArgs;

  const skip = (page - 1) * limit;

  const [documents, totalCount] = await Promise.all([
    prismaModel.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prismaModel.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: documents,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPreviousPage,
    },
  };
};

/**
 * Encode cursor for GraphQL connections
 * @param {string} id - Document ID
 * @returns {string} Base64 encoded cursor
 */
const encodeCursor = id => {
  return Buffer.from(id.toString()).toString('base64');
};

/**
 * Decode cursor for GraphQL connections
 * @param {string} cursor - Base64 encoded cursor
 * @returns {string} Decoded document ID
 */
const decodeCursor = cursor => {
  try {
    return Buffer.from(cursor, 'base64').toString('ascii');
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
};

/**
 * Validate pagination arguments
 * @param {Object} args - Pagination arguments
 * @returns {Object} Validated arguments
 */
const validatePaginationArgs = args => {
  const { first, last, after, before } = args;

  if (first !== undefined && first < 0) {
    throw new Error('Argument "first" must be a non-negative integer');
  }

  if (last !== undefined && last < 0) {
    throw new Error('Argument "last" must be a non-negative integer');
  }

  if (first !== undefined && last !== undefined) {
    throw new Error('Cannot provide both "first" and "last" arguments');
  }

  if (after && before) {
    throw new Error('Cannot provide both "after" and "before" cursors');
  }

  return args;
};

module.exports = {
  createCursorConnection,
  createOffsetPagination,
  encodeCursor,
  decodeCursor,
  validatePaginationArgs,
};
