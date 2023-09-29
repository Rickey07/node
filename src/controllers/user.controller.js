const User = require("../schema/user.schema");

module.exports.getUsersWithPostCount = async (req, res) => {
  try {
    // DEFAULT constants
    const DEFAULT_LIMIT = 10;
    const DEFAULT_PAGE = 1;
    let { page, limit } = req?.query;
    page = page ? parseInt(page) : DEFAULT_PAGE;
    limit = limit ? parseInt(limit) : DEFAULT_LIMIT;

    // Reduce every page by 1 to match mongo query
    const docsToSkip = (page === 1 ? 0 : page - 1) * limit;
    const pagingCounter = (page - 1) * limit + 1;
    // Run Query
    const data = await User.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "userId",
          as: "posts",
        },
      },
      {
        $project: {
          name: 1,
          posts: { $size: "$posts" },
        },
      },
      {
        $facet: {
          pagination: [
            { $count: "totalDocs" },
            {
              $addFields: {
                page: page,
                pagingCounter: pagingCounter,
                limit: limit,
                totalPages: {
                  $ceil: { $divide: ["$totalDocs", limit] },
                },
                hasPrevPage: {
                  $cond: { if: { $gt: [page, 1] }, then: true, else: false },
                },
                hasNextPage: {
                  $cond: {
                    if: {
                      $lt: [
                        page,
                        { $ceil: { $divide: ["$totalDocs", limit] } },
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
                prevPage: {
                  $cond: { if: { $gt: [page, 1] }, then: page - 1, else: null },
                },
                nextPage: {
                  $cond: {
                    if: {
                      $lt: [
                        page,
                        { $ceil: { $divide: ["$totalDocs", limit] } },
                      ],
                    },
                    then: page + 1,
                    else: null,
                  },
                },
              },
            },
          ],
          data: [
            {
              $skip: docsToSkip,
            },
            { $limit: limit },
          ],
        },
      },
    ]);
    // Send Response back
    res.status(200).json({
      data: {
        users: data[0]?.data,
        pagination: data[0]?.pagination[0],
      },
    });
  } catch (error) {
    res.send({ error: error.message });
  }
};
