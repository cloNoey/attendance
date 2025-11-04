/**
 * 애플리케이션 설정 및 상수
 */

const Config = {
  // TMap API 키
  TMAP_API_KEY: 'fppcM1GUMT3IeMGARKsbI9erW15EqfJQ7PqApkga',
  
  // 스프레드시트 설정
  get SHEET_ID() {
    return SpreadsheetApp.getActiveSpreadsheet().getId();
  },
  
  // 시트 이름
  SHEETS: {
    EVENTS: 'Events',
    USERS: 'Users',
    NOTIFICATIONS: 'Notifications',
    ATTENDANCE: 'Attendance'
  },
  
  // 거리 기준 (미터)
  DISTANCE: {
    DEPARTURE_CHECK: 5,
    ARRIVAL_SOON: 50,
    ARRIVAL_CHECK: 10
  },
  
  // 시간 기준 (분)
  TIME: {
    PREP_NOTIFICATION_1: 10,
    PREP_NOTIFICATION_2: 5,
    DEPART_NOTIFICATION_1: 10,
    DEPART_NOTIFICATION_2: 5,
    LATE_THRESHOLD: 10,
    ABSENT_THRESHOLD: 30
  },
  
  // 출석 상태
  ATTENDANCE_STATUS: {
    PENDING: 'Pending',
    PRESENT: 'Present',
    LATE: 'Late',
    ABSENT: 'Absent'
  },
  
  // 알림 타입
  NOTIFICATION_TYPE: {
    PREP_10MIN: 'PREP_10MIN',
    PREP_5MIN: 'PREP_5MIN',
    PREP_START: 'PREP_START',
    DEPART_10MIN: 'DEPART_10MIN',
    DEPART_5MIN: 'DEPART_5MIN',
    DEPART_NOW: 'DEPART_NOW',
    ATTENDANCE_CHANGED: 'ATTENDANCE_CHANGED',
    CUSTOM_MESSAGE: 'CUSTOM_MESSAGE'
  },
  
  // 스크립트 시간대
  TIMEZONE: Session.getScriptTimeZone()
};