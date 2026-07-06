import { describe, it, expect } from 'vitest'
import { convertWgs84ToGcj02, convertGcj02ToBd09 } from '../src/services/coord'

describe('Coordinate Conversion Test', () => {
  it('should convert WGS-84 to GCJ-02 correctly', () => {
    // 采用天安门坐标 WGS84: 116.397428, 39.908757
    const result = convertWgs84ToGcj02(116.397428, 39.908757)
    expect(result.lng).toBeGreaterThan(116.4)
    expect(result.lat).toBeGreaterThan(39.9)
  })

  it('should convert GCJ-02 to BD-09 correctly', () => {
    // GCJ02: 116.403977, 39.910078
    const result = convertGcj02ToBd09(116.403977, 39.910078)
    expect(result.lng).toBeGreaterThan(116.409)
    expect(result.lat).toBeGreaterThan(39.91)
  })
})
