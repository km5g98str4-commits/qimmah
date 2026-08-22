import { isDeepStrictEqual } from 'node:util'

function actualType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

function allowedType(schemaType, value) {
  const expected = Array.isArray(schemaType) ? schemaType : [schemaType]
  const actual = actualType(value)
  return expected.some((type) => type === actual || (type === 'number' && actual === 'integer'))
}

function isUri(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * مدقّق صغير ومقصود لجزء JSON Schema الذي يستعمله CanonicalFoodV1.
 * أي keyword غير مدعوم في المخطط يسقط عبر assertSupportedSchema كي لا يصبح صامتًا.
 */
export function validateJsonSchema(value, schema, path = '$') {
  const errors = []
  const add = (code, detail = '') => errors.push({ code, path, detail })

  if (schema.type !== undefined && !allowedType(schema.type, value)) {
    add('type', `expected=${JSON.stringify(schema.type)} actual=${actualType(value)}`)
    return errors
  }
  if (schema.enum && !schema.enum.some((candidate) => isDeepStrictEqual(candidate, value))) {
    add('enum', JSON.stringify(value))
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) add('minLength')
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) add('pattern', schema.pattern)
    if (schema.format === 'uri' && !isUri(value)) add('format_uri', value)
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) add('minimum', String(schema.minimum))
    if (schema.maximum !== undefined && value > schema.maximum) add('maximum', String(schema.maximum))
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) add('exclusiveMinimum', String(schema.exclusiveMinimum))
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) add('minItems', String(schema.minItems))
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) add('uniqueItems')
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateJsonSchema(item, schema.items, `${path}[${index}]`))
      })
    }
  }
  if (value !== null && !Array.isArray(value) && typeof value === 'object') {
    const properties = schema.properties ?? {}
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push({ code: 'required', path: `${path}.${key}`, detail: key })
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) errors.push({ code: 'additionalProperties', path: `${path}.${key}`, detail: key })
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) errors.push(...validateJsonSchema(child, properties[key], `${path}.${key}`))
    }
  }
  return errors
}

const SUPPORTED = new Set([
  '$schema', '$id', 'title', 'type', 'additionalProperties', 'required', 'properties',
  'enum', 'pattern', 'minLength', 'minimum', 'maximum', 'exclusiveMinimum', 'items',
  'uniqueItems', 'minItems', 'format',
])

export function assertSupportedSchema(schema, path = '$') {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) throw new Error(`unsupported_schema_keyword:${path}:${key}`)
  }
  if (schema.properties) {
    for (const [key, child] of Object.entries(schema.properties)) assertSupportedSchema(child, `${path}.properties.${key}`)
  }
  if (schema.items) assertSupportedSchema(schema.items, `${path}.items`)
}
