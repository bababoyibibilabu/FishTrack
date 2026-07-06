import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getLatLngFromImage } from '../src/services/exif'
import EXIF from 'exif-js'

vi.mock('exif-js', () => {
  return {
    default: {
      getData: vi.fn(),
      getTag: vi.fn()
    }
  }
})

describe('EXIF Parser Service Test', () => {
  let consoleSpy

  beforeEach(() => {
    vi.clearAllMocks()
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('should extract GPS tags and return WGS-84 decimal coordinates when valid tags are present', async () => {
    EXIF.getData.mockImplementationOnce((file, callback) => {
      callback.call(file)
    })
    
    EXIF.getTag.mockImplementation((self, tag) => {
      if (tag === 'GPSLatitude') return [39, 54, 31.5]
      if (tag === 'GPSLongitude') return [116, 23, 50.7]
      if (tag === 'GPSLatitudeRef') return 'N'
      if (tag === 'GPSLongitudeRef') return 'E'
      return null
    })

    const result = await getLatLngFromImage({})
    expect(result).not.toBeNull()
    expect(result.lat).toBeCloseTo(39.90875, 6)
    expect(result.lng).toBeCloseTo(116.397417, 6)
  })

  it('should handle negative coordinates correctly (S and W)', async () => {
    EXIF.getData.mockImplementationOnce((file, callback) => {
      callback.call(file)
    })
    
    EXIF.getTag.mockImplementation((self, tag) => {
      if (tag === 'GPSLatitude') return [39, 54, 31.5]
      if (tag === 'GPSLongitude') return [116, 23, 50.7]
      if (tag === 'GPSLatitudeRef') return 'S'
      if (tag === 'GPSLongitudeRef') return 'W'
      return null
    })

    const result = await getLatLngFromImage({})
    expect(result).not.toBeNull()
    expect(result.lat).toBeCloseTo(-39.90875, 6)
    expect(result.lng).toBeCloseTo(-116.397417, 6)
  })

  it('should resolve to null when the image has no GPS tags', async () => {
    EXIF.getData.mockImplementationOnce((file, callback) => {
      callback.call(file)
    })
    
    EXIF.getTag.mockReturnValue(null)

    const result = await getLatLngFromImage({})
    expect(result).toBeNull()
  })

  it('should resolve to null and log the error when an exception is thrown', async () => {
    EXIF.getData.mockImplementationOnce((file, callback) => {
      callback.call(file)
    })
    
    EXIF.getTag.mockImplementation(() => {
      throw new Error('Mock EXIF parsing failure')
    })

    const result = await getLatLngFromImage({})
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      'EXIF parsing failed',
      expect.any(Error)
    )
  })
})
