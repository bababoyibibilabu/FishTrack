import coordtransform from 'coordtransform'

/**
 * 将 WGS-84 (地球标准 GPS) 经纬度转换为 GCJ-02 (高德火星坐标系)
 * @param {number} lng 
 * @param {number} lat 
 * @returns {{lng: number, lat: number}}
 */
export function convertWgs84ToGcj02(lng, lat) {
  const result = coordtransform.wgs84togcj02(lng, lat)
  return { lng: result[0], lat: result[1] }
}

/**
 * 将 GCJ-02 (高德火星坐标系) 经纬度转换为 BD-09 (百度坐标系)
 * @param {number} lng 
 * @param {number} lat 
 * @returns {{lng: number, lat: number}}
 */
export function convertGcj02ToBd09(lng, lat) {
  const result = coordtransform.gcj02tobd09(lng, lat)
  return { lng: result[0], lat: result[1] }
}
