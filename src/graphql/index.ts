import { join } from 'path';
import { DocumentNode } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

const allTypes = loadFilesSync(join(__dirname, './modules/**/*.gql'));
const allResolvers = loadFilesSync(join(__dirname, './modules/**/index.*s'));

const typeDefs: DocumentNode = mergeTypeDefs(allTypes);
const resolvers: IResolvers = mergeResolvers(allResolvers);

export { typeDefs, resolvers };
