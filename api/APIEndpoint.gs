/**
 * REST API 엔드포인트
 * 웹앱에서 호출되는 함수들
 */

/**
 * 시간 기반 출석 상태 체크 (클라이언트에서 명시적으로 호출)
 */
function checkAttendanceStatus() {
  try {
    Logger.log('=== checkAttendanceStatus 호출 ===');
    const now = new Date();
    LocationService.checkAllActiveEvents();
    Logger.log('✅ checkAttendanceStatus 완료: ' + now.toISOString());
    return { success: true, timestamp: now.toISOString() };
  } catch (error) {
    Logger.log('❌ checkAttendanceStatus 에러: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 사용자별 이벤트 조회 - 메인 함수
 */
function getEventsByUser(userId) {
  Logger.log('=== getEventsByUser 웹앱 호출 ===');
  Logger.log('userId: ' + userId);
  Logger.log('타입: ' + typeof userId);

  try {
    // 명시적으로 SpreadsheetApp 사용
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Events');

    if (!sheet) {
      Logger.log('❌ Events 시트 없음');
      // null 대신 빈 배열 반환
      return [];
    }

    // 전체 데이터 가져오기
    const allData = sheet.getDataRange().getValues();
    Logger.log('전체 데이터 행 수: ' + allData.length);

    if (allData.length <= 1) {
      Logger.log('데이터 없음 (헤더만 있음)');
      return [];
    }

    // userId 정규화
    const searchUserId = String(userId).trim();
    Logger.log('검색할 userId: "' + searchUserId + '"');

    // 결과 배열
    const results = [];

    // 헤더 제외하고 순회 (i=1부터 시작)
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const rowUserId = String(row[1]).trim(); // userId는 2번째 컬럼 (인덱스 1)

      Logger.log('행 ' + (i + 1) + ': userId = "' + rowUserId + '", eventId = ' + row[0] + ' (타입: ' + typeof row[0] + ')');

      if (rowUserId === searchUserId) {
        Logger.log('✅ 매칭: 행 ' + (i + 1));

        // 객체 생성 - 명시적으로 모든 필드 지정
        const eventObj = {
          eventId: Number(row[0] || 0),
          userId: String(row[1] || ''),
          userName: String(row[2] || ''),
          destination: String(row[3] || ''),
          destinationLat: Number(row[4] || 0),
          destinationLng: Number(row[5] || 0),
          arrivalTime: row[6] ? new Date(row[6]).toISOString() : '',
          departureLocation: String(row[7] || ''),
          departureLat: row[8] ? Number(row[8]) : '',
          departureLng: row[9] ? Number(row[9]) : '',
          prepTime: row[10] ? Number(row[10]) : '',
          travelTime: row[11] ? Number(row[11]) : '',
          expectedDepartureTime: row[12] ? new Date(row[12]).toISOString() : '',
          prepStartTime: row[13] ? new Date(row[13]).toISOString() : '',
          actualDepartureTime: row[14] ? new Date(row[14]).toISOString() : '',
          attendanceStatus: String(row[15] || 'Pending'),
          isLocated: Boolean(row[16]),
          arriveSoon: Boolean(row[17]),
          createdAt: row[18] ? new Date(row[18]).toISOString() : ''
        };

        Logger.log('생성된 이벤트 객체: ' + JSON.stringify(eventObj));
        results.push(eventObj);
      }
    }

    Logger.log('반환할 이벤트 수: ' + results.length);
    Logger.log('반환 데이터: ' + JSON.stringify(results));

    // 결과 반환 - null이 아닌 배열 보장
    return results;

  } catch (error) {
    Logger.log('❌ getEventsByUser 에러: ' + error.toString());
    Logger.log('스택: ' + error.stack);

    // 에러 발생 시에도 빈 배열 반환 (null 방지)
    return [];
  }
}

/**
 * 사용자 조회
 */
function getUserById(userId) {
  Logger.log('=== getUserById 웹앱 호출 ===');
  Logger.log('userId: ' + userId);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      Logger.log('❌ Users 시트 없음');
      return null;
    }
    
    const allData = sheet.getDataRange().getValues();
    
    if (allData.length <= 1) {
      Logger.log('Users 데이터 없음');
      return null;
    }
    
    const searchUserId = String(userId).trim();
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const rowUserId = String(row[0]).trim();
      
      if (rowUserId === searchUserId) {
        Logger.log('✅ 사용자 찾음: 행 ' + (i + 1));
        
        return {
          userId: String(row[0]),
          userName: String(row[1]),
          email: String(row[2]),
          phone: String(row[3])
        };
      }
    }
    
    Logger.log('❌ 사용자 못 찾음');
    return null;
    
  } catch (error) {
    Logger.log('❌ getUserById 에러: ' + error.toString());
    return null;
  }
}

/**
 * 사용자 위치 업데이트
 */
function updateUserLocation(data) {
  Logger.log('=== updateUserLocation 웹앱 호출 ===');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      return { success: false, error: 'Users 시트 없음' };
    }
    
    const allData = sheet.getDataRange().getValues();
    const searchUserId = String(data.userId).trim();
    
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === searchUserId) {
        const rowNum = i + 1;
        
        sheet.getRange(rowNum, 5).setValue(data.lat);  // currentLat
        sheet.getRange(rowNum, 6).setValue(data.lng);  // currentLng
        sheet.getRange(rowNum, 7).setValue(new Date()); // lastUpdate
        
        Logger.log('✅ 위치 업데이트 완료');
        return { success: true };
      }
    }
    
    Logger.log('❌ 사용자 못 찾음');
    return { success: false, error: '사용자를 찾을 수 없습니다' };
    
  } catch (error) {
    Logger.log('❌ updateUserLocation 에러: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 이벤트 상세 정보 업데이트
 */
function updateEventDetails(data) {
  Logger.log('=== updateEventDetails 웹앱 호출 ===');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eventsSheet = ss.getSheetByName('Events');
    
    if (!eventsSheet) {
      return { success: false, error: 'Events 시트 없음' };
    }
    
    // 이벤트 찾기
    const allData = eventsSheet.getDataRange().getValues();
    let eventRow = -1;
    let eventData = null;

    // eventId를 숫자로 변환하여 비교
    const searchId = Number(data.eventId);

    for (let i = 1; i < allData.length; i++) {
      if (Number(allData[i][0]) === searchId) {
        eventRow = i + 1;
        eventData = allData[i];
        break;
      }
    }
    
    if (eventRow === -1) {
      return { success: false, error: '이벤트를 찾을 수 없습니다' };
    }
    
    const arrivalTime = new Date(eventData[6]);

    // 클라이언트에서 계산한 예상 시간 사용
    const travelTime = data.estimatedTravelTime || 30;

    // 시간 계산: 도착시각에서 (이동시간 + 10분 버퍼)를 빼서 출발 예정 시각 계산
    const expectedDepartureTime = new Date(arrivalTime.getTime() - (travelTime + Config.TIME.BUFFER_TIME) * 60000);
    // 출발 예정 시각에서 준비시간을 빼서 준비시작시각 계산
    const prepStartTime = new Date(expectedDepartureTime.getTime() - data.prepTime * 60000);
    
    // 시트 업데이트
    eventsSheet.getRange(eventRow, 8).setValue(data.departureLocation);
    eventsSheet.getRange(eventRow, 9).setValue(data.departureLat);
    eventsSheet.getRange(eventRow, 10).setValue(data.departureLng);
    eventsSheet.getRange(eventRow, 11).setValue(data.prepTime);
    eventsSheet.getRange(eventRow, 12).setValue(travelTime);
    eventsSheet.getRange(eventRow, 13).setValue(expectedDepartureTime);
    eventsSheet.getRange(eventRow, 14).setValue(prepStartTime);
    
    Logger.log('✅ 이벤트 업데이트 완료');
    
    return {
      success: true,
      travelTime: travelTime,
      expectedDepartureTime: expectedDepartureTime.toISOString(),
      prepStartTime: prepStartTime.toISOString()
    };
    
  } catch (error) {
    Logger.log('❌ updateEventDetails 에러: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 테스트 함수
 */
function testSimpleFunction() {
  Logger.log('testSimpleFunction 호출됨');
  return {
    success: true,
    message: 'Hello from Apps Script!',
    timestamp: new Date().toISOString()
  };
}

/**
 * 초기화 함수들
 */
function initializeAllSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Events 시트
    let eventsSheet = ss.getSheetByName('Events');
    if (!eventsSheet) {
      eventsSheet = ss.insertSheet('Events');
      eventsSheet.getRange(1, 1, 1, 19).setValues([[
        'eventId', 'userId', 'userName', 'destination', 'destinationLat', 'destinationLng',
        'arrivalTime', 'departureLocation', 'departureLat', 'departureLng', 'prepTime',
        'travelTime', 'expectedDepartureTime', 'prepStartTime', 'actualDepartureTime',
        'attendanceStatus', 'isLocated', 'arriveSoon', 'createdAt'
      ]]);
      eventsSheet.getRange(1, 1, 1, 19)
        .setBackground('#4a86e8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }
    
    // Users 시트
    let usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('Users');
      usersSheet.getRange(1, 1, 1, 7).setValues([[
        'userId', 'userName', 'email', 'phone', 'currentLat', 'currentLng', 'lastUpdate'
      ]]);
      usersSheet.getRange(1, 1, 1, 7)
        .setBackground('#4a86e8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      
      const now = new Date();
      usersSheet.appendRow(['user1', '홍길동', 'user1@example.com', '010-1234-5678', '', '', now]);
      usersSheet.appendRow(['user2', '김철수', 'user2@example.com', '010-2345-6789', '', '', now]);
      usersSheet.appendRow(['user3', '이영희', 'user3@example.com', '010-3456-7890', '', '', now]);
    }
    
    // Notifications 시트
    let notifsSheet = ss.getSheetByName('Notifications');
    if (!notifsSheet) {
      notifsSheet = ss.insertSheet('Notifications');
      notifsSheet.getRange(1, 1, 1, 8).setValues([[
        'notificationId', 'eventId', 'userId', 'type', 'message', 'scheduledTime', 'sentTime', 'status'
      ]]);
      notifsSheet.getRange(1, 1, 1, 8)
        .setBackground('#4a86e8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }
    
    // Attendance 시트
    let attendanceSheet = ss.getSheetByName('Attendance');
    if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet('Attendance');
      attendanceSheet.getRange(1, 1, 1, 10).setValues([[
        'eventId', 'Name', 'Phone', 'Present', 'Status', 'Date', 'CheckInTime', 'ScheduledDate', 'ScheduledTime', 'ArrivingSoon'
      ]]);
      attendanceSheet.getRange(1, 1, 1, 10)
        .setBackground('#4a86e8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      attendanceSheet.hideColumns(1);
    }
    
    Logger.log('✅ 초기화 완료');
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ 초기화 에러: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 상세 경로 정보 조회 - TMap API 사용
 */
function getDetailedRoutes(data) {
  Logger.log('=== getDetailedRoutes 호출 ===');
  
  try {
    const originLat = data.originLat;
    const originLng = data.originLng;
    const destLat = data.destLat;
    const destLng = data.destLng;
    
    // TMap API 호출
    const transit = TMapAPI.getTransitRoute(originLng, originLat, destLng, destLat);
    const drive = TMapAPI.getDrivingRoute(originLng, originLat, destLng, destLat);
    const walk = TMapAPI.getPedestrianRoute(originLng, originLat, destLng, destLat);
    
    // fallback: API 실패 시 거리 기반 추정
    const distance = calculateDistance(originLat, originLng, destLat, destLng);
    
    return {
      success: true,
      routes: {
        transit: transit || generateFallbackTransit(distance),
        drive: drive || generateFallbackDrive(distance),
        walk: walk || generateFallbackWalk(distance)
      }
    };
    
  } catch (error) {
    Logger.log('getDetailedRoutes 에러: ' + error.toString());
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fallback: 대중교통 경로 추정
 */
function generateFallbackTransit(distance) {
  const duration = Math.ceil((distance / 40) * 60);
  const fare = calculateTransitFare(distance);
  
  return {
    duration: duration,
    distance: distance.toFixed(1),
    fare: fare,
    steps: [
      {
        icon: '🚶',
        color: '#4facfe',
        title: '출발지에서 도보',
        description: '가까운 정류장/역으로 이동',
        duration: 5
      },
      {
        icon: '🚇',
        color: '#667eea',
        title: '대중교통 이용',
        description: '지하철 또는 버스 이용',
        duration: duration - 10
      },
      {
        icon: '🚶',
        color: '#4facfe',
        title: '도착지까지 도보',
        description: '정류장/역에서 목적지로 이동',
        duration: 5
      }
    ],
    summary: {
      totalWalkDistance: Math.round(distance * 200),
      totalWalkTime: 10
    },
    isFallback: true
  };
}

/**
 * Fallback: 자동차 경로 추정
 */
function generateFallbackDrive(distance) {
  const duration = Math.ceil((distance / 50) * 60);
  let taxiFare = 4800;
  
  if (distance > 2) {
    taxiFare += Math.ceil((distance - 2) / 0.132) * 100;
  }
  
  taxiFare += Math.ceil(duration / 10) * 1000;
  
  return {
    duration: duration,
    distance: distance.toFixed(1),
    taxiFare: Math.ceil(taxiFare / 100) * 100,
    tollFare: distance > 30 ? Math.ceil(distance / 10) * 1000 : 0,
    isFallback: true
  };
}

/**
 * Fallback: 도보 경로 추정
 */
function generateFallbackWalk(distance) {
  const duration = Math.ceil((distance / 4) * 60);
  
  return {
    duration: duration,
    distance: distance.toFixed(1),
    calories: Math.ceil(distance * 50),
    isFallback: true
  };
}

/**
 * 대중교통 요금 계산
 */
function calculateTransitFare(distance) {
  if (distance <= 10) {
    return 1400;
  } else if (distance <= 50) {
    return 1400 + Math.ceil((distance - 10) / 5) * 100;
  } else {
    return 1400 + 800 + Math.ceil((distance - 50) / 8) * 100;
  }
}

/**
 * 두 지점 간 거리 계산 (km)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * 샘플 이벤트 생성
 */
function createSampleEvent() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eventsSheet = ss.getSheetByName('Events');
    
    if (!eventsSheet) {
      return { success: false, error: 'Events 시트 없음' };
    }
    
    // 순차적 정수 eventId 생성
    const eventId = EventModel.getNextEventId();
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    eventsSheet.appendRow([
      eventId,
      'user1',
      '홍길동',
      '관악구청',
      37.447,
      126.952,
      arrivalTime,
      '', '', '', '', '', '', '', '',
      'Pending',
      false,
      false,
      now
    ]);
    
    const attendanceSheet = ss.getSheetByName('Attendance');
    if (attendanceSheet) {
      attendanceSheet.appendRow([
        eventId,
        '홍길동',
        '010-1234-5678',
        'No',
        'Pending',
        Utilities.formatDate(arrivalTime, 'Asia/Seoul', 'yyyy-MM-dd'),
        '',
        Utilities.formatDate(arrivalTime, 'Asia/Seoul', 'yyyy-MM-dd'),
        Utilities.formatDate(arrivalTime, 'Asia/Seoul', 'HH:mm'),
        'No'
      ]);
    }
    
    Logger.log('✅ 샘플 이벤트 생성 완료: ' + eventId);
    return { success: true, eventId: eventId };
    
  } catch (error) {
    Logger.log('❌ 샘플 이벤트 생성 에러: ' + error.toString());
    return { success: false, error: error.message };
  }
}