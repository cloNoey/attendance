/**
 * 날짜 유틸리티
 */

const DateUtils = {
  /**
   * 날짜 포맷팅
   */
  format: function(date, format) {
    return Utilities.formatDate(date, Config.TIMEZONE, format);
  },
  
  /**
   * 현재 시간 가져오기
   */
  now: function() {
    return new Date();
  },
  
  /**
   * 분 추가
   */
  addMinutes: function(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  },
  
  /**
   * 두 시간의 차이 (분)
   */
  diffInMinutes: function(date1, date2) {
    return (date1 - date2) / 60000;
  },
  
  /**
   * ISO 문자열을 Date 객체로 변환
   */
  parseISO: function(isoString) {
    return new Date(isoString);
  }
};