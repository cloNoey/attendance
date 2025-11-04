/**
 * TMap API 서비스
 */

const TMapAPI = {
  /**
   * 대중교통 경로 조회
   */
  getTransitRoute: function(startX, startY, endX, endY) {
    Logger.log('=== TMap 대중교통 경로 조회 ===');
    Logger.log(`출발 좌표: (${startY}, ${startX})`);
    Logger.log(`도착 좌표: (${endY}, ${endX})`);
    Logger.log(`API Key: ${Config.TMAP_API_KEY ? '설정됨' : '설정 안됨'}`);
    
    if (!Config.TMAP_API_KEY || Config.TMAP_API_KEY === 'YOUR_TMAP_APP_KEY_HERE') {
      Logger.log('❌ TMap API 키가 설정되지 않았습니다');
      return null;
    }
    
    try {
      const url = 'https://apis.openapi.sk.com/transit/routes';
      
      const payload = {
        startX: String(startX),
        startY: String(startY),
        endX: String(endX),
        endY: String(endY),
        format: 'json',
        count: 1
      };
      
      Logger.log('요청 URL: ' + url);
      Logger.log('요청 Payload: ' + JSON.stringify(payload));
      
      const options = {
        method: 'post',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'appKey': Config.TMAP_API_KEY
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      Logger.log('API 호출 중...');
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      Logger.log('응답 코드: ' + statusCode);
      Logger.log('응답 내용: ' + responseText.substring(0, 500));
      
      if (statusCode !== 200) {
        Logger.log('❌ API 오류 응답: ' + responseText);
        
        // 에러 메시지 파싱
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            Logger.log('에러 상세: ' + JSON.stringify(errorData.error));
          }
        } catch (e) {
          Logger.log('에러 파싱 실패');
        }
        
        return null;
      }
      
      const data = JSON.parse(responseText);
      Logger.log('파싱 성공');
      
      if (!data.metaData || !data.metaData.plan) {
        Logger.log('❌ 경로 데이터 없음');
        Logger.log('응답 구조: ' + JSON.stringify(Object.keys(data)));
        return null;
      }
      
      Logger.log('✅ 경로 찾음');
      const itinerary = data.metaData.plan.itineraries[0];
      
      return this.parseTransitRoute(itinerary);
      
    } catch (error) {
      Logger.log('❌ TMap API Error: ' + error.toString());
      Logger.log('Error stack: ' + error.stack);
      return null;
    }
  },
  
  /**
   * 대중교통 경로 파싱
   */
  parseTransitRoute: function(itinerary) {
    try {
      const totalTime = Math.ceil(itinerary.totalTime / 60);
      const totalDistance = (itinerary.totalDistance / 1000).toFixed(1);
      const totalFare = itinerary.fare ? itinerary.fare.regular.totalFare : 0;
      
      const steps = [];
      
      if (itinerary.legs && Array.isArray(itinerary.legs)) {
        itinerary.legs.forEach((leg, index) => {
          const mode = leg.mode;
          const duration = Math.ceil(leg.sectionTime / 60);
          
          if (mode === 'WALK') {
            const distance = Math.round(leg.distance);
            steps.push({
              icon: '🚶',
              color: '#4facfe',
              title: index === 0 ? '출발지에서 도보' : (index === itinerary.legs.length - 1 ? '도착지까지 도보' : '환승 도보'),
              description: `${distance}m 도보 이동`,
              duration: duration
            });
            
          } else if (mode === 'BUS') {
            const busNo = leg.route || '버스';
            const startName = leg.start ? leg.start.name : '승차';
            const endName = leg.end ? leg.end.name : '하차';
            const stationCount = leg.passStopList && leg.passStopList.stations ? leg.passStopList.stations.length : 0;
            
            steps.push({
              icon: '🚌',
              color: leg.routeColor || '#28a745',
              title: `${busNo}번 버스 탑승`,
              description: `${startName} → ${endName}${stationCount > 0 ? ` (${stationCount}개 정류장)` : ''}`,
              duration: duration
            });
            
          } else if (mode === 'SUBWAY') {
            const lineName = leg.route || '지하철';
            const startName = leg.start ? leg.start.name : '승차역';
            const endName = leg.end ? leg.end.name : '하차역';
            const stationCount = leg.passStopList && leg.passStopList.stations ? leg.passStopList.stations.length : 0;
            
            steps.push({
              icon: '🚇',
              color: leg.routeColor || '#667eea',
              title: `${lineName} 탑승`,
              description: `${startName} → ${endName}${stationCount > 0 ? ` (${stationCount}개 정거장)` : ''}`,
              duration: duration
            });
          }
        });
      }
      
      return {
        duration: totalTime,
        distance: totalDistance,
        fare: totalFare,
        steps: steps,
        summary: {
          totalWalkDistance: itinerary.totalWalkDistance || 0,
          totalWalkTime: Math.ceil((itinerary.totalWalkTime || 0) / 60)
        }
      };
    } catch (error) {
      Logger.log('경로 파싱 에러: ' + error.toString());
      return null;
    }
  },
  
  /**
   * 자동차 경로 조회
   */
  getDrivingRoute: function(startX, startY, endX, endY) {
    Logger.log('=== TMap 자동차 경로 조회 ===');
    
    if (!Config.TMAP_API_KEY || Config.TMAP_API_KEY === 'YOUR_TMAP_APP_KEY_HERE') {
      Logger.log('❌ TMap API 키가 설정되지 않았습니다');
      return null;
    }
    
    try {
      const url = 'https://apis.openapi.sk.com/tmap/routes?version=1&format=json';
      
      const payload = {
        startX: String(startX),
        startY: String(startY),
        endX: String(endX),
        endY: String(endY),
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        searchOption: '0'
      };
      
      Logger.log('자동차 경로 요청: ' + JSON.stringify(payload));
      
      const options = {
        method: 'post',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'appKey': Config.TMAP_API_KEY
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      Logger.log('자동차 경로 응답 코드: ' + statusCode);
      
      if (statusCode !== 200) {
        Logger.log('자동차 경로 에러: ' + response.getContentText());
        return null;
      }
      
      const data = JSON.parse(response.getContentText());
      
      if (!data.features || data.features.length === 0) {
        Logger.log('자동차 경로 데이터 없음');
        return null;
      }
      
      const summary = data.features.find(f => f.properties && f.properties.totalDistance);
      
      if (!summary || !summary.properties) {
        Logger.log('자동차 경로 요약 정보 없음');
        return null;
      }
      
      const props = summary.properties;
      
      Logger.log('✅ 자동차 경로 찾음');
      
      return {
        duration: Math.ceil(props.totalTime / 60),
        distance: (props.totalDistance / 1000).toFixed(1),
        taxiFare: props.taxiFare || this.estimateTaxiFare(props.totalDistance, props.totalTime),
        tollFare: props.totalFare || 0
      };
      
    } catch (error) {
      Logger.log('❌ 자동차 경로 API Error: ' + error.toString());
      return null;
    }
  },
  
  /**
   * 도보 경로 조회
   */
  getPedestrianRoute: function(startX, startY, endX, endY) {
    Logger.log('=== TMap 보행자 경로 조회 ===');
    
    if (!Config.TMAP_API_KEY || Config.TMAP_API_KEY === 'YOUR_TMAP_APP_KEY_HERE') {
      Logger.log('❌ TMap API 키가 설정되지 않았습니다');
      return null;
    }
    
    try {
      const url = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json';
      
      const payload = {
        startX: String(startX),
        startY: String(startY),
        endX: String(endX),
        endY: String(endY),
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        startName: '출발지',
        endName: '도착지'
      };
      
      Logger.log('보행자 경로 요청: ' + JSON.stringify(payload));
      
      const options = {
        method: 'post',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'appKey': Config.TMAP_API_KEY
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      Logger.log('보행자 경로 응답 코드: ' + statusCode);
      
      if (statusCode !== 200) {
        Logger.log('보행자 경로 에러: ' + response.getContentText());
        return null;
      }
      
      const data = JSON.parse(response.getContentText());
      
      if (!data.features || data.features.length === 0) {
        Logger.log('보행자 경로 데이터 없음');
        return null;
      }
      
      const summary = data.features.find(f => f.properties && f.properties.totalDistance);
      
      if (!summary || !summary.properties) {
        Logger.log('보행자 경로 요약 정보 없음');
        return null;
      }
      
      const props = summary.properties;
      const distance = props.totalDistance / 1000;
      
      Logger.log('✅ 보행자 경로 찾음');
      
      return {
        duration: Math.ceil(props.totalTime / 60),
        distance: distance.toFixed(1),
        calories: Math.ceil(distance * 50)
      };
      
    } catch (error) {
      Logger.log('❌ 보행자 경로 API Error: ' + error.toString());
      return null;
    }
  },
  
  /**
   * 택시 요금 추정
   */
  estimateTaxiFare: function(distance, time) {
    let fare = 4800;
    
    if (distance > 2000) {
      fare += Math.ceil((distance - 2000) / 132) * 100;
    }
    
    const timeMin = Math.ceil(time / 60);
    fare += Math.ceil(timeMin / 2) * 100;
    
    return Math.ceil(fare / 100) * 100;
  },
  
  /**
   * API 키 테스트
   */
  testApiKey: function() {
    Logger.log('=== TMap API 키 테스트 ===');
    Logger.log('현재 시간: ' + new Date());
    
    if (!Config.TMAP_API_KEY || Config.TMAP_API_KEY === 'YOUR_TMAP_APP_KEY_HERE') {
      Logger.log('❌ API 키가 설정되지 않았습니다');
      Logger.log('Config.gs에서 TMAP_API_KEY를 설정하세요');
      return {
        success: false,
        error: 'API 키가 설정되지 않았습니다'
      };
    }
    
    Logger.log('API 키 확인됨 (앞 10자): ' + Config.TMAP_API_KEY.substring(0, 10) + '...');
    
    try {
      // 서울시청 -> 강남역 테스트
      Logger.log('\n--- 대중교통 경로 테스트 ---');
      const transit = this.getTransitRoute(
        126.9784147, // 서울시청 경도
        37.5666805,  // 서울시청 위도
        127.0276194, // 강남역 경도
        37.4979517   // 강남역 위도
      );
      
      if (transit) {
        Logger.log('✅ 대중교통 경로 성공');
        Logger.log('소요시간: ' + transit.duration + '분');
        Logger.log('거리: ' + transit.distance + 'km');
        Logger.log('요금: ' + transit.fare + '원');
        Logger.log('단계 수: ' + transit.steps.length);
      } else {
        Logger.log('❌ 대중교통 경로 실패');
      }
      
      Logger.log('\n--- 자동차 경로 테스트 ---');
      const drive = this.getDrivingRoute(
        126.9784147,
        37.5666805,
        127.0276194,
        37.4979517
      );
      
      if (drive) {
        Logger.log('✅ 자동차 경로 성공');
        Logger.log('소요시간: ' + drive.duration + '분');
        Logger.log('거리: ' + drive.distance + 'km');
      } else {
        Logger.log('❌ 자동차 경로 실패');
      }
      
      Logger.log('\n--- 보행자 경로 테스트 ---');
      const walk = this.getPedestrianRoute(
        126.9784147,
        37.5666805,
        127.0276194,
        37.4979517
      );
      
      if (walk) {
        Logger.log('✅ 보행자 경로 성공');
        Logger.log('소요시간: ' + walk.duration + '분');
        Logger.log('거리: ' + walk.distance + 'km');
      } else {
        Logger.log('❌ 보행자 경로 실패');
      }
      
      Logger.log('\n=== 테스트 완료 ===');
      
      if (transit || drive || walk) {
        return {
          success: true,
          transit: transit,
          drive: drive,
          walk: walk
        };
      } else {
        return {
          success: false,
          error: '모든 API 호출이 실패했습니다'
        };
      }
      
    } catch (error) {
      Logger.log('❌ API 테스트 실패: ' + error.toString());
      Logger.log('Stack: ' + error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * API 키 테스트 함수 (직접 실행용)
 */
function testTMapAPI() {
  return TMapAPI.testApiKey();
}

/**
 * 간단한 연결 테스트
 */
function quickTestTMap() {
  Logger.log('=== 빠른 TMap 연결 테스트 ===');
  
  const apiKey = Config.TMAP_API_KEY;
  Logger.log('API Key 설정: ' + (apiKey && apiKey !== 'YOUR_TMAP_APP_KEY_HERE' ? 'Yes' : 'No'));
  
  if (!apiKey || apiKey === 'YOUR_TMAP_APP_KEY_HERE') {
    Logger.log('❌ API 키를 먼저 설정하세요!');
    return;
  }
  
  try {
    const url = 'https://apis.openapi.sk.com/transit/routes';
    const payload = {
      startX: '126.9784147',
      startY: '37.5666805',
      endX: '127.0276194',
      endY: '37.4979517',
      format: 'json',
      count: 1
    };
    
    const options = {
      method: 'post',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'appKey': apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log('API 호출 중...');
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    Logger.log('응답 코드: ' + code);
    
    if (code === 200) {
      Logger.log('✅ API 연결 성공!');
      const data = JSON.parse(response.getContentText());
      Logger.log('응답 데이터 키: ' + Object.keys(data).join(', '));
    } else {
      Logger.log('❌ API 연결 실패');
      Logger.log('응답: ' + response.getContentText());
    }
    
  } catch (error) {
    Logger.log('❌ 에러: ' + error.toString());
  }
}