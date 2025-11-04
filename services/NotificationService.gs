/**
 * 알림 서비스
 * 알림 스케줄링 및 발송
 */

const NotificationService = {
  /**
   * 알림 스케줄 설정
   */
  scheduleNotifications: function(eventId, userId, prepStartTime, expectedDepartureTime) {
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
    
    notifications.forEach(notif => {
      const notifId = NotificationModel.create(
        eventId,
        userId,
        notif.type,
        notif.message,
        notif.time
      );
      
      // 트리거 설정 (실제 구현 시 시간 기반 트리거 사용)
      // this._createTimeTrigger(notif.time, notifId);
    });
  },
  
  /**
   * 알림 발송
   */
  send: function(notifId) {
    const notification = NotificationModel.getById(notifId);
    if (!notification) {
      Logger.log('Notification not found: ' + notifId);
      return;
    }
    
    const user = UserModel.getById(notification.userId);
    if (!user) {
      Logger.log('User not found: ' + notification.userId);
      return;
    }
    
    // 이메일 발송
    try {
      MailApp.sendEmail(
        user.email,
        '일정 알림',
        notification.message
      );
      
      NotificationModel.updateStatus(notifId, 'Sent', new Date());
    } catch (error) {
      Logger.log('Email send error: ' + error.toString());
      NotificationModel.updateStatus(notifId, 'Failed', null);
    }
  },
  
  /**
   * 맞춤 메시지 발송
   */
  sendCustomMessage: function(userId, attendanceStatus) {
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
      MailApp.sendEmail(user.email, '출석 확인 필요', message);
    } catch (error) {
      Logger.log('Custom message send error: ' + error.toString());
    }
  }
};