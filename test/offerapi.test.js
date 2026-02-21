/* 
* <license header>
*/

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn()
  }
}))

const { Core } = require('@adobe/aio-sdk')
const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

jest.mock('node-fetch')
const fetch = require('node-fetch')
const action = require('./../actions/offerapi/index.js')

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
  fetch.mockReset()
})

describe('offerapi', () => {
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should set logger to use LOG_LEVEL param', async () => {
    fetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(JSON.stringify({ data: {} })) })
    await action.main({ offerPath: '/content/dam/securbank/new', LOG_LEVEL: 'fakeLevel' })
    expect(Core.Logger).toHaveBeenCalledWith(expect.any(String), { level: 'fakeLevel' })
  })

  test('should return proxied response on success', async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { offerByPath: { item: { headline: 'fake' } } } }))
    })

    const response = await action.main({ offerPath: '/content/dam/securbank/new' })
    expect(response.statusCode).toBe(200)
    expect(response.body.request.variables.offerPath).toBe('/content/dam/securbank/new')
    expect(response.body.response.data.offerByPath.item.headline).toBe('fake')
  })

  test('if there is an error should return 500 and log the error', async () => {
    const fakeError = new Error('fake')
    fetch.mockRejectedValue(fakeError)

    const response = await action.main({ offerPath: '/content/dam/securbank/new' })
    expect(response).toEqual({
      error: {
        statusCode: 500,
        body: { error: 'fake' }
      }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(fakeError)
  })

  test('if upstream is not ok should return upstream status and details', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ errors: [{ message: 'not found' }] }))
    })

    const response = await action.main({ offerPath: '/content/dam/securbank/new' })
    expect(response.statusCode).toBe(404)
    expect(response.body.details[0].message).toBe('not found')
    expect(response.body.error).toContain('404')
  })
})
