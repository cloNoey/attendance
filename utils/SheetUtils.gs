/**
 * 시트 조작 유틸리티
 */

const SheetUtils = {
  /**
   * 스프레드시트 가져오기
   */
  getSpreadsheet: function() {
    return SpreadsheetApp.getActiveSpreadsheet();
  },
  
  /**
   * 시트 가져오기
   */
  getSheet: function(sheetName) {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
    }
    
    return sheet;
  },
  
  /**
   * 시트 생성
   */
  createSheetIfNotExists: function(sheetName, headers) {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`시트 생성 중: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
      
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        this.formatHeaders(sheet, headers.length);
        Logger.log(`시트 생성 완료: ${sheetName} (${headers.length}개 컬럼)`);
      }
    } else {
      Logger.log(`시트가 이미 존재함: ${sheetName}`);
    }
    
    return sheet;
  },
  
  /**
   * 헤더 서식 지정
   */
  formatHeaders: function(sheet, numColumns) {
    sheet.getRange(1, 1, 1, numColumns)
      .setBackground('#4a86e8')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  },
  
  /**
   * 마지막 행 번호
   */
  getLastRow: function(sheetName) {
    const sheet = this.getSheet(sheetName);
    return sheet.getLastRow();
  },
  
  /**
   * 데이터 범위 가져오기
   */
  getDataRange: function(sheetName) {
    const sheet = this.getSheet(sheetName);
    return sheet.getDataRange().getValues();
  },
  
  /**
   * 특정 행 삭제
   */
  deleteRow: function(sheetName, rowNum) {
    const sheet = this.getSheet(sheetName);
    sheet.deleteRow(rowNum);
  },
  
  /**
   * 시트 초기화
   */
  clearSheet: function(sheetName, keepHeaders) {
    const sheet = this.getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    
    if (keepHeaders && lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    } else if (!keepHeaders && lastRow > 0) {
      sheet.clear();
    }
  }
};