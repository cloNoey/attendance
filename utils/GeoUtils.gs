/**
 * 지리 계산 유틸리티
 */

const GeoUtils = {
  /**
   * 두 지점 간 거리 계산 (미터)
   * Haversine 공식 사용
   */
  calculateDistance: function(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  },
  
  /**
   * 좌표 유효성 검사
   */
  isValidCoordinate: function(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },
  
  /**
   * 두 지점이 특정 거리 이내인지 확인
   */
  isWithinDistance: function(lat1, lng1, lat2, lng2, maxDistance) {
    const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
    return distance <= maxDistance;
  }
};