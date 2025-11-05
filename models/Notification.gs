/**
 * 알림 모델
 * Notifications 시트와 상호작용
 */

const NotificationModel = {
  /**
   * 알림 생성
   */
  create: function(eventId, userId, type, message, scheduledTime) {
    // 시트가 없으면 자동 생성
    const sheet = SheetUtils.createSheetIfNotExists(
      Config.SHEETS.NOTIFICATIONS,
      ['notificationId', 'eventId', 'userId', 'type', 'message', 'scheduledTime', 'sentTime', 'status']
    );

    const notifId = Utilities.getUuid();

    sheet.appendRow([
      notifId,
      eventId,
      userId,
      type,
      message,
      scheduledTime,
      '',
      'Scheduled'
    ]);

    Logger.log(`알림 생성됨: ${notifId} (타입: ${type}, 예정시간: ${scheduledTime})`);
    return notifId;
  },
  
  /**
   * 알림 상태 업데이트
   */
  updateStatus: function(notifId, status, sentTime) {
    const sheet = SheetUtils.getSheet(Config.SHEETS.NOTIFICATIONS);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === notifId) {
        const rowNum = i + 1;
        
        if (sentTime) {
          sheet.getRange(rowNum, 7).setValue(sentTime);
        }
        sheet.getRange(rowNum, 8).setValue(status);
        return true;
      }
    }
    return false;
  },
  
  /**
   * 알림 조회 by ID
   */
  getById: function(notifId) {
    const sheet = SheetUtils.getSheet(Config.SHEETS.NOTIFICATIONS);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === notifId) {
        return this._rowToObject(values[i], i + 1);
      }
    }
    return null;
  },
  
  /**
   * 행 데이터를 객체로 변환
   */
  _rowToObject: function(row, rowNum) {
    return {
      rowNum: rowNum,
      notificationId: row[0],
      eventId: row[1],
      userId: row[2],
      type: row[3],
      message: row[4],
      scheduledTime: row[5],
      sentTime: row[6],
      status: row[7]
    };
  }
};
