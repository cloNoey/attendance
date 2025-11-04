/**
 * 출석 모델
 * Attendance 시트와 상호작용
 */

const AttendanceModel = {
  /**
   * 출석 레코드 생성
   */
  create: function(eventId, userName, phone, arrivalTime) {
    const sheet = SheetUtils.getSheet(Config.SHEETS.ATTENDANCE);
    
    sheet.appendRow([
      eventId,
      userName,
      phone,
      'No',  // Present
      Config.ATTENDANCE_STATUS.PENDING,
      Utilities.formatDate(arrivalTime, Config.TIMEZONE, 'yyyy-MM-dd'),
      '',  // CheckInTime
      Utilities.formatDate(arrivalTime, Config.TIMEZONE, 'yyyy-MM-dd'),
      Utilities.formatDate(arrivalTime, Config.TIMEZONE, 'HH:mm'),
      'No'  // ArrivingSoon
    ]);
    
    return true;
  },
  
  /**
   * 출석 상태 업데이트
   */
  updateStatus: function(eventId, present, status, checkInTime) {
    const sheet = SheetUtils.getSheet(Config.SHEETS.ATTENDANCE);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === eventId) {
        const rowNum = i + 1;
        
        sheet.getRange(rowNum, 4).setValue(present);
        sheet.getRange(rowNum, 5).setValue(status);
        
        if (checkInTime) {
          sheet.getRange(rowNum, 7).setValue(
            Utilities.formatDate(checkInTime, Config.TIMEZONE, 'HH:mm:ss')
          );
        }
        
        // 배경색 설정
        this._setRowColor(sheet, rowNum, status);
        return true;
      }
    }
    return false;
  },
  
  /**
   * 도착 임박 상태 업데이트
   */
  updateArrivingSoon: function(eventId, arrivingSoon) {
    const sheet = SheetUtils.getSheet(Config.SHEETS.ATTENDANCE);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === eventId) {
        const rowNum = i + 1;
        sheet.getRange(rowNum, 10).setValue(arrivingSoon ? 'Yes' : 'No');
        
        if (arrivingSoon) {
          sheet.getRange(rowNum, 1, 1, 10).setBackground('#fff3cd');
        }
        return true;
      }
    }
    return false;
  },
  
  /**
   * 이벤트별 출석 조회
   */
  getByEventId: function(eventId) {
    const sheet = SheetUtils.getSheet(Config.SHEETS.ATTENDANCE);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === eventId) {
        return this._rowToObject(values[i], i + 1);
      }
    }
    return null;
  },
  
  /**
   * 모든 출석 레코드 조회
   */
  getAll: function() {
    const sheet = SheetUtils.getSheet(Config.SHEETS.ATTENDANCE);
    const values = sheet.getDataRange().getValues();
    const records = [];
    
    for (let i = 1; i < values.length; i++) {
      records.push(this._rowToObject(values[i], i + 1));
    }
    return records;
  },
  
  /**
   * 행 배경색 설정
   */
  _setRowColor: function(sheet, rowNum, status) {
    let bgColor = '#ffffff';
    
    switch(status) {
      case Config.ATTENDANCE_STATUS.PRESENT:
        bgColor = '#d4edda';
        break;
      case Config.ATTENDANCE_STATUS.LATE:
        bgColor = '#fff3cd';
        break;
      case Config.ATTENDANCE_STATUS.ABSENT:
        bgColor = '#f8d7da';
        break;
    }
    
    sheet.getRange(rowNum, 1, 1, 10).setBackground(bgColor);
  },
  
  /**
   * 행 데이터를 객체로 변환
   */
  _rowToObject: function(row, rowNum) {
    return {
      rowNum: rowNum,
      eventId: row[0],
      name: row[1],
      phone: row[2],
      present: row[3],
      status: row[4],
      date: row[5],
      checkInTime: row[6],
      scheduledDate: row[7],
      scheduledTime: row[8],
      arrivingSoon: row[9]
    };
  }
};