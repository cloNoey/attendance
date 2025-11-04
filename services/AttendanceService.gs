/**
 * 출석 서비스
 * 출석 관련 비즈니스 로직
 */

const AttendanceService = {
  /**
   * 출석 체크
   */
  check: function(data) {
    try {
      const event = EventModel.getById(data.eventId);
      if (!event) {
        throw new Error('이벤트를 찾을 수 없습니다.');
      }
      
      // 위치 기반 출석 체크는 LocationService에서 처리
      // 이 함수는 수동 출석 체크 등에 사용
      
      return {
        success: true,
        attendance: AttendanceModel.getByEventId(data.eventId)
      };
    } catch (error) {
      Logger.log('AttendanceService.check Error: ' + error.toString());
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * 모든 출석 현황 조회
   */
  getAllStatus: function() {
    return AttendanceModel.getAll();
  },
  
  /**
   * 특정 날짜의 출석 현황 조회
   */
  getStatusByDate: function(date) {
    const allRecords = AttendanceModel.getAll();
    return allRecords.filter(record => {
      const recordDate = Utilities.formatDate(
        new Date(record.date),
        Config.TIMEZONE,
        'yyyy-MM-dd'
      );
      return recordDate === date;
    });
  }
};