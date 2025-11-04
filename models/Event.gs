/**
 * 이벤트 모델
 * Events 시트와 상호작용
 */

const EventModel = {
  /**
   * 이벤트 생성
   */
  create: function(eventData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);
    const eventId = this.getNextEventId();
    const now = new Date();

    sheet.appendRow([
      eventId,
      eventData.userId,
      eventData.userName,
      eventData.destination,
      eventData.destinationLat,
      eventData.destinationLng,
      eventData.arrivalTime,
      '', '', '', '', '', '', '', '',
      Config.ATTENDANCE_STATUS.PENDING,
      false,
      false,
      now
    ]);

    return eventId;
  },

  /**
   * 다음 eventId 가져오기 (순차적 정수)
   */
  getNextEventId: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);

      if (!sheet) {
        return 1;
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        // 데이터가 없으면 1부터 시작
        return 1;
      }

      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let maxId = 0;

      for (let i = 0; i < values.length; i++) {
        const id = parseInt(values[i][0]);
        if (!isNaN(id) && id > maxId) {
          maxId = id;
        }
      }

      return maxId + 1;
    } catch (error) {
      Logger.log('EventModel.getNextEventId Error: ' + error.toString());
      return 1;
    }
  },
  
  /**
   * 이벤트 조회 by ID
   */
  getById: function(eventId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);
      
      if (!sheet) {
        Logger.log('Events 시트를 찾을 수 없습니다.');
        return null;
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        Logger.log('Events 시트에 데이터가 없습니다.');
        return null;
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 19).getValues();
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === eventId) {
          return this._rowToObject(values[i], i + 2);
        }
      }
      return null;
    } catch (error) {
      Logger.log('EventModel.getById Error: ' + error.toString());
      return null;
    }
  },
  
  /**
   * 사용자별 이벤트 조회
   */
  getByUserId: function(userId) {
    try {
      Logger.log('EventModel.getByUserId - userId: ' + userId);
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);
      
      if (!sheet) {
        Logger.log('❌ Events 시트를 찾을 수 없습니다.');
        return [];
      }
      
      const lastRow = sheet.getLastRow();
      Logger.log('Events 시트 마지막 행: ' + lastRow);
      
      if (lastRow < 2) {
        Logger.log('Events 시트에 데이터가 없습니다.');
        return [];
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 19).getValues();
      Logger.log('읽어온 데이터 행 수: ' + values.length);
      
      const events = [];
      
      for (let i = 0; i < values.length; i++) {
        const rowUserId = values[i][1]; // userId는 두 번째 컬럼 (인덱스 1)
        Logger.log(`행 ${i + 2}: userId = ${rowUserId}`);
        
        if (rowUserId === userId) {
          Logger.log(`✅ 매칭됨: 행 ${i + 2}`);
          const event = this._rowToObject(values[i], i + 2);
          events.push(event);
          Logger.log('이벤트 추가: ' + JSON.stringify(event));
        }
      }
      
      Logger.log(`총 ${events.length}개의 이벤트 반환`);
      return events;
    } catch (error) {
      Logger.log('EventModel.getByUserId Error: ' + error.toString());
      Logger.log('Error stack: ' + error.stack);
      return [];
    }
  },
  
  /**
   * 모든 이벤트 조회
   */
  getAll: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);
      
      if (!sheet) {
        Logger.log('Events 시트를 찾을 수 없습니다.');
        return [];
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return [];
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 19).getValues();
      const events = [];
      
      for (let i = 0; i < values.length; i++) {
        events.push(this._rowToObject(values[i], i + 2));
      }
      
      return events;
    } catch (error) {
      Logger.log('EventModel.getAll Error: ' + error.toString());
      return [];
    }
  },
  
  /**
   * 활성 이벤트 조회
   */
  getActiveEvents: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);
      
      if (!sheet) {
        return [];
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return [];
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 19).getValues();
      const events = [];
      
      for (let i = 0; i < values.length; i++) {
        const status = values[i][15];
        if (status === Config.ATTENDANCE_STATUS.PENDING) {
          events.push(this._rowToObject(values[i], i + 2));
        }
      }
      
      return events;
    } catch (error) {
      Logger.log('EventModel.getActiveEvents Error: ' + error.toString());
      return [];
    }
  },
  
  /**
   * 이벤트 업데이트
   */
  update: function(eventId, updates) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.EVENTS);
      
      if (!sheet) {
        return false;
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return false;
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 19).getValues();
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === eventId) {
          const rowNum = i + 2;
          
          Object.keys(updates).forEach(key => {
            const colNum = this._getColumnNumber(key);
            if (colNum > 0) {
              sheet.getRange(rowNum, colNum).setValue(updates[key]);
            }
          });
          
          return true;
        }
      }
      return false;
    } catch (error) {
      Logger.log('EventModel.update Error: ' + error.toString());
      return false;
    }
  },
  
  /**
   * 행 데이터를 객체로 변환
   */
  _rowToObject: function(row, rowNum) {
    return {
      rowNum: rowNum,
      eventId: row[0],
      userId: row[1],
      userName: row[2],
      destination: row[3],
      destinationLat: row[4],
      destinationLng: row[5],
      arrivalTime: row[6],
      departureLocation: row[7],
      departureLat: row[8],
      departureLng: row[9],
      prepTime: row[10],
      travelTime: row[11],
      expectedDepartureTime: row[12],
      prepStartTime: row[13],
      actualDepartureTime: row[14],
      attendanceStatus: row[15],
      isLocated: row[16],
      arriveSoon: row[17],
      createdAt: row[18]
    };
  },
  
  /**
   * 컬럼 이름을 컬럼 번호로 변환
   */
  _getColumnNumber: function(fieldName) {
    const mapping = {
      eventId: 1, userId: 2, userName: 3, destination: 4,
      destinationLat: 5, destinationLng: 6, arrivalTime: 7,
      departureLocation: 8, departureLat: 9, departureLng: 10,
      prepTime: 11, travelTime: 12, expectedDepartureTime: 13,
      prepStartTime: 14, actualDepartureTime: 15, attendanceStatus: 16,
      isLocated: 17, arriveSoon: 18, createdAt: 19
    };
    return mapping[fieldName] || 0;
  }
};