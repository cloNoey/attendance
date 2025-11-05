/**
 * 알림 서비스
 * 알림 스케줄링 및 발송
 */

const NotificationService = {
  /**
   * 알림 스케줄 설정
   */
  scheduleNotifications: function(eventId, userId, prepStartTime, expectedDepartureTime) {
    try {
      Logger.log(`알림 스케줄링 시작 - eventId: ${eventId}, userId: ${userId}`);
      Logger.log(`준비 시작 시간: ${prepStartTime}, 출발 시간: ${expectedDepartureTime}`);

      const notifications = [
        {
          time: new Date(prepStartTime.getTime() - Config.TIME.PREP_NOTIFICATION_1 * 60000),
          type: Config.NOTIFICATION_TYPE.PREP_10MIN,
          message: '준비 시작 10분 전입니다.'
        },
        {
          time: new Date(prepStartTime.getTime() - Config.TIME.PREP_NOTIFICATION_2 * 60000),
          type: Config.NOTIFICATION_TYPE.PREP_5MIN,
          message: '준비 시작 5분 전입니다.'
        },
        {
          time: prepStartTime,
          type: Config.NOTIFICATION_TYPE.PREP_START,
          message: '준비를 시작하세요!'
        },
        {
          time: new Date(expectedDepartureTime.getTime() - Config.TIME.DEPART_NOTIFICATION_1 * 60000),
          type: Config.NOTIFICATION_TYPE.DEPART_10MIN,
          message: '출발 10분 전입니다.'
        },
        {
          time: new Date(expectedDepartureTime.getTime() - Config.TIME.DEPART_NOTIFICATION_2 * 60000),
          type: Config.NOTIFICATION_TYPE.DEPART_5MIN,
          message: '출발 5분 전입니다.'
        },
        {
          time: expectedDepartureTime,
          type: Config.NOTIFICATION_TYPE.DEPART_NOW,
          message: '출발하세요!'
        }
      ];

      let createdCount = 0;
      notifications.forEach(notif => {
        const notifId = NotificationModel.create(
          eventId,
          userId,
          notif.type,
          notif.message,
          notif.time
        );
        if (notifId) createdCount++;
      });

      Logger.log(`✅ 알림 ${createdCount}개 생성 완료`);
    } catch (error) {
      Logger.log(`❌ scheduleNotifications 에러: ${error.toString()}`);
      throw error;
    }
  },

  /**
   * 예정된 알림 체크 및 발송 처리
   * (1분마다 실행되는 트리거에서 호출)
   */
  checkAndSendScheduledNotifications: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.NOTIFICATIONS);

      if (!sheet) {
        Logger.log('⚠️ Notifications 시트를 찾을 수 없습니다. initializeAllSheets()를 실행하세요.');
        return;
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        Logger.log('알림 체크: 예정된 알림이 없습니다.');
        return;
      }

      const now = new Date();
      const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
      let processedCount = 0;

      for (let i = 0; i < values.length; i++) {
        const notificationId = values[i][0];
        const scheduledTime = new Date(values[i][5]);
        const status = values[i][7];

        // status가 'Scheduled'이고 예정 시간이 현재 시간 이내인 경우
        if (status === 'Scheduled' && scheduledTime <= now) {
          const rowNum = i + 2;

          // sentTime 업데이트
          sheet.getRange(rowNum, 7).setValue(now);
          // status를 'Sent'로 업데이트
          sheet.getRange(rowNum, 8).setValue('Sent');

          Logger.log(`✅ 알림 발송 처리: ${notificationId} (예정: ${scheduledTime}, 발송: ${now})`);
          processedCount++;
        }
      }

      if (processedCount > 0) {
        Logger.log(`📤 총 ${processedCount}개 알림 발송 완료`);
      }
    } catch (error) {
      Logger.log('❌ checkAndSendScheduledNotifications Error: ' + error.toString());
      Logger.log('Stack: ' + error.stack);
    }
  },
  
  /**
   * 알림 발송 (시트 업데이트만 수행)
   */
  send: function(notifId) {
    const notification = NotificationModel.getById(notifId);
    if (!notification) {
      Logger.log('Notification not found: ' + notifId);
      return;
    }

    // 실제 이메일 발송은 하지 않고, Notifications 시트만 업데이트
    try {
      NotificationModel.updateStatus(notifId, 'Sent', new Date());
      Logger.log('알림 발송 처리 완료: ' + notifId);
    } catch (error) {
      Logger.log('Notification update error: ' + error.toString());
      NotificationModel.updateStatus(notifId, 'Failed', null);
    }
  },
  
  /**
   * 맞춤 메시지 발송 (Notifications 시트에 기록)
   */
  sendCustomMessage: function(eventId, userId, attendanceStatus) {
    const user = UserModel.getById(userId);
    if (!user) return;

    let message = '';
    switch(attendanceStatus) {
      case Config.ATTENDANCE_STATUS.ABSENT:
        message = '아직 도착하지 않으셨습니다. 괜찮으신가요?';
        break;
      case Config.ATTENDANCE_STATUS.PENDING:
        message = '도착 예정 시간을 초과했습니다. 현재 상황을 알려주세요.';
        break;
      default:
        message = '도착 확인이 필요합니다.';
    }

    try {
      // Notifications 시트에 기록
      const notifId = NotificationModel.create(
        eventId,
        userId,
        Config.NOTIFICATION_TYPE.CUSTOM_MESSAGE,
        message,
        new Date()
      );

      // 즉시 발송된 것으로 처리
      NotificationModel.updateStatus(notifId, 'Sent', new Date());
      Logger.log('맞춤 메시지 발송 처리 완료: ' + notifId);
    } catch (error) {
      Logger.log('Custom message send error: ' + error.toString());
    }
  }
};

/**
 * 글로벌 래퍼 함수들 (트리거에서 직접 호출 가능)
 */

/**
 * 예정된 알림 체크 및 발송 처리
 * 트리거에서 직접 호출 가능
 */
function checkAndSendScheduledNotifications() {
  return NotificationService.checkAndSendScheduledNotifications();
}

/**
 * 알림 스케줄 설정
 * 트리거에서 직접 호출 가능
 */
function scheduleNotifications(eventId, userId, prepStartTime, expectedDepartureTime) {
  return NotificationService.scheduleNotifications(eventId, userId, prepStartTime, expectedDepartureTime);
}

/**
 * 알림 발송
 * 트리거에서 직접 호출 가능
 */
function sendNotification(notifId) {
  return NotificationService.send(notifId);
}

/**
 * 맞춤 메시지 발송
 * 트리거에서 직접 호출 가능
 */
function sendCustomMessage(eventId, userId, attendanceStatus) {
  return NotificationService.sendCustomMessage(eventId, userId, attendanceStatus);
}