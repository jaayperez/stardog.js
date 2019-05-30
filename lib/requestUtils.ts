import qs from 'querystring';
import { RequestMethod } from './constants';
import { BaseOptionsWithRequestHeaders, BaseOptions } from 'types';

const getRequestInit = ({
  connection,
  method = RequestMethod.GET,
  body,
  requestHeaders,
}: BaseOptionsWithRequestHeaders & {
  method?: RequestMethod;
  body?: any;
}): RequestInit => {
  const headers = connection.headers();

  if (requestHeaders) {
    Object.keys(requestHeaders).forEach((headerKey) =>
      headers.set(headerKey, requestHeaders[headerKey])
    );
  }

  return {
    method,
    body,
    headers,
  };
};

// Uses the provided connection, basePath, pathSuffix (if any), params (if
// any), and map of allowed query params (if any) to construct and return a
// complete Stardog resource URL, including the connection's endpoint URL, the
// base path, the path suffix (if any), and a query string containing any
// allowed query params found on `params`.
const getRequestInfo = <T>({
  connection,
  basePath,
  pathSuffix,
  allowedParamsMap,
  params,
}: BaseOptions & {
  basePath: string;
  pathSuffix: string;
  allowedParamsMap: T;
  params: T;
}): RequestInfo => {
  if (!params) {
    return connection.request(basePath, pathSuffix);
  }

  const paramsKeys = Object.keys(params);

  if (paramsKeys.length === 0) {
    return connection.request(basePath, pathSuffix);
  }

  const queryParamsMap = paramsKeys.reduce((paramsMap, param) => {
    if (!allowedParamsMap[param]) {
      return paramsMap;
    }
    paramsMap[param] = params[param];
    return paramsMap;
  }, {});
  const queryString = qs.stringify(queryParamsMap);

  return connection.request(
    basePath,
    `${pathSuffix}${queryString ? `?${queryString}` : ''}`
  );
};

// Returns a function that can be used to call `fetch` with a predefined base
// URL and with certain other tedious tasks automated. For example, the
// function converts `params` objects to query strings (filtering out query
// params that are not allowed), converts the provided map of request headers to
// a `Headers` instance, prepends the connection's `endpoint` URL and the
// defined `basePath` to the `fetch` URL, and so on.
export const getFetchDispatcher = <T extends string>({
  basePath = '',
  allowedQueryParams,
}: {
  basePath?: string;
  allowedQueryParams?: T[];
} = {}) => {
  // Construct a map for quick look-ups.
  const allowedParamsMap = !allowedQueryParams
    ? null
    : allowedQueryParams.reduce(
        (paramsMap, param) => {
          paramsMap[param as string] = true;
          return paramsMap;
        },
        {} as { [K in T]?: string }
      );

  return ({
    connection,
    method = RequestMethod.GET,
    body,
    requestHeaders,
    params,
    pathSuffix = '',
  }: BaseOptionsWithRequestHeaders & {
    method?: RequestMethod;
    body?: RequestInit['body'];
    params?: { [K in T]?: string };
    pathSuffix?: string;
  }) =>
    fetch(
      getRequestInfo({
        connection,
        basePath,
        pathSuffix,
        allowedParamsMap,
        params,
      }),
      getRequestInit({ connection, method, body, requestHeaders })
    );
};

export const dispatchGenericFetch = getFetchDispatcher();
export type GenericFetchParams = Parameters<typeof dispatchGenericFetch>[0];