const AdmZip = require('adm-zip');
const fs = require('fs');
try {
  const zip = new AdmZip('c:/Users/HP/Downloads/biocart (3).zip');
  const zipEntries = zip.getEntries();
  zipEntries.forEach(function(zipEntry) {
    if (zipEntry.entryName.includes('restore') || zipEntry.entryName.includes('Admin')) {
      console.log(zipEntry.entryName);
    }
  });
} catch(e) {
  console.log('adm-zip not installed or error');
}
