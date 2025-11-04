/**
 * 이벤트 서비스
 * 이벤트 관련 비즈니스 로직
 */

const EventService = {
  /**
   * 이벤트 생성
   */
  create: function(data) {
    try {
      // 이벤트 생성
      const eventId = EventModel.create(data);
      
      // 출석 레코드 생성
      const phone = UserModel.getPhone(data.userId);
      AttendanceModel.create(eventId, data.userName, phone, new Date(data.arrivalTime));
      
      return {
        success: true,
        eventId: eventId
      };
    } catch (error) {
      Logger.log('EventService.create Error: ' + error.toString());
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * 이벤트 상세 업데이트 (출발지, 준비시간 등)
   */
  updateDetails: function(data) {
    try {
      const event = EventModel.getById(data.eventId);
      if (!event) {
        throw new Error('이벤트를 찾을 수 없습니다.');
      }
      
      // 이동시간 계산
      const travelTime = TMapAPI.getTransitRoute(data.departureLng, data.departureLat, event.destinationLng, event.departureLat).duration;
      
      // 시간 계산: 도착시각에서 (이동시간 + 10분 버퍼)를 빼서 출발 예정 시각 계산
      const arrivalTime = new Date(event.arrivalTime);
      const expectedDepartureTime = new Date(arrivalTime.getTime() - (travelTime + Config.TIME.BUFFER_TIME) * 60000);
      // 출발 예정 시각에서 준비시간을 빼서 준비시작시각 계산
      const prepStartTime = new Date(expectedDepartureTime.getTime() - data.prepTime * 60000);
      
      // 이벤트 업데이트
      EventModel.update(data.eventId, {
        departureLocation: data.departureLocation,
        departureLat: data.departureLat,
        departureLng: data.departureLng,
        prepTime: data.prepTime,
        travelTime: travelTime,
        expectedDepartureTime: expectedDepartureTime,
        prepStartTime: prepStartTime
      });
      
      // 알림 스케줄 설정
      NotificationService.scheduleNotifications(
        data.eventId,
        event.userId,
        prepStartTime,
        expectedDepartureTime,
        arrivalTime
      );
      
      return {
        success: true,
        travelTime: travelTime,
        expectedDepartureTime: expectedDepartureTime,
        prepStartTime: prepStartTime
      };
    } catch (error) {
      Logger.log('EventService.updateDetails Error: ' + error.toString());
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * 사용자별 이벤트 조회
   */
  getByUserId: function(userId) {
    return EventModel.getByUserId(userId);
  },
  
  /**
   * 모든 이벤트 조회
   */
  getAll: function() {
    return EventModel.getAll();
  }
};