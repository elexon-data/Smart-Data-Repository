import { HTTPSnippet } from 'httpsnippet';

const generatedSamples = [
  { label: 'cURL', lang: 'bash', target: 'shell', client: 'curl' },
  { label: 'JavaScript (Fetch)', lang: 'javascript', target: 'javascript', client: 'fetch' },
  { label: 'Python (Requests)', lang: 'python', target: 'python', client: 'requests' },
  { label: 'TypeScript (Fetch)', lang: 'typescript', target: 'javascript', client: 'fetch' },
  { label: '.NET (HttpClient)', lang: 'csharp', target: 'csharp', client: 'httpclient' },
];

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

export function addOperationCodeSamples(document) {
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!isObject(pathItem)) continue;

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!isObject(operation)) continue;

      const request = createHarRequest(document, path, pathItem, method, operation);
      const snippet = new HTTPSnippet(request);
      const samples = Array.isArray(operation['x-codeSamples'])
        ? operation['x-codeSamples']
        : [];
      const existingLabels = new Set(samples.map(({ label }) => label).filter(Boolean));

      for (const sample of generatedSamples) {
        if (existingLabels.has(sample.label)) continue;
        const generatedSource = snippet
          .convert(sample.target, sample.client)
          .replaceAll('******', 'Bearer <access-token>');
        const source =
          sample.lang === 'typescript'
            ? generatedSource
                .replace('const url = ', 'const url: string = ')
                .replace('const options = ', 'const options: RequestInit = ')
            : generatedSource;
        if (typeof source !== 'string' || source.length === 0) {
          throw new Error(`Could not generate ${sample.label} sample for ${method.toUpperCase()} ${path}.`);
        }
        samples.push({ label: sample.label, lang: sample.lang, source });
      }

      operation['x-codeSamples'] = samples;
    }
  }

  return document;
}

function createHarRequest(document, path, pathItem, method, operation) {
  const parameters = [
    ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
    ...(Array.isArray(operation.parameters) ? operation.parameters : []),
  ].map((parameter) => resolveReference(document, parameter));
  const queryString = [];
  const headers = [];
  const cookies = [];
  const pathValues = {};

  for (const parameter of parameters) {
    if (!isObject(parameter) || typeof parameter.name !== 'string') continue;
    const required = parameter.in === 'path' || parameter.required === true;
    const value = getParameterValue(document, parameter, required);
    if (value === undefined) continue;

    switch (parameter.in) {
      case 'path':
        pathValues[parameter.name] = String(value);
        break;
      case 'query':
        queryString.push(...serializeQueryParameter(parameter, value));
        break;
      case 'header':
        headers.push({ name: parameter.name, value: String(value) });
        break;
      case 'cookie':
        cookies.push({ name: parameter.name, value: String(value) });
        break;
    }
  }

  const security = operation.security ?? document.security ?? [];
  if (security.length > 0 && !security.some((requirement) => Object.keys(requirement).length === 0)) {
    headers.push({ name: 'Authorization', value: 'Bearer <access-token>' });
  }

  const body = getRequestBody(document, operation.requestBody);
  if (body) headers.push({ name: 'Content-Type', value: body.mimeType });

  const responseType = getResponseMimeType(document, operation.responses);
  if (responseType) headers.push({ name: 'Accept', value: responseType });

  const server = getServer(document, pathItem, operation);
  const resolvedPath = path.replace(/\{([^}]+)\}/g, (_, name) =>
    encodeURIComponent(pathValues[name] ?? `<${name}>`),
  );
  const url = new URL(resolvedPath.replace(/^\/+/, ''), `${server.replace(/\/+$/, '')}/`);
  for (const { name, value } of queryString) {
    url.searchParams.append(name, value);
  }

  return {
    method: method.toUpperCase(),
    url: url.toString(),
    httpVersion: 'HTTP/1.1',
    cookies,
    headers,
    queryString,
    ...(body
      ? {
          postData: {
            mimeType: body.mimeType,
            text: typeof body.value === 'string' ? body.value : JSON.stringify(body.value),
          },
        }
      : {}),
    headersSize: -1,
    bodySize: -1,
  };
}

function getServer(document, pathItem, operation) {
  const server = operation.servers?.[0] ?? pathItem.servers?.[0] ?? document.servers?.[0];
  if (!server?.url) {
    throw new Error('Cannot generate API code samples when the OpenAPI contract does not define a server URL.');
  }

  return server.url.replace(/\{([^}]+)\}/g, (_, name) =>
    String(server.variables?.[name]?.default ?? `{${name}}`),
  );
}

function getParameterValue(document, parameter, required) {
  const schema = resolveReference(document, parameter.schema);
  const explicitValue =
    parameter.example ??
    Object.values(parameter.examples ?? {})
      .map((item) => resolveReference(document, item))
      .map((item) => (isObject(item) && 'value' in item ? item.value : item))
      .find((item) => item !== undefined) ??
    schema?.example ??
    schema?.default ??
    schema?.enum?.[0];

  if (explicitValue !== undefined) return explicitValue;
  return required ? createExampleValue(document, schema, parameter.name) : undefined;
}

function serializeQueryParameter(parameter, value) {
  const values = Array.isArray(value) ? value : [value];
  const explode = parameter.explode ?? parameter.style === 'form';
  if (Array.isArray(value) && explode) {
    return values.map((item) => ({ name: parameter.name, value: String(item) }));
  }
  return [{ name: parameter.name, value: values.join(',') }];
}

function getRequestBody(document, rawRequestBody) {
  if (!rawRequestBody) return undefined;
  const requestBody = resolveReference(document, rawRequestBody);
  if (!isObject(requestBody?.content)) {
    if (requestBody?.required) throw new Error('Cannot generate samples for a required request body without content.');
    return undefined;
  }

  for (const [mimeType, rawMediaType] of Object.entries(requestBody.content)) {
    const mediaType = resolveReference(document, rawMediaType);
    if (!isObject(mediaType)) continue;
    const value =
      mediaType.example ??
      Object.values(mediaType.examples ?? {})
        .map((item) => resolveReference(document, item))
        .find((item) => item?.value !== undefined)?.value ??
      (mediaType.schema ? createExampleValue(document, mediaType.schema) : undefined);
    if (value !== undefined) return { mimeType, value };
  }
  if (requestBody.required) {
    throw new Error('Cannot generate samples for a required request body without an example schema.');
  }
  return undefined;
}

function getResponseMimeType(document, responses) {
  for (const rawResponse of Object.values(responses ?? {})) {
    const response = resolveReference(document, rawResponse);
    if (!isObject(response?.content)) continue;
    const mimeType = Object.keys(response.content).find((type) => type !== 'application/octet-stream');
    if (mimeType) return mimeType;
  }
  return undefined;
}

function createExampleValue(document, rawSchema, name = 'value', seen = new Set()) {
  const schema = resolveReference(document, rawSchema);
  if (!isObject(schema)) return 'example';
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (schema.const !== undefined) return schema.const;

  if (Array.isArray(schema.allOf)) {
    const values = schema.allOf.map((part) => createExampleValue(document, part, name, seen));
    const objectValues = values.filter(isObject);
    if (objectValues.length > 0) return Object.assign({}, ...objectValues);
    return values.find((value) => value !== undefined) ?? 'example';
  }
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    return createExampleValue(document, (schema.oneOf ?? schema.anyOf)[0], name, seen);
  }

  if (schema.type === 'object' || schema.properties) {
    if (seen.has(schema)) return {};
    const nextSeen = new Set(seen).add(schema);
    const required = new Set(schema.required ?? Object.keys(schema.properties ?? {}));
    const properties = Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([propertyName]) => required.has(propertyName))
        .map(([propertyName, propertySchema]) => [
          propertyName,
          createExampleValue(document, propertySchema, propertyName, nextSeen),
        ]),
    );
    if (Object.keys(properties).length > 0) return properties;
    if (isObject(schema.additionalProperties)) {
      return {
        additionalProperty: createExampleValue(document, schema.additionalProperties, name, nextSeen),
      };
    }
    return properties;
  }
  if (schema.type === 'array') {
    return [createExampleValue(document, schema.items, name, seen)];
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return true;
  return 'example';
}

function resolveReference(document, value) {
  if (!isObject(value) || typeof value.$ref !== 'string' || !value.$ref.startsWith('#/')) return value;
  const target = value.$ref
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((current, part) => current?.[part], document);
  return isObject(target) ? { ...target, ...value, $ref: undefined } : value;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
