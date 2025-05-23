import { EnumTypeDefinitionNode, EnumValueDefinitionNode, FieldDefinitionNode, GraphQLSchema, InputObjectTypeDefinitionNode, InputValueDefinitionNode, ObjectTypeDefinitionNode, TypeNode } from 'graphql';
import { BaseVisitor, EnumValuesMap, ParsedConfig } from '@graphql-codegen/visitor-plugin-common';
import { JavaResolversPluginRawConfig } from './config.js';
export interface JavaResolverParsedConfig extends ParsedConfig {
    package: string;
    className: string;
    listType: string;
    enumValues: EnumValuesMap;
    classMembersPrefix: string;
    useEmptyCtor: boolean;
}
export declare class JavaResolversVisitor extends BaseVisitor<JavaResolversPluginRawConfig, JavaResolverParsedConfig> {
    private _schema;
    private _addHashMapImport;
    private _addMapImport;
    private _addListImport;
    constructor(rawConfig: JavaResolversPluginRawConfig, _schema: GraphQLSchema, defaultPackageName: string);
    getImports(): string;
    wrapWithClass(content: string): string;
    getPackageName(): string;
    protected getEnumValue(enumName: string, enumOption: string): string;
    EnumValueDefinition(node: EnumValueDefinitionNode): (enumName: string) => string;
    EnumTypeDefinition(node: EnumTypeDefinitionNode): string;
    protected resolveInputFieldType(typeNode: TypeNode): {
        baseType: string;
        typeName: string;
        isScalar: boolean;
        isArray: boolean;
        isEnum: boolean;
    };
    protected buildInputTransfomer(name: string, inputValueArray: ReadonlyArray<InputValueDefinitionNode>): string;
    FieldDefinition(node: FieldDefinitionNode): (typeName: string) => string;
    InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string;
    ObjectTypeDefinition(node: ObjectTypeDefinitionNode): string;
}
