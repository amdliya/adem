// Fungsi utama untuk handle web requests (doGet/doPost)
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// Handler utama
function handleRequest(e) {
  var params = e.parameter;
  var action = params.action;
  var token = params.token; // Untuk autentikasi (nanti dari client)

  // Cek autentikasi (kecuali untuk login)
  if (action !== 'login' && !validateToken(token)) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Unauthorized'})).setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var response;

  try {
    switch (action) {
      case 'login':
        response = login(params.username, params.password);
        break;
      case 'getAllData':
        response = getAllData();
        break;
      case 'saveData':
        var data = JSON.parse(e.postData.contents); // Data dari client
        saveAllData(data);
        response = {status: 'success'};
        break;
      // Tambah case lain jika perlu CRUD spesifik, tapi untuk sederhana kita pakai bulk save/get
      default:
        response = {status: 'error', message: 'Invalid action'};
    }
  } catch (err) {
    response = {status: 'error', message: err.message};
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// Fungsi autentikasi sederhana (gunakan token JWT-like sederhana)
var AUTH_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Auth');
function login(username, password) {
  var data = AUTH_SHEET.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      var token = Utilities.base64Encode(username + ':' + new Date().getTime()); // Token sederhana (expired setelah reload, bisa diimprove)
      return {status: 'success', token: token};
    }
  }
  return {status: 'error', message: 'Invalid credentials'};
}

function validateToken(token) {
  if (!token) return false;
  // Decode dan validasi (sederhana: cek jika base64 valid)
  try {
    Utilities.base64Decode(token);
    return true; // Improve: tambah expiry
  } catch {
    return false;
  }
}

// Ambil semua data dari sheets
function getAllData() {
  return {
    classes: getSheetData('Classes'),
    students: getSheetData('Students'),
    attendance: getSheetData('Attendance'),
    attendanceHistory: getSheetData('AttendanceHistory'),
    journal: getSheetData('Journal'),
    assessments: getSheetData('Assessments'),
    grades: getSheetData('Grades'),
    settings: getSettings()
  };
}

// Simpan semua data ke sheets (bulk)
function saveAllData(data) {
  saveSheetData('Classes', data.classes, ['id', 'name', 'description', 'studentCount']);
  saveSheetData('Students', data.students, ['id', 'name', 'nis', 'class', 'gender']);
  saveSheetData('Attendance', data.attendance, ['id', 'studentId', 'studentName', 'class', 'date', 'status']);
  saveSheetData('AttendanceHistory', data.attendanceHistory, ['id', 'class', 'date', 'totalStudents', 'attendedStudents', 'stats', 'inputTime', 'isEdit']);
  saveSheetData('Journal', data.journal, ['id', 'class', 'date', 'subject', 'material', 'notes']);
  saveSheetData('Assessments', data.assessments, ['id', 'class', 'type', 'name']);
  saveSheetData('Grades', data.grades, ['id', 'assessmentId', 'studentId', 'studentName', 'score', 'inputDate']);
  saveSettings(data.settings);
}

// Helper: Ambil data dari sheet
function getSheetData(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    result.push(row);
  }
  return result;
}

// Helper: Simpan data ke sheet
function saveSheetData(sheetName, dataArray, headers) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.clear(); // Hapus data lama (bisa optimize jika perlu append)
  sheet.appendRow(headers);
  dataArray.forEach(function(item) {
    var row = headers.map(function(header) {
      return item[header] || '';
    });
    sheet.appendRow(row);
  });
}

// Settings (JSON di sheet Settings)
function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    settings[data[i][0]] = JSON.parse(data[i][1] || '{}');
  }
  return settings;
}

function saveSettings(settings) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  sheet.clear();
  sheet.appendRow(['key', 'value']);
  Object.keys(settings).forEach(function(key) {
    sheet.appendRow([key, JSON.stringify(settings[key])]);
  });
}