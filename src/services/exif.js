import EXIF from 'exif-js'

/**
 * 前端解析照片的 GPS WGS-84 原始经纬度
 * @param {File} file 
 * @returns {Promise<{lng: number, lat: number} | null>}
 */
export function getLatLngFromImage(file) {
  return new Promise((resolve) => {
    EXIF.getData(file, function () {
      try {
        const latData = EXIF.getTag(this, 'GPSLatitude')
        const lonData = EXIF.getTag(this, 'GPSLongitude')
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N'
        const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E'

        if (latData && lonData && latData.length === 3 && lonData.length === 3) {
          // 转换度分秒到十进制度
          let lat = latData[0] + latData[1] / 60 + latData[2] / 3600
          let lon = lonData[0] + lonData[1] / 60 + lonData[2] / 3600

          if (latRef === 'S') lat = -lat
          if (lonRef === 'W') lon = -lon

          resolve({ lng: lon, lat: lat })
        } else {
          resolve(null)
        }
      } catch (error) {
        console.error('EXIF parsing failed', error)
        resolve(null)
      }
    })
  })
}
