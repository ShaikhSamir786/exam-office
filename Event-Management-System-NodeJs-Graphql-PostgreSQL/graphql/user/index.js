const { usermutation } = require("./user-mutation");
const { userQuery } = require("./user-query");
const { userResolvers } = require("./user-resolver");
const { userschema } = require("./user-type");

const userTypedefMap = [userschema, usermutation, userQuery];

const userResolverMap = userResolvers;

module.exports = { userTypedefMap, userResolverMap };
