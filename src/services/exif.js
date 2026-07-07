import EXIF from 'exif-js'

export function getLatLngFromImage(file, onProgress = () => {}) {
  return new Promise((resolve) => {
    let resolved = false

    onProgress('[Step 1/4] 初始化解析服务...')

    // 全局 5 秒安全超时，防止任何未捕获状态导致 Promise 挂起
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true
        console.warn('EXIF parsing timed out after 5000ms')
        onProgress('[Timeout] 解析超时，已自动跳过')
        resolve(null)
      }
    }, 5000)

    // Node 测试环境下没有 FileReader，降级使用旧版 EXIF.getData 以保证测试兼容性
    if (typeof FileReader === 'undefined') {
      try {
        EXIF.getData(file, function () {
          if (resolved) return
          resolved = true
          clearTimeout(timeoutId)

          try {
            const latData = EXIF.getTag(this, 'GPSLatitude')
            const lonData = EXIF.getTag(this, 'GPSLongitude')
            const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N'
            const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E'

            if (latData && lonData && latData.length === 3 && lonData.length === 3) {
              let lat = Number(latData[0]) + Number(latData[1]) / 60 + Number(latData[2]) / 3600
              let lon = Number(lonData[0]) + Number(lonData[1]) / 60 + Number(lonData[2]) / 3600

              if (latRef === 'S') lat = -lat
              if (lonRef === 'W') lon = -lon

              if (!isNaN(lat) && isFinite(lat) && !isNaN(lon) && isFinite(lon) && lat !== 0 && lon !== 0) {
                resolve({ lng: lon, lat: lat })
              } else {
                resolve(null)
              }
            } else {
              resolve(null)
            }
          } catch (error) {
            console.error('EXIF parsing failed', error)
            resolve(null)
          }
        })
      } catch (error) {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          console.error('EXIF.getData threw synchronous error', error)
          resolve(null)
        }
      }
      return
    }

    onProgress('[Step 2/4] 正在读取照片二进制流...')
    // 浏览器环境下使用 FileReader + EXIF.readFromBinaryFile
    const reader = new FileReader()

    reader.onload = (e) => {
      onProgress('[Step 3/4] 数据流读取成功，开始分析 EXIF 标记...')
      try {
        const arrayBuffer = e.target.result
        
        onProgress('[Step 3/4] 正在进行 EXIF 二进制解码...')
        const exifData = EXIF.readFromBinaryFile(arrayBuffer)
        
        onProgress('[Step 4/4] 解码成功，正在校验并计算 GPS 坐标...')

        if (resolved) return
        clearTimeout(timeoutId)

        if (exifData) {
          try {
            const latData = exifData.GPSLatitude
            const lonData = exifData.GPSLongitude
            const latRef = exifData.GPSLatitudeRef || 'N'
            const lonRef = exifData.GPSLongitudeRef || 'E'

            if (latData && lonData && latData.length === 3 && lonData.length === 3) {
              const latDeg = Number(latData[0])
              const latMin = Number(latData[1])
              const latSec = Number(latData[2])
              
              const lonDeg = Number(lonData[0])
              const lonMin = Number(lonData[1])
              const lonSec = Number(lonData[2])

              let lat = latDeg + latMin / 60 + latSec / 3600
              let lon = lonDeg + lonMin / 60 + lonSec / 3600

              if (latRef === 'S') lat = -lat
              if (lonRef === 'W') lon = -lon

              if (!isNaN(lat) && isFinite(lat) && !isNaN(lon) && isFinite(lon) && lat !== 0 && lon !== 0) {
                resolved = true
                resolve({ lng: lon, lat: lat })
                return
              }
            }
          } catch (calcError) {
            console.error('GPS calculation failed', calcError)
            resolved = true
            resolve({ error: 'GPS calculation failed: ' + (calcError.message || String(calcError)) })
            return
          }
        }
        resolved = true
        resolve(null)
      } catch (error) {
        if (resolved) return
        resolved = true
        clearTimeout(timeoutId)
        console.error('EXIF parsing failed', error)
        resolve({ error: error.message || String(error) })
      }
    }

    reader.onerror = (error) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeoutId)
      console.error('File reading failed', error)
      resolve({ error: 'File reading failed: ' + (error.message || String(error)) })
    }

    // 关键优化：只读取图片的前 2MB (足够容纳所有手机照片的完整 EXIF 头部段，同时避开 10MB+ 大图读取造成的内存开销)
    const fileSlice = file.slice ? file.slice(0, 2 * 1024 * 1024) : file
    reader.readAsArrayBuffer(fileSlice)
  })
}
