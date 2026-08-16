window.addEventListener('DOMContentLoaded',async()=>{if(!Session.hasSession()){location.href='index.html';return}try{await apiCall('validateSession',{},'POST')}catch(e){Session.clear();location.href='index.html';return}if(typeof initCascadingDropdowns==='function')initCascadingDropdowns()});
// --- FULL SRI LANKA LOCATION DATA DICTIONARY ---
    ;

    function initCascadingDropdowns() {
      const provSelect = document.getElementById("i_provinceLoc");
      const distSelect = document.getElementById("i_district");
      const divSecSelect = document.getElementById("i_divSec");
      const postalAreaInput = document.getElementById("i_postalArea");
      const postalAreaList = document.getElementById("postalarea-list");
      const postalCodeInput = document.getElementById("i_postalCode");

      provSelect.addEventListener("change", function() {
        let prov = this.value;
        distSelect.innerHTML = '<option value="">-- SELECT DISTRICT --</option>';
        divSecSelect.innerHTML = '<option value="">-- SELECT DIV SEC --</option>';
        postalAreaInput.value = "";
        postalAreaList.innerHTML = "";
        postalCodeInput.value = "";

        if (prov && slLocationData[prov]) {
          for (let dist in slLocationData[prov]) {
            let opt = document.createElement("option");
            opt.value = dist;
            opt.text = dist;
            distSelect.appendChild(opt);
          }
        }
      });

      distSelect.addEventListener("change", function() {
        let prov = provSelect.value;
        let dist = this.value;
        divSecSelect.innerHTML = '<option value="">-- SELECT DIV SEC --</option>';
        postalAreaInput.value = "";
        postalAreaList.innerHTML = "";
        postalCodeInput.value = "";

        if (prov && dist && slLocationData[prov] && slLocationData[prov][dist]) {
          let data = slLocationData[prov][dist];
          if (data.divs) {
            data.divs.forEach(d => {
              let opt = document.createElement("option");
              opt.value = d;
              opt.text = d;
              divSecSelect.appendChild(opt);
            });
          }
          if (data.postal) {
            for (let area in data.postal) {
              let opt = document.createElement("option");
              opt.value = area;
              postalAreaList.appendChild(opt);
            }
          }
        }
      });

      postalAreaInput.addEventListener("input", function() {
        let prov = provSelect.value;
        let dist = distSelect.value;
        let area = this.value.toUpperCase();

        if (prov && dist && area && slLocationData[prov] && slLocationData[prov][dist] && slLocationData[prov][dist].postal) {
          let code = slLocationData[prov][dist].postal[area];
          if (code) {
            postalCodeInput.value = code;
          }
        }
      });
    }

    document.addEventListener("DOMContentLoaded", function() {
      initCascadingDropdowns();
    });

    function switchTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById('tab-' + tabId).classList.add('active');
      document.getElementById('sec-' + tabId).classList.add('active');
    }

    function generateBoxesHtml(text, boxCount) {
      let html = '';
      text = text ? text.toUpperCase() : '';
      for (let i = 0; i < boxCount; i++) {
        let char = (i < text.length) ? text[i] : '';
        html += `<div class="char-box">${char}</div>`;
      }
      return html;
    }

    function splitText(text, lengths) {
      let parts = [];
      let currentIndex = 0;
      for (let i = 0; i < lengths.length; i++) {
          if (currentIndex >= text.length) {
              parts.push("");
          } else {
              parts.push(text.substring(currentIndex, currentIndex + lengths[i]));
              currentIndex += lengths[i];
          }
      }
      parts.push(text.substring(currentIndex)); 
      return parts;
    }

    function fill3LinesText(baseId, text, lineLength) {
      document.getElementById(baseId + '_line1').innerHTML = generateBoxesHtml(text.substring(0, lineLength), lineLength);
      document.getElementById(baseId + '_line2').innerHTML = generateBoxesHtml(text.substring(lineLength, lineLength * 2), lineLength);
      
      let line3Container = document.getElementById(baseId + '_line3_container');
      let line3Box = document.getElementById(baseId + '_line3');
      
      if (text.length > lineLength * 2) {
        line3Container.style.display = 'flex';
        line3Box.innerHTML = text.substring(lineLength * 2);
      } else {
        line3Container.style.display = 'none';
        line3Box.innerHTML = '';
      }
    }

    function fillDynamicBoxLines(baseId, text, line1Count, line2Count, line3Count) {
      document.getElementById(baseId + '_line1').innerHTML = generateBoxesHtml(text.substring(0, line1Count), line1Count);
      document.getElementById(baseId + '_line2').innerHTML = generateBoxesHtml(text.substring(line1Count, line1Count + line2Count), line2Count);
      
      let totalBoxes = line1Count + line2Count;
      
      if(line3Count > 0) {
        document.getElementById(baseId + '_line3').innerHTML = generateBoxesHtml(text.substring(totalBoxes, totalBoxes + line3Count), line3Count);
        totalBoxes += line3Count;
      }
      
      let overflowContainer = document.getElementById(baseId + '_overflow_container');
      let overflowText = document.getElementById(baseId + '_overflow');
      
      if (overflowContainer && overflowText) {
        if (text.length > totalBoxes) {
          overflowContainer.style.display = 'flex';
          overflowText.innerHTML = text.substring(totalBoxes);
        } else {
          overflowContainer.style.display = 'none';
          overflowText.innerHTML = '';
        }
      }
    }
    
    function saveDataAndPreparePrint() {
      const dDD = document.getElementById('i_dateDD').value;
      const dMM = document.getElementById('i_dateMM').value;
      const dYYYY = document.getElementById('i_dateYYYY').value;
      const vProv = document.getElementById('i_vehProv').value;
      const vLetters = document.getElementById('i_vehLetters').value;
      const vNums = document.getElementById('i_vehNum').value;
      
      const oldName = document.getElementById('i_oldName').value;
      const oldAddress = document.getElementById('i_oldAddress').value;
      const oldId = document.getElementById('i_oldId').value.replace(/\s/g, ''); 
      
      const newName = document.getElementById('i_newName').value;
      const newAddress = document.getElementById('i_newAddress').value;
      const newId = document.getElementById('i_newId').value.replace(/\s/g, ''); 
      
      const postalCode = document.getElementById('i_postalCode').value;
      const mobileNo = document.getElementById('i_mobileNo').value;
      const divSec = document.getElementById('i_divSec').value;
      const district = document.getElementById('i_district').value;
      const provinceLoc = document.getElementById('i_provinceLoc').value;
      const collectOffice = document.getElementById('i_collectOffice').value;
      const financeName = document.getElementById('i_financeName').value;
      const financeAddress = document.getElementById('i_financeAddress').value;

      // PAGE 1: MTA 6 OVERLAY
      document.getElementById('p1_box_dd').innerHTML = generateBoxesHtml(dDD, 2);
      document.getElementById('p1_box_mm').innerHTML = generateBoxesHtml(dMM, 2);
      document.getElementById('p1_box_yyyy').innerHTML = generateBoxesHtml(dYYYY, 4);

      document.getElementById('p1_box_vehProv').innerHTML = generateBoxesHtml(vProv, 2);
      document.getElementById('p1_box_vehLetters').innerHTML = generateBoxesHtml(vLetters, 3);
      document.getElementById('p1_box_vehNums').innerHTML = generateBoxesHtml(vNums, 4);

      fill3LinesText('p1_box_oldName', oldName, 35);
      fill3LinesText('p1_box_oldAddress', oldAddress, 35);
      fill3LinesText('p1_box_newName', newName, 35);
      fill3LinesText('p1_box_newAddress', newAddress, 35);

      document.getElementById('p1_box_oldId').innerHTML = generateBoxesHtml(oldId, 12); 
      document.getElementById('p1_box_newId').innerHTML = generateBoxesHtml(newId, 12); 

      let fullVehNo = vProv;
      if(vLetters) fullVehNo += " " + vLetters;
      if(vNums) fullVehNo += " " + vNums;
      document.getElementById('p1_consent_vehNo').innerText = fullVehNo.trim();

      // PAGE 2: FULL MTA 8 PAGE
      document.getElementById('pf_box_vehProv').innerHTML = generateBoxesHtml(vProv, 2);
      document.getElementById('pf_box_vehLetters').innerHTML = generateBoxesHtml(vLetters, 3);
      document.getElementById('pf_box_vehNums').innerHTML = generateBoxesHtml(vNums, 4);

      fillDynamicBoxLines('pf_box_oldName', oldName, 27, 37, 0);        
      fillDynamicBoxLines('pf_box_newName', newName, 34, 37, 37);      
      fillDynamicBoxLines('pf_box_newAddress', newAddress, 31, 37, 37);

      document.getElementById('pf_box_newId').innerHTML = generateBoxesHtml(newId, 12);
      document.getElementById('pf_box_postal').innerHTML = generateBoxesHtml(postalCode, 5);
      document.getElementById('pf_box_mobile').innerHTML = generateBoxesHtml(mobileNo, 10);
      
      document.getElementById('pf_box_divSec').innerHTML = generateBoxesHtml(divSec, 14);
      document.getElementById('pf_box_district').innerHTML = generateBoxesHtml(district, 14);
      document.getElementById('pf_box_province').innerHTML = generateBoxesHtml(provinceLoc, 15);
      
      document.getElementById('pf_box_dd').innerHTML = generateBoxesHtml(dDD, 2);
      document.getElementById('pf_box_mm').innerHTML = generateBoxesHtml(dMM, 2);
      document.getElementById('pf_box_yyyy').innerHTML = generateBoxesHtml(dYYYY, 4);
      
      document.getElementById('pf_box_collect').innerHTML = generateBoxesHtml(collectOffice, 15);

      // PAGE 3 & 4: MTA 3
      
      // 1. Finance Address & Name
      let fAddrParts = splitText(financeAddress, [80]);
      document.getElementById('p3f_financeAddress1').innerText = fAddrParts[0];
      document.getElementById('p3f_financeAddress2').innerText = fAddrParts[1];
      
      let fNameParts = splitText(financeName, [80]);
      document.getElementById('p3f_financeName1').innerText = fNameParts[0];
      document.getElementById('p3f_financeName2').innerText = fNameParts[1];
      
      // 2. Customer ADDRESS (Swapped - ලිපිනය මුලින් එනවා)
      let cAddrParts = splitText(newAddress, [22, 55]);
      document.getElementById('p3f_newName1').innerText = cAddrParts[0];
      document.getElementById('p3f_newName2').innerText = cAddrParts[1];
      document.getElementById('p3f_newName_overflow').innerText = cAddrParts[2];
      
      // 3. Customer NAME (Swapped - නම දෙවනුව එනවා)
      let cNameParts = splitText(newName, [40, 75]);
      document.getElementById('p3f_newAddress1').innerText = cNameParts[0];
      document.getElementById('p3f_newAddress2').innerText = cNameParts[1];
      document.getElementById('p3f_newAddress_overflow2').innerText = cNameParts[2];

      // Bottom ADDRESS & NAME (Swapped - මෙතනත් ලිපිනය මුලින්, නම දෙවනුව)
      let botAddrParts = splitText(newAddress, [70]);
      document.getElementById('p3f_newName3').innerText = botAddrParts[0];
      document.getElementById('p3f_newName4').innerText = botAddrParts[1];

      let botNameParts = splitText(newName, [90]);
      document.getElementById('p3f_newAddress3').innerText = botNameParts[0];
      document.getElementById('p3f_newAddress4').innerText = botNameParts[1];

      // Page 4 (Back Page)
      
      // 1. Finance Address (Swapped: Address First)
      document.getElementById('p3b_financeAddress1').innerText = financeAddress.substring(0, 55);
      document.getElementById('p3b_financeAddress2').innerText = financeAddress.substring(55, 90);
      document.getElementById('p3b_financeAddress_overflow').innerText = financeAddress.substring(90);
      
      // 2. Finance Name (Swapped: Name Second) - Alignment fixed to start exactly at red line
      document.getElementById('p3b_financeName1').innerText = financeName.substring(0, 32);
      document.getElementById('p3b_financeName_overflow').innerText = financeName.substring(32);
      
      switchTab('print');
    }
