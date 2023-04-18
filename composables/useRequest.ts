import { stringifyQuery, LocationQueryRaw } from 'vue-router'
import { createFetch, isObject, MaybeRef, UseFetchReturn } from '@vueuse/core'

interface ErrorDetails {
  errorCode: number
  message: string
  type: string
  location?: Array<any>
  extra?: string
  raw?: any
  timestamp?: any
  endpoint?: any
}

/**
 * ENV
 */
const env = import.meta.env
const baseUrl = import.meta.env.VITE_BASE_URL
  ? import.meta.env.VITE_BASE_URL
  : 'http://localhost:5000' // FastAPI default port

const messageResponse = (ctx: any) => {
  if (!ctx.response || !ctx.data) return

  if (ctx.data && ctx.data.detail) {
    return (
      ctx.data.detail?.[0]?.msg ||
      ctx.data.detail.message ||
      ctx.data.detail.msg ||
      ctx.data.detail
    )
  }

  return ctx.data.message || ctx.data.msg || ctx.data
}

const options = {
  beforeFetch({ options }: any) {
    if (env.MODE === 'development') {
      if (env.VITE_BASF_GITLAB_TOKEN) {
        options.headers = Object.assign(options.headers || {}, {
          'X-Gitlab-Token': env.VITE_BASF_GITLAB_TOKEN,
        })
        // console.log(
        //   `%c Request using Gitlab Token ${env.VITE_BASF_GITLAB_TOKEN}`,
        //   'background: gold; color: black'
        // )
      }

      if (env.VITE_BASF_FEDERATION_ACCESS_TOKEN) {
        options.headers = Object.assign(options.headers || {}, {
          Authorization: `Bearer ${env.VITE_BASF_FEDERATION_ACCESS_TOKEN}`,
        })
        // console.log(
        //   `%c Request using Federation Access Token ${env.VITE_BASF_FEDERATION_ACCESS_TOKEN}`,
        //   'background: gold; color: black'
        // )
      }
    }

    return { options }
  },
  onFetchError(ctx: any) {
    console.error('onFetchError data:::', ctx.data)
    console.error('onFetchError error:::', ctx.error)
    console.error('onFetchError response:::', ctx.response)

    // if no response at all, treat as 500 error
    if (!ctx.response) {
      ctx.error = {
        errorCode: 500,
        message: 'Failed to load response data | Unknown Error',
        type: 'unknown',
      } as ErrorDetails

      return ctx
    }

    // error 422 | 400 - Fastapi errors
    if (ctx.response.status === 422 || ctx.response.status === 400) {
      ctx.error = {
        message: messageResponse(ctx),
        type: 'fastapiError',
        location: ctx.data.detail?.[0]?.loc || null,
      } as ErrorDetails
    }

    // error 404 - entity not found error
    else if (ctx.response.status === 404) {
      ctx.error = {
        message: messageResponse(ctx) || 'Entity Not Found',
        type: 'notFound',
        location: ctx.data?.detail?.id,
      } as ErrorDetails
    }

    // error 502- Service Unavailable
    else if (ctx.response.status === 502) {
      ctx.error = {
        message: messageResponse(ctx) || 'Bad Gateway',
        type: 'serverError',
      } as ErrorDetails
    }

    // error 503 - Service Unavailable
    else if (ctx.response.status === 503) {
      ctx.error = {
        message: messageResponse(ctx) || 'Service is not available right now.',
        type: 'serverError',
      } as ErrorDetails
    }

    // error 504 - gateway timeout error
    else if (ctx.response.status === 504) {
      ctx.error = {
        message: messageResponse(ctx) || 'Gateway Timeout Error',
        type: 'serverError',
      } as ErrorDetails
    }

    // error 500
    else if (ctx.response.status === 500) {
      ctx.error = {
        errorCode: 500,
        message:
          messageResponse(ctx) ||
          'Internal Server Error. The server unable to complete your request',
        type: 'serverError',
      } as ErrorDetails
    }

    // fallback error to capture other errors
    else {
      ctx.error = {
        message: messageResponse(ctx) || 'Miscellaneous Error',
        type: 'others',
      } as ErrorDetails
    }

    // insert error code to the error context
    ctx.error.errorCode = ctx.response.status
    // insert raw error data
    ctx.error.raw = ctx.data
    // insert other informations
    ctx.error.endpoint = ctx.response.url

    return ctx
  },
}

// commonly use, if we only to connect to one backend source with baseURL
export const useRequest = createFetch({
  baseUrl,
  options,
  fetchOptions: {
    mode: 'cors',
    // credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  },
})

// use to fetch external api without the baseUrl
export const useRequestExternal = createFetch({
  options,
  fetchOptions: {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
  },
})

/**
 * GET request
 * @param url
 * @param query
 */
export function useGet<T = unknown>(
  url: MaybeRef<string>,
  query?: MaybeRef<unknown>
): UseFetchReturn<T> {
  const _url = computed(() => {
    const _url = unref(url)
    const _query = unref(query)
    const queryString = isObject(_query)
      ? stringifyQuery(_query as LocationQueryRaw)
      : _query || ''

    return `${_url}${queryString ? '?' : ''}${queryString}`
  })

  return useRequest<T>(_url).json()
}

/**
 * POST request
 * @param url
 * @param payload
 */
export function usePost<T = unknown>(
  url: MaybeRef<string>,
  payload?: MaybeRef<unknown>
): UseFetchReturn<T> {
  return useRequest<T>(url).post(payload).json()
}

/**
 * POST request without any baseUrl. Useful to connect external api
 * @param url
 * @param payload
 */
export function usePostExternal<T = unknown>(
  url: MaybeRef<string>,
  payload?: MaybeRef<unknown>
): UseFetchReturn<T> {
  return useRequestExternal<T>(url).post(payload).json()
}

/**
 * PUT request
 * @param url
 * @param payload
 */
export function usePut<T = unknown>(
  url: MaybeRef<string>,
  payload?: MaybeRef<unknown>
): UseFetchReturn<T> {
  return useRequest<T>(url).put(payload).json()
}

/**
 * PATCH request
 * @param url
 * @param payload
 */
export function usePatch<T = unknown>(
  url: MaybeRef<string>,
  payload?: MaybeRef<unknown>
): UseFetchReturn<T> {
  return useRequest<T>(url).patch(payload).json()
}

/**
 * DELETE request
 * @param url
 * @param payload
 */
export function useDelete<T = unknown>(
  url: MaybeRef<string>,
  payload?: MaybeRef<unknown>
): UseFetchReturn<T> {
  return useRequest<T>(url).delete(payload).json()
}
