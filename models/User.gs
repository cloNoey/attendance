/**
 * 사용자 모델
 * Users 시트와 상호작용
 */

const UserModel = {
  /**
   * 사용자 조회 by ID
   */
  getById: function(userId) {
    try {
      Logger.log('UserModel.getById - userId: ' + userId);
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.USERS);
      
      if (!sheet) {
        Logger.log('❌ Users 시트를 찾을 수 없습니다.');
        return null;
      }
      
      const lastRow = sheet.getLastRow();
      Logger.log('Users 시트 마지막 행: ' + lastRow);
      
      if (lastRow < 2) {
        Logger.log('Users 시트에 데이터가 없습니다.');
        return null;
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      
      for (let i = 0; i < values.length; i++) {
        const rowUserId = values[i][0];
        Logger.log(`행 ${i + 2}: userId = ${rowUserId}`);
        
        if (rowUserId === userId) {
          Logger.log(`✅ 사용자 찾음: 행 ${i + 2}`);
          return this._rowToObject(values[i], i + 2);
        }
      }
      
      Logger.log('❌ 사용자를 찾을 수 없음: ' + userId);
      return null;
    } catch (error) {
      Logger.log('UserModel.getById Error: ' + error.toString());
      return null;
    }
  },
  
  /**
   * 모든 사용자 조회
   */
  getAll: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.USERS);
      
      if (!sheet) {
        return [];
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return [];
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      const users = [];
      
      for (let i = 0; i < values.length; i++) {
        users.push(this._rowToObject(values[i], i + 2));
      }
      
      return users;
    } catch (error) {
      Logger.log('UserModel.getAll Error: ' + error.toString());
      return [];
    }
  },
  
  /**
   * 사용자 위치 업데이트
   */
  updateLocation: function(userId, lat, lng) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(Config.SHEETS.USERS);
      
      if (!sheet) {
        return false;
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return false;
      }
      
      const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === userId) {
          const rowNum = i + 2;
          sheet.getRange(rowNum, 5).setValue(lat);
          sheet.getRange(rowNum, 6).setValue(lng);
          sheet.getRange(rowNum, 7).setValue(new Date());
          return true;
        }
      }
      return false;
    } catch (error) {
      Logger.log('UserModel.updateLocation Error: ' + error.toString());
      return false;
    }
  },
  
  /**
   * 사용자 전화번호 조회
   */
  getPhone: function(userId) {
    const user = this.getById(userId);
    return user ? user.phone : '';
  },
  
  /**
   * 행 데이터를 객체로 변환
   */
  _rowToObject: function(row, rowNum) {
    return {
      rowNum: rowNum,
      userId: row[0],
      userName: row[1],
      email: row[2],
      phone: row[3],
      currentLat: row[4],
      currentLng: row[5],
      lastUpdate: row[6]
    };
  }
};