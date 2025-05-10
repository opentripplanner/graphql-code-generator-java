import { dirname, normalize } from 'path';
import { buildPackageNameFromPath } from '@graphql-codegen/java-common';
import { getCachedDocumentNodeFromSchema, oldVisit, } from '@graphql-codegen/plugin-helpers';
import { JavaResolversVisitor } from './visitor.js';
export const plugin = async (schema, documents, config, { outputFile }) => {
    const relevantPath = dirname(normalize(outputFile));
    const defaultPackageName = buildPackageNameFromPath(relevantPath);
    const visitor = new JavaResolversVisitor(config, schema, defaultPackageName);
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const visitorResult = oldVisit(astNode, { leave: visitor });
    const imports = visitor.getImports();
    const packageName = visitor.getPackageName();
    const blockContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
    const wrappedContent = visitor.wrapWithClass(blockContent);
    return [packageName, imports, wrappedContent].join('\n');
};
