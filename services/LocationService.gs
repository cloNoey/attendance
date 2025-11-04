/**
 * 위치 서비스
 * 사용자 위치 추적 및 이벤트 상태 업데이트
 */

const LocationService = {
  /**
   * 사용자 위치 업데이트
   */
  updateLocation: function(data) {
    try {
      // 사용자 위치 저장
      UserModel.updateLocation(data.userId, data.lat, data.lng);
      
      // 해당 사용자의 이벤트 상태 체크
      this.checkEventStatus(data.userId, data.lat, data.lng);
      
      return { success: true };
    } catch (error) {
      Logger.log('LocationService.updateLocation Error: ' + error.toString());
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * 이벤트 상태 체크
   */
  checkEventStatus: function(userId, currentLat, currentLng) {
    const events = EventModel.getByUserId(userId);
    const now = new Date();
    
    events.forEach(event => {
      if (event.attendanceStatus === Config.ATTENDANCE_STATUS.PENDING) {
        this._checkSingleEvent(event, currentLat, currentLng, now);
      }
    });
  },
  
  /**
   * 단일 이벤트 체크
   */
  _checkSingleEvent: function(event, currentLat, currentLng, now) {
    // 1. 출발 10분 전 위치 체크
    this._checkDepartureLocation(event, currentLat, currentLng, now);
    
    // 2. 출발 체크 (출발지에서 5m 벗어남)
    this._checkDeparture(event, currentLat, currentLng);
    
    // 3. 도착 임박 체크 (50m 이내)
    this._checkArrivingSoon(event, currentLat, currentLng);
    
    // 4. 출석 체크 (10m 이내)
    this._checkAttendance(event, currentLat, currentLng, now);
    
    // 5. 시간 기반 출석 상태 업데이트
    this._updateAttendanceByTime(event, now);
  },
  
  /**
   * 출발지 위치 체크
   */
  _checkDepartureLocation: function(event, currentLat, currentLng, now) {
    if (!event.expectedDepartureTime) return;
    
    const expectedDepartureTime = new Date(event.expectedDepartureTime);
    const tenMinBefore = new Date(expectedDepartureTime.getTime() - 10 * 60000);
    
    if (now >= tenMinBefore && now < expectedDepartureTime) {
      const distance = GeoUtils.calculateDistance(
        currentLat, currentLng,
        event.departureLat, event.departureLng
      );
      
      if (distance > Config.DISTANCE.DEPARTURE_CHECK) {
        // 출발지를 현위치로 수정
        const newTravelTime = TMapAPI.getTransitRoute(
          currentLng, currentLat,
          event.destinationLng, event.destinationLat
        );
        
        EventModel.update(event.eventId, {
          departureLocation: '현재 위치',
          departureLat: currentLat,
          departureLng: currentLng,
          travelTime: newTravelTime
        });
      } else {
        EventModel.update(event.eventId, { isLocated: true });
      }
    }
  },
  
  /**
   * 출발 체크
   */
  _checkDeparture: function(event, currentLat, currentLng) {
    if (event.isLocated && !event.actualDepartureTime) {
      const distance = GeoUtils.calculateDistance(
        currentLat, currentLng,
        event.departureLat, event.departureLng
      );
      
      if (distance > Config.DISTANCE.DEPARTURE_CHECK) {
        EventModel.update(event.eventId, {
          actualDepartureTime: new Date()
        });
      }
    }
  },
  
  /**
   * 도착 임박 체크
   */
  _checkArrivingSoon: function(event, currentLat, currentLng) {
    if (event.arriveSoon) return;
    
    const distance = GeoUtils.calculateDistance(
      currentLat, currentLng,
      event.destinationLat, event.destinationLng
    );
    
    if (distance <= Config.DISTANCE.ARRIVAL_SOON) {
      EventModel.update(event.eventId, { arriveSoon: true });
      AttendanceModel.updateArrivingSoon(event.eventId, true);
    }
  },
  
  /**
   * 출석 체크
   */
  _checkAttendance: function(event, currentLat, currentLng, now) {
    const distance = GeoUtils.calculateDistance(
      currentLat, currentLng,
      event.destinationLat, event.destinationLng
    );

    if (distance <= Config.DISTANCE.ARRIVAL_CHECK) {
      const arrivalTime = new Date(event.arrivalTime);
      const timeDiff = (now - arrivalTime) / 60000; // 분 단위

      let newStatus = '';
      let present = 'No';

      if (timeDiff < 0) {
        // 도착시각 이전
        newStatus = Config.ATTENDANCE_STATUS.PRESENT;
        present = 'Yes';
      } else if (timeDiff <= Config.TIME.LATE_THRESHOLD) {
        // 도착시각 ~ +10분
        newStatus = Config.ATTENDANCE_STATUS.PRESENT;
        present = 'Yes';
      } else if (timeDiff <= Config.TIME.ABSENT_THRESHOLD) {
        // 도착시각+10분 ~ +30분
        newStatus = Config.ATTENDANCE_STATUS.LATE;
        present = 'Yes';
      }

      if (newStatus && newStatus !== event.attendanceStatus) {
        EventModel.update(event.eventId, { attendanceStatus: newStatus });
        AttendanceModel.updateStatus(event.eventId, present, newStatus, now);

        // Notifications 시트에 기록
        const notifId = NotificationModel.create(
          event.eventId,
          event.userId,
          Config.NOTIFICATION_TYPE.ATTENDANCE_CHANGED,
          `출석 상태가 ${newStatus}로 변경되었습니다.`,
          now
        );
        NotificationModel.updateStatus(notifId, 'Sent', now);
      }
    }
  },
  
  /**
   * 시간 기반 출석 상태 업데이트
   */
  _updateAttendanceByTime: function(event, now) {
    const arrivalTime = new Date(event.arrivalTime);

    // 도착시각에 상태가 Pending이면 Absent로 변경
    if (now >= arrivalTime && event.attendanceStatus === Config.ATTENDANCE_STATUS.PENDING) {
      EventModel.update(event.eventId, { attendanceStatus: Config.ATTENDANCE_STATUS.ABSENT });
      AttendanceModel.updateStatus(event.eventId, 'No', Config.ATTENDANCE_STATUS.ABSENT, null);

      // Notifications 시트에 기록
      const notifId = NotificationModel.create(
        event.eventId,
        event.userId,
        Config.NOTIFICATION_TYPE.ATTENDANCE_CHANGED,
        `출석 상태가 ${Config.ATTENDANCE_STATUS.ABSENT}로 변경되었습니다.`,
        now
      );
      NotificationModel.updateStatus(notifId, 'Sent', now);
    }

    // 도착시각+10분에 맞춤 메시지 발송
    const tenMinAfter = new Date(arrivalTime.getTime() + 10 * 60000);
    if (now >= tenMinAfter && !event.arriveSoon) {
      NotificationService.sendCustomMessage(event.eventId, event.userId, event.attendanceStatus);
    }
  },
  
  /**
   * 모든 활성 이벤트 체크
   */
  checkAllActiveEvents: function() {
    const events = EventModel.getActiveEvents();
    
    events.forEach(event => {
      const user = UserModel.getById(event.userId);
      if (user && user.currentLat && user.currentLng) {
        this._checkSingleEvent(event, user.currentLat, user.currentLng, new Date());
      }
    });
  }
};