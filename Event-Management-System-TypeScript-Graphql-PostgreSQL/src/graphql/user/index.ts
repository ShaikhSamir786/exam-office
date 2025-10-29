import usermutation from "./user-mutation.ts";
import userQuery from "./user-query.ts";
import { userResolvers } from "./user-resolver.ts";
import userschema from "./user-type.ts";

const userTypedefMap = [userschema, usermutation, userQuery];
const userResolverMap = userResolvers;

export { userTypedefMap, userResolverMap };
