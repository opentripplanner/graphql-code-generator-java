"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaResolversVisitor = void 0;
const graphql_1 = require("graphql");
const java_common_1 = require("@graphql-codegen/java-common");
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
class JavaResolversVisitor extends visitor_plugin_common_1.BaseVisitor {
    constructor(rawConfig, _schema, defaultPackageName) {
        super(rawConfig, {
            enumValues: rawConfig.enumValues || {},
            listType: rawConfig.listType || 'Iterable',
            className: rawConfig.className || 'Types',
            classMembersPrefix: rawConfig.classMembersPrefix || '',
            package: rawConfig.package || defaultPackageName,
            scalars: (0, visitor_plugin_common_1.buildScalarsFromConfig)(_schema, rawConfig, java_common_1.JAVA_SCALARS, 'Object'),
            useEmptyCtor: rawConfig.useEmptyCtor || false,
        });
        this._schema = _schema;
        this._addHashMapImport = false;
        this._addMapImport = false;
        this._addListImport = false;
    }
    getImports() {
        const allImports = [];
        if (this._addHashMapImport) {
            allImports.push(`java.util.HashMap`);
        }
        if (this._addMapImport) {
            allImports.push(`java.util.Map`);
        }
        if (this._addListImport) {
            allImports.push(`java.util.ArrayList`);
            allImports.push(`java.util.List`);
            allImports.push(`java.util.stream.Collectors`);
        }
        return allImports.map(i => `import ${i};`).join('\n') + '\n';
    }
    wrapWithClass(content) {
        return new java_common_1.JavaDeclarationBlock()
            .access('public')
            .asKind('class')
            .withName(this.config.className)
            .withBlock((0, visitor_plugin_common_1.indentMultiline)(content)).string;
    }
    getPackageName() {
        return `package ${this.config.package};\n`;
    }
    getEnumValue(enumName, enumOption) {
        if (this.config.enumValues[enumName] &&
            typeof this.config.enumValues[enumName] === 'object' &&
            this.config.enumValues[enumName][enumOption]) {
            return this.config.enumValues[enumName][enumOption];
        }
        return enumOption;
    }
    EnumValueDefinition(node) {
        return (enumName) => {
            return (0, visitor_plugin_common_1.indent)(`${this.getEnumValue(enumName, node.name.value)}`);
        };
    }
    EnumTypeDefinition(node) {
        this._addHashMapImport = true;
        this._addMapImport = true;
        const enumName = this.convertName(node.name);
        const enumValues = node.values
            .map(enumValue => {
            const a = enumValue(node.name.value);
            // replace reserved word new
            if (a.trim() === 'new') {
                return '_new';
            }
            return a;
        })
            .join(',\n');
        const enumCtor = (0, visitor_plugin_common_1.indentMultiline)(``);
        const enumBlock = [enumValues, enumCtor].join('\n');
        return new java_common_1.JavaDeclarationBlock()
            .access('public')
            .asKind('enum')
            .withComment(node.description)
            .withName(enumName)
            .withBlock(enumBlock).string;
    }
    resolveInputFieldType(typeNode) {
        const innerType = (0, visitor_plugin_common_1.getBaseTypeNode)(typeNode);
        const schemaType = this._schema.getType(innerType.name.value);
        const isArray = typeNode.kind === graphql_1.Kind.LIST_TYPE ||
            (typeNode.kind === graphql_1.Kind.NON_NULL_TYPE && typeNode.type.kind === graphql_1.Kind.LIST_TYPE);
        let result;
        if ((0, graphql_1.isScalarType)(schemaType)) {
            if (this.scalars[schemaType.name]) {
                result = {
                    baseType: this.scalars[schemaType.name],
                    typeName: this.scalars[schemaType.name],
                    isScalar: true,
                    isEnum: false,
                    isArray,
                };
            }
            else {
                result = { isArray, baseType: 'Object', typeName: 'Object', isScalar: true, isEnum: false };
            }
        }
        else if ((0, graphql_1.isInputObjectType)(schemaType)) {
            const convertedName = this.convertName(schemaType.name);
            const typeName = convertedName.endsWith('Input') ? convertedName : `${convertedName}Input`;
            result = {
                baseType: typeName,
                typeName,
                isScalar: false,
                isEnum: false,
                isArray,
            };
        }
        else if ((0, graphql_1.isEnumType)(schemaType)) {
            result = {
                isArray,
                baseType: this.convertName(schemaType.name),
                typeName: this.convertName(schemaType.name),
                isScalar: false,
                isEnum: true,
            };
        }
        else {
            result = { isArray, baseType: 'Object', typeName: 'Object', isScalar: true, isEnum: false };
        }
        if (result) {
            result.typeName = (0, java_common_1.wrapTypeWithModifiers)(result.typeName, typeNode, this.config.listType);
        }
        return result;
    }
    buildInputTransfomer(name, inputValueArray) {
        this._addMapImport = true;
        const classMembers = inputValueArray
            .map(arg => {
            const typeToUse = this.resolveInputFieldType(arg.type);
            if (arg.name.value === 'interface' || arg.name.value === 'new') {
                // forcing prefix of _ since interface is a keyword in JAVA
                return (0, visitor_plugin_common_1.indent)(`private ${typeToUse.typeName} _${this.config.classMembersPrefix}${arg.name.value};`);
            }
            return (0, visitor_plugin_common_1.indent)(`private ${typeToUse.typeName} ${this.config.classMembersPrefix}${arg.name.value};`);
        })
            .join('\n');
        const ctorSet = inputValueArray
            .map(arg => {
            const typeToUse = this.resolveInputFieldType(arg.type);
            if (typeToUse.isArray && !typeToUse.isScalar) {
                this._addListImport = true;
                if (typeToUse.isEnum) {
                    return (0, visitor_plugin_common_1.indentMultiline)(`if (args.get("${arg.name.value}") != null) {
		this.${this.config.classMembersPrefix}${arg.name.value} = ((List<Object>) args.get("${arg.name.value}")).stream()
				.map(item -> item instanceof ${typeToUse.baseType} ? item : ${typeToUse.baseType}.valueOf((String) item))
				.map(${typeToUse.baseType}.class::cast)
				.collect(Collectors.toList());
}`, 3);
                }
                return (0, visitor_plugin_common_1.indentMultiline)(`if (args.get("${arg.name.value}") != null) {
  this.${arg.name.value} = new ArrayList<${typeToUse.baseType}>();
  for (var o : (${this.config.listType}<Map<String, Object>>) args.get("${arg.name.value}")) {
    if (o != null) {
      this.${arg.name.value}.add(new ${typeToUse.baseType}(o));
    }
    else {
      this.${arg.name.value}.add(null);
    }
  }
}`, 3);
            }
            if (typeToUse.isScalar) {
                return (0, visitor_plugin_common_1.indent)(`this.${this.config.classMembersPrefix}${arg.name.value} = (${typeToUse.typeName}) args.get("${arg.name.value}");`, 3);
            }
            if (typeToUse.isEnum) {
                return (0, visitor_plugin_common_1.indentMultiline)(`if (args.get("${arg.name.value}") instanceof ${typeToUse.typeName}) {
  this.${this.config.classMembersPrefix}${arg.name.value} = (${typeToUse.typeName}) args.get("${arg.name.value}");
} else if (args.get("${arg.name.value}") != null) {
  this.${this.config.classMembersPrefix}${arg.name.value} = ${typeToUse.typeName}.valueOf((String) args.get("${arg.name.value}"));
}`, 3);
            }
            if (arg.name.value === 'interface') {
                // forcing prefix of _ since interface is a keyword in JAVA
                return (0, visitor_plugin_common_1.indent)(`this._${this.config.classMembersPrefix}${arg.name.value} = new ${typeToUse.typeName}((Map<String, Object>) args.get("${arg.name.value}"));`, 3);
            }
            return (0, visitor_plugin_common_1.indent)(`this.${this.config.classMembersPrefix}${arg.name.value} = new ${typeToUse.typeName}((Map<String, Object>) args.get("${arg.name.value}"));`, 3);
        })
            .join('\n');
        const getters = inputValueArray
            .map(arg => {
            const typeToUse = this.resolveInputFieldType(arg.type);
            if (arg.name.value === 'interface' || arg.name.value === 'new') {
                // forcing prefix of _ since interface is a keyword in JAVA
                return (0, visitor_plugin_common_1.indent)(`public ${typeToUse.typeName} get${this.convertName(arg.name.value)}() { return this._${this.config.classMembersPrefix}${arg.name.value}; }`);
            }
            return (0, visitor_plugin_common_1.indent)(`public ${typeToUse.typeName} get${this.convertName(arg.name.value)}() { return this.${this.config.classMembersPrefix}${arg.name.value}; }`);
        })
            .join('\n');
        const setters = inputValueArray
            .map(arg => {
            const typeToUse = this.resolveInputFieldType(arg.type);
            if (arg.name.value === 'interface' || arg.name.value === 'new') {
                return (0, visitor_plugin_common_1.indent)(`public void set${this.convertName(arg.name.value)}(${typeToUse.typeName} _${arg.name.value}) { this._${arg.name.value} = _${arg.name.value}; }`);
            }
            return (0, visitor_plugin_common_1.indent)(`public void set${this.convertName(arg.name.value)}(${typeToUse.typeName} ${arg.name.value}) { this.${arg.name.value} = ${arg.name.value}; }`);
        })
            .join('\n');
        if (this.config.useEmptyCtor) {
            return `public static class ${name} {
${classMembers}

  public ${name}() {}

${getters}
${setters}
}`;
        }
        return `public static class ${name} {
${classMembers}

  public ${name}(Map<String, Object> args) {
    if (args != null) {
${ctorSet}
    }
  }

${getters}
${setters}
}`;
    }
    FieldDefinition(node) {
        return (typeName) => {
            if (node.arguments.length > 0) {
                const transformerName = `${this.convertName(typeName, {
                    useTypesPrefix: true,
                })}${this.convertName(node.name.value, { useTypesPrefix: false })}Args`;
                return this.buildInputTransfomer(transformerName, node.arguments);
            }
            return null;
        };
    }
    InputObjectTypeDefinition(node) {
        const convertedName = this.convertName(node);
        const name = convertedName.endsWith('Input') ? convertedName : `${convertedName}Input`;
        return this.buildInputTransfomer(name, node.fields);
    }
    ObjectTypeDefinition(node) {
        const fieldsArguments = node.fields.map(f => f(node.name.value)).filter(r => r);
        return fieldsArguments.join('\n');
    }
}
exports.JavaResolversVisitor = JavaResolversVisitor;
