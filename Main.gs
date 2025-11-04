/**
 * 메인 진입점
 */

function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile('User')
      .evaluate()
      .setTitle('출석 관리 시스템')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log('doGet Error: ' + error.toString());
    return HtmlService.createHtmlOutput(
      '<h1>오류가 발생했습니다</h1>' +
      '<p>' + error.message + '</p>' +
      '<pre>' + error.stack + '</pre>'
    );
  }
}

// Include 함수
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  try {
    if (!e || !e.parameter || !e.postData) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Invalid request' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);
    
    let result;
    switch(action) {
      case 'updateEventDetails':
        result = EventService.updateDetails(data);
        break;
      case 'updateUserLocation':
        result = LocationService.updateLocation(data);
        break;
      default:
        result = { error: 'Invalid action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function setupTriggers() {
  // 기존 트리거 모두 삭제
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`기존 트리거 ${triggers.length}개 삭제 중...`);
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // 새 트리거 생성
  ScriptApp.newTrigger('periodicLocationCheck')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ 트리거가 설정되었습니다: periodicLocationCheck (1분마다)');
  Logger.log('트리거 메뉴에서 확인 가능합니다.');
}

/**
 * 트리거 상태 확인 함수
 */
function checkTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`========================================`);
  Logger.log(`현재 설정된 트리거: ${triggers.length}개`);
  Logger.log(`========================================`);

  triggers.forEach((trigger, index) => {
    Logger.log(`\n트리거 ${index + 1}:`);
    Logger.log(`  함수: ${trigger.getHandlerFunction()}`);
    Logger.log(`  타입: ${trigger.getEventType()}`);
  });

  if (triggers.length === 0) {
    Logger.log('\n⚠️ 트리거가 설정되지 않았습니다!');
    Logger.log('setupTriggers() 함수를 실행하세요.');
  }

  Logger.log(`========================================`);
}

function periodicLocationCheck() {
  const now = new Date();
  Logger.log('========================================');
  Logger.log('⏰ periodicLocationCheck 실행: ' + now.toISOString());
  Logger.log('========================================');

  try {
    // 위치 기반 이벤트 상태 체크
    Logger.log('📍 LocationService.checkAllActiveEvents() 호출...');
    LocationService.checkAllActiveEvents();
    Logger.log('✅ LocationService.checkAllActiveEvents() 완료');

    // 예정된 알림 체크 및 발송
    Logger.log('🔔 NotificationService.checkAndSendScheduledNotifications() 호출...');
    NotificationService.checkAndSendScheduledNotifications();
    Logger.log('✅ NotificationService.checkAndSendScheduledNotifications() 완료');

    Logger.log('========================================');
  } catch (error) {
    Logger.log('❌ periodicLocationCheck Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
  }
}