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
    Logger.log('=== checkAndSendScheduledNotifications 시작 ===');

    try {
      Logger.log('1. SpreadsheetApp 가져오기 시도...');
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      Logger.log('2. Spreadsheet ID: ' + ss.getId());

      Logger.log('3. Notifications 시트 찾기... (시트명: ' + Config.SHEETS.NOTIFICATIONS + ')');
      const sheet = ss.getSheetByName(Config.SHEETS.NOTIFICATIONS);

      if (!sheet) {
        Logger.log('⚠️ Notifications 시트를 찾을 수 없습니다. initializeAllSheets()를 실행하세요.');
        Logger.log('사용 가능한 시트 목록:');
        ss.getSheets().forEach(s => Logger.log('  - ' + s.getName()));
        return;
      }

      Logger.log('4. Notifications 시트 발견. 데이터 확인 중...');
      const lastRow = sheet.getLastRow();
      Logger.log('5. 마지막 행 번호: ' + lastRow);

      if (lastRow < 2) {
        Logger.log('알림 체크: 예정된 알림이 없습니다. (lastRow < 2)');
        return;
      }

      const now = new Date();
      Logger.log('6. 현재 시간: ' + now);

      const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
      Logger.log('7. 총 ' + values.length + '개의 알림 레코드 확인');

      let processedCount = 0;

      for (let i = 0; i < values.length; i++) {
        const notificationId = values[i][0];
        const scheduledTime = new Date(values[i][5]);
        const status = values[i][7];

        Logger.log(`  - 알림 ${i + 1}: ID=${notificationId}, 예정=${scheduledTime}, 상태=${status}`);

        // status가 'Scheduled'이고 예정 시간이 현재 시간 이내인 경우
        if (status === 'Scheduled' && scheduledTime <= now) {
          const rowNum = i + 2;

          Logger.log(`    ➡️ 발송 조건 만족! 행 ${rowNum} 업데이트 중...`);

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
      } else {
        Logger.log('발송할 알림 없음 (모든 알림이 미래 시간이거나 이미 발송됨)');
      }

      Logger.log('=== checkAndSendScheduledNotifications 완료 ===');
    } catch (error) {
      Logger.log('❌ checkAndSendScheduledNotifications Error: ' + error.toString());
      Logger.log('Error name: ' + error.name);
      Logger.log('Error message: ' + error.message);
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
  Logger.log('🔔 [글로벌 함수] checkAndSendScheduledNotifications() 호출됨');

  try {
    const result = NotificationService.checkAndSendScheduledNotifications();
    Logger.log('🔔 [글로벌 함수] checkAndSendScheduledNotifications() 완료');
    return result;
  } catch (error) {
    Logger.log('🔔 [글로벌 함수] 에러 발생: ' + error.toString());
    throw error;
  }
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

/**
 * 디버깅용 테스트 함수
 * Logger가 정상 작동하는지 확인
 */
function testNotificationLogging() {
  Logger.log('=== 테스트 시작 ===');
  Logger.log('1. Logger.log 테스트');
  console.log('2. console.log 테스트');

  try {
    Logger.log('3. Config 확인: ' + JSON.stringify(Config.SHEETS));

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('4. Spreadsheet 이름: ' + ss.getName());
    Logger.log('5. Spreadsheet ID: ' + ss.getId());

    const sheets = ss.getSheets();
    Logger.log('6. 전체 시트 개수: ' + sheets.length);
    sheets.forEach(function(sheet, index) {
      Logger.log('   시트 ' + (index + 1) + ': ' + sheet.getName());
    });

    const notifSheet = ss.getSheetByName(Config.SHEETS.NOTIFICATIONS);
    if (notifSheet) {
      Logger.log('7. Notifications 시트 있음');
      Logger.log('   - 마지막 행: ' + notifSheet.getLastRow());
      Logger.log('   - 마지막 열: ' + notifSheet.getLastColumn());
    } else {
      Logger.log('7. Notifications 시트 없음!');
    }

    Logger.log('=== 테스트 완료 ===');
    return { success: true, message: '테스트 성공! 실행 로그를 확인하세요.' };
  } catch (error) {
    Logger.log('❌ 테스트 에러: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.message };
  }
}