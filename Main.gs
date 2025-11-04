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
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  ScriptApp.newTrigger('periodicLocationCheck')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  Logger.log('트리거가 설정되었습니다.');
}

function periodicLocationCheck() {
  try {
    // 위치 기반 이벤트 상태 체크
    LocationService.checkAllActiveEvents();

    // 예정된 알림 체크 및 발송
    NotificationService.checkAndSendScheduledNotifications();
  } catch (error) {
    Logger.log('periodicLocationCheck Error: ' + error.toString());
  }
}