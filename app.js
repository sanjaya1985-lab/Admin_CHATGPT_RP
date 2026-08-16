'use strict';
// currentUser/session/API are provided by core modules.
 var rmvMap = null; var mapMarkers = []; var allVehicleData = [];
    var globalRmvData = []; var currentRmvIndex = -1;
    var vehicleDB = []; var tempUserData = null;
    
    var globalDashValData = []; 
    var globalHistoryValData = [];
    var systemUsersData = []; 
    var globalBranchesFull = []; 

    function getImgUrl(url) {
       if (!url || url === 'No Image') return '';
       var m = url.match(/[-\w]{25,}/);
       return m ? `https://lh3.googleusercontent.com/d/${m[0]}` : url;
    }

    // ====== LOGIN FUNCTIONS ======
    async function doLogin() {
      const u = document.getElementById('username').value.trim();
      const p = document.getElementById('password').value;
      if(!u || !p) return Swal.fire("Required", "Please enter both username and password!", "warning");
      const btn = document.getElementById('loginBtn'); UI.busy(btn, 'Authenticating...');
      try {
        const res = await apiCall('checkLogin', { username:u, password:p }, 'POST', {skipAuth:true});
        if(res.status === 'success') {
          Session.set(res); tempUserData=res;
          if(res.isNew === 'Yes') { document.getElementById('loginBox').style.display='none'; document.getElementById('changePassBox').style.display='block'; }
          else proceedToDashboard(res);
        } else throw new Error(res.msg || 'Access denied');
      } catch(e) { Swal.fire('Access Denied', e.message, 'error'); UI.ready(btn,'Sign In'); }
    }

    async function saveNewPassword() {
      const p1=document.getElementById('newPass1').value, p2=document.getElementById('newPass2').value;
      if(!p1 || !p2) return Swal.fire('Required','Please fill both password fields!','warning');
      if(p1!==p2) return Swal.fire('Mismatch','Passwords do not match!','error');
      if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(p1)) return Swal.fire('Weak Password','Use at least 10 characters with upper/lowercase letters and a number.','warning');
      const btn=document.getElementById('changePassBtn'); UI.busy(btn,'Updating...');
      try {
        const res=await apiCall('updateFirstPassword',{username:tempUserData.username,newPass:p1});
        if(!(res.success || res.data==='success')) throw new Error(res.error||res.msg||'Update failed');
        if(res.authToken) tempUserData.authToken=res.authToken;
        tempUserData.isNew='No'; Session.set(tempUserData);
        Swal.fire({title:'Success!',text:'Password Updated. Redirecting...',icon:'success',timer:1200,showConfirmButton:false});
        setTimeout(()=>proceedToDashboard(tempUserData),1200);
      } catch(e) { Swal.fire('Error',e.message,'error'); UI.ready(btn,'Update & Login'); }
    }

    function proceedToDashboard(userData) {
      Session.set(userData); currentUser=Session.user();
      document.getElementById('login-container').style.display='none';
      document.getElementById('app-container').style.display='flex';
      setupDashboardPostLogin(currentUser);
    }
    
    window.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') { 
        if(document.getElementById('loginBox') && document.getElementById('loginBox').style.display !== 'none') doLogin(); 
        else if (document.getElementById('changePassBox') && document.getElementById('changePassBox').style.display !== 'none') saveNewPassword();
      }
    });

    // ====== APP SETUP ======

    function populateUserDatalists(filterCompany) {
      var resetList = document.getElementById('reset-uname'); 
      var permList = document.getElementById('perm-user-list');
      if(resetList) resetList.innerHTML = '';
      if(permList) permList.innerHTML = '';
      
      systemUsersData.forEach(u => {
          if (filterCompany === 'ALL' || u.company.toLowerCase().trim() === filterCompany.toLowerCase().trim()) {
              if(resetList) resetList.appendChild(new Option(u.username, u.username));
              if(permList) permList.appendChild(new Option(u.username, u.username));
          }
      });
    }

    function filterUsersByCompany() {
      var selectedComp = document.getElementById('perm-company-filter').value;
      populateUserDatalists(selectedComp);
      document.getElementById('perm-user-search').value = ""; 
      document.getElementById('perm-details-section').style.display = 'none';
    }

    function filterBranchDropdown(companyName, dropdownId) {
        var select = document.getElementById(dropdownId);
        if(!select) return;
        select.innerHTML = '<option value="">-- Select Branch --</option>';
        
        var filtered = globalBranchesFull;
        if (companyName && companyName !== 'ALL') {
            filtered = globalBranchesFull.filter(b => b.company.toLowerCase() === companyName.toLowerCase());
        }
        
        filtered.forEach(b => {
            select.add(new Option(b.branch + " (" + b.company + ")", b.branch));
        });
    }
  function populateTargetBranchDropdown() {
        var select = document.getElementById('target_branch');
        if(!select) return;
        select.innerHTML = '<option value="">-- Select Branch --</option>';
        
        var uComp = currentUser.company ? currentUser.company.toLowerCase().trim() : "";
        var uRole = currentUser.role ? currentUser.role.toLowerCase().trim() : "";
        var scope = currentUser.dataScope ? currentUser.dataScope : "OWN";
        var assigned = currentUser.assignedBranches ? currentUser.assignedBranches.split(',').map(s => s.trim().toLowerCase()) : [];
        
        var filtered = globalBranchesFull;
        
        if (uRole === 'system owner' || scope === 'ALL_COMPANIES') {
            filtered = globalBranchesFull;
        } else if (scope === 'SELECTED') {
            // Trim කරලා Exact Match එක බලනවා
            filtered = globalBranchesFull.filter(b => {
                var c = b.company ? b.company.trim().toLowerCase() : "";
                var br = b.branch ? b.branch.trim().toLowerCase() : "";
                var exactMatch = c + " - " + br;
                return assigned.includes(exactMatch) || assigned.includes(br) || (br === currentUser.branch.toLowerCase().trim() && c === uComp);
            });
        } else {
            filtered = globalBranchesFull.filter(b => b.company && b.company.trim().toLowerCase() === uComp);
        }
        
        filtered.forEach(b => {
            select.add(new Option(b.branch + " (" + b.company + ")", b.branch));
        });
    }    
    function setupDashboardPostLogin(res) {
      try {
        var uName = res.user ? res.user : "Admin";
        var uRole = res.role ? res.role.toLowerCase() : "user";
        var uBranch = res.branch ? res.branch : "Unknown";
        var uComp = res.company ? res.company : "System";

        document.getElementById('display-name').innerText = uName; 
        var formattedRole = uRole.charAt(0).toUpperCase() + uRole.slice(1);
        
        document.getElementById('display-role').innerHTML = `<span style="color:#f39c12; font-weight:bold;">${uComp}</span> | ${formattedRole} | ${uBranch}`;
        document.getElementById('welcome-name').innerHTML = `${uName} <span style="font-size:16px; color:#555;">(${uComp})</span> - ${uBranch} Branch`;
        document.getElementById('profile-img').src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(uName) + "&background=c62828&color=fff";
        
        loadDashboardStats();
        initVehicleData();

if (uRole === 'system owner') {
            document.getElementById('new-user-company').style.display = 'block';
            document.getElementById('perm-company-filter').style.display = 'block';
            document.querySelector('.branch-form-card').style.display = 'block';
            document.getElementById('template-setup-card').style.display = 'block';
            
            // System Owner ට ALL_COMPANIES scope එක පේන්න ඕනේ
            var scopeAllComp = document.getElementById('lbl_scope_all_companies');
            if (scopeAllComp) scopeAllComp.style.display = 'block';

            // System Owner ට Roles ඔක්කොම පේන්න ඕනේ
            var roleSelect = document.getElementById('new-user-role');
            if (roleSelect) {
                roleSelect.innerHTML = '<option value="User">User</option><option value="rmv branch">RMV Branch User</option><option value="rmv approval">RMV Request Approval User</option><option value="valuation admin">Valuation Admin</option><option value="super admin">Super Admin</option>';
            }
            
        } else {
            document.querySelector('.branch-form-card').style.display = 'none';
            document.getElementById('template-setup-card').style.display = 'none';
            
            // අනිත් අයට (Super Admin ඇතුළුව) ALL_COMPANIES scope එක Hide කිරීම
            var scopeAllComp = document.getElementById('lbl_scope_all_companies');
            if (scopeAllComp) scopeAllComp.style.display = 'none';

            // Super Admin ට Create User කරද්දී Role එක 'User' විතරක් පෙන්වීම
            var roleSelect = document.getElementById('new-user-role');
            if (roleSelect) {
                roleSelect.innerHTML = '<option value="User">User</option>';
            }
        }

        apiCall('getCompanyList', {}, 'GET').then(res => {
           if(res.data) {
               let dl = document.getElementById('comp-list');
               if(dl) {
                   dl.innerHTML = '';
                   res.data.forEach(c => {
                       let opt = document.createElement('option');
                       opt.value = c;
                       dl.appendChild(opt);
                   });
               }
           }
        });

        apiCall('getBranchListFull', {}, 'GET').then(res => { 
            if(res.data){ 
                globalBranchesFull = res.data;
                
                var permSelect = document.getElementById('perm-branch-select');
                if(permSelect) {
                   permSelect.innerHTML = '';
                   globalBranchesFull.forEach(b => {
                       // වෙනස මෙතනයි: පේන්නේ "Branch (Company)", සේව් වෙන්නේ "Company - Branch"
                       permSelect.add(new Option(b.branch + " (" + b.company + ")", b.company + " - " + b.branch));
                   });
                }

                // User Maintenance එකේ Dropdown එකට
                var isGlobalUser = (uRole === 'system owner' || currentUser.dataScope === 'ALL_COMPANIES');
                filterBranchDropdown(isGlobalUser ? '' : uComp, 'new-user-branch');
                
                // Target Branch Dropdown එකට අලුත් Function එක කෝල් කිරීම
                populateTargetBranchDropdown();
            } 
        });

        apiCall('getUsernamesList', {}, 'GET').then(res => { 
            if(res.data) { 
                systemUsersData = res.data;
                var compFilter = document.getElementById('perm-company-filter');
                if (compFilter && uRole === 'system owner') {
                   compFilter.innerHTML = '<option value="ALL">All Companies</option>';
                   let comps = [...new Set(res.data.map(u => u.company))];
                   comps.forEach(c => compFilter.add(new Option(c, c)));
                }
                populateUserDatalists('ALL');
            } 
        });

        // ========================================================
        // DYNAMIC PERMISSION CONTROL LOGIC
        // ========================================================
        var modules = res.allowedModules || "";
        
        if (!modules && (uRole === 'super admin' || uRole === 'admin' || uRole === 'system owner')) {
            modules = "Dashboard,Courier-Send,Courier-Action,RMV-Request,RMV-Action,Valuation-New,Valuation-Pending,Valuation-History,CR-New,CR-Pending,CR-History,Print-Add,Print-Paper,Print-Box,Admin-UserMgt,Admin-Map";
        } else if (!modules) {
            modules = "Dashboard"; 
        }

        const setVisibility = (selector, isVisible, displayType = 'flex') => {
           let el = document.querySelector(selector);
           if (el) el.style.display = isVisible ? displayType : 'none';
        };

        setVisibility('[onclick="switchView(\'dashboard\', this)"]', modules.includes("Dashboard"));

        let hasCourier = modules.includes("Courier-Send") || modules.includes("Courier-Action");
        setVisibility('[onclick="toggleSubMenu(\'courier-submenu\', this)"]', hasCourier);
        setVisibility('[onclick="switchView(\'courier-new\', this)"]', modules.includes("Courier-Send"));
        setVisibility('[onclick="switchView(\'courier-admin\', this)"]', modules.includes("Courier-Action"));
        setVisibility('#dash-courier-section', hasCourier, 'block');

        let hasRmv = modules.includes("RMV-Request") || modules.includes("RMV-Action");
        setVisibility('[onclick="toggleSubMenu(\'rmv-submenu\', this)"]', hasRmv);
        setVisibility('[onclick="switchView(\'rmv-new\', this)"]', modules.includes("RMV-Request"));
        setVisibility('[onclick="switchView(\'rmv-admin\', this)"]', modules.includes("RMV-Action"));
        setVisibility('#dash-rmv-section', hasRmv, 'block');

        let hasVal = modules.includes("Valuation-New") || modules.includes("Valuation-Pending") || modules.includes("Valuation-History");
        setVisibility('[onclick="toggleSubMenu(\'val-submenu\', this)"]', hasVal);
        setVisibility('[onclick="switchView(\'val-new\', this)"]', modules.includes("Valuation-New"));
        setVisibility('[onclick="switchView(\'val-admin\', this)"]', modules.includes("Valuation-Pending"));
        setVisibility('[onclick="switchView(\'val-history\', this)"]', modules.includes("Valuation-History"));
        setVisibility('#dash-val-section', hasVal, 'block');

        let hasAdmin = modules.includes("Admin-UserMgt") || modules.includes("Admin-Map");
        setVisibility('#admin-menu-category', hasAdmin);
        setVisibility('[onclick="switchView(\'user-mgt\', this)"]', modules.includes("Admin-UserMgt"));
        setVisibility('[onclick="switchView(\'live-map\', this)"]', modules.includes("Admin-Map"));

        let hasCR = modules.includes("CR-New") || modules.includes("CR-Pending") || modules.includes("CR-History");
        setVisibility('#cr-menu-category', hasCR);
        setVisibility('#menu-cr-new', modules.includes("CR-New"));
        setVisibility('#menu-cr-pending', modules.includes("CR-Pending"));
        setVisibility('#menu-cr-history', modules.includes("CR-History"));
        setVisibility('#dash-cr-section', hasCR, 'block');

        let hasPrint = modules.includes("Print-Add") || modules.includes("Print-Paper") || modules.includes("Print-Box");
        setVisibility('#rmv-print-category', hasPrint);
        setVisibility('[onclick="window.open(\'rmv_print.html?tab=add\', \'_blank\')"]', modules.includes("Print-Add"));
        setVisibility('[onclick="window.open(\'rmv_print.html?tab=print\', \'_blank\')"]', modules.includes("Print-Paper"));
        setVisibility('[onclick="window.open(\'RMV_PRE_PRINT.html\', \'_blank\')"]', modules.includes("Print-Box"));

        var valForm = document.getElementById('vForm');
        if(valForm) {
          valForm.onsubmit = async function(e) {
            e.preventDefault(); const vbtn = document.getElementById('valSubmitBtn'); vbtn.disabled = true; vbtn.innerText = "Processing Details...";
            try {
              const formData = {}; 
              e.target.querySelectorAll('input:not([type="file"]), select, textarea').forEach(inp => formData[inp.name] = inp.value); 
              formData.requesterEmail = currentUser.email || ""; formData.requesterName = currentUser.user || "Unknown"; formData.branch = currentUser.branch || "Unknown"; 
              
              let filesToUpload = []; 
              e.target.querySelectorAll('input[type="file"]').forEach(inp => { if (inp.files.length > 0) filesToUpload.push({ inputName: inp.name, file: inp.files[0] }); else formData[inp.name] = "No Image"; });
              
              for (let i = 0; i < filesToUpload.length; i++) {
                let f = filesToUpload[i]; vbtn.innerText = `Uploading File ${i+1} of ${filesToUpload.length}...`;
                await new Promise(r => setTimeout(r, 100)); 
                let base64Str, typeStr, nameStr;
                if (f.file.type === "application/pdf") { 
                  let b64 = await new Promise((res2, rej) => { let fr = new FileReader(); fr.onload = ev => res2(ev.target.result); fr.onerror = err => rej(err); fr.readAsDataURL(f.file); }); 
                  base64Str = b64.split(',')[1]; typeStr = 'application/pdf'; nameStr = f.file.name; 
                } else { 
                  let compressed = await compressImage(f.file, 800, 0.6); base64Str = compressed.data; typeStr = compressed.type; nameStr = compressed.name; 
                }
                
                let result = await apiCall('uploadValuationImage', { data: { base64: base64Str, type: typeStr, name: nameStr, key: f.inputName, vehicleNo: formData.vehicleNo } }); 
                if (result && result.success) { formData[result.key] = result.url; } else { throw new Error("Failed to upload"); } 
              }
              vbtn.innerText = "Saving Request to Database...";
              const serverRes = await apiCall('submitValuationForm', { data: formData });
              if(serverRes.success) { Swal.fire("Success", serverRes.result, "success"); e.target.reset(); document.querySelectorAll('.photo-box').forEach(b => b.style.backgroundImage = 'none'); loadDashboardStats(); switchView('dashboard', null); } 
              else { Swal.fire("System Error", serverRes.error, "error"); }
              vbtn.innerText = "Submit Valuation Request"; vbtn.disabled = false;
            } catch (error) { Swal.fire("Upload Error", error.message, "error"); vbtn.innerText = "Submit Valuation Request"; vbtn.disabled = false; }
          };
        }

        var rmvForm = document.getElementById('rmvForm');
        if(rmvForm) {
          rmvForm.onsubmit = async function(e) {
            e.preventDefault(); const rbtn = document.getElementById('rmvSubmitBtn'); rbtn.disabled = true; rbtn.innerText = "Getting GPS Location... 📍";
            const executeSubmit = async function(lat, lng) {
              rbtn.innerText = "Uploading CR Book... ⏳";
              try {
                const formData = { vehicleNo: e.target.vehicleNo.value, email: currentUser.email, user: currentUser.user, branch: currentUser.branch, lat: lat, lng: lng };
                let fileInput = e.target.querySelector('input[type="file"]');
                if(fileInput.files.length > 0) {
                  let f = fileInput.files[0]; let base64Str, typeStr, nameStr;
                  if (f.type === "application/pdf") { 
                    let b64 = await new Promise((res2, rej) => { let fr = new FileReader(); fr.onload = ev => res2(ev.target.result); fr.onerror = err => rej(err); fr.readAsDataURL(f); }); 
                    base64Str = b64.split(',')[1]; typeStr = 'application/pdf'; nameStr = f.name; 
                  } else { 
                    let compressed = await compressImage(f, 800, 0.6); base64Str = compressed.data; typeStr = compressed.type; nameStr = compressed.name; 
                  }
                  let result = await apiCall('uploadValuationImage', { data: { base64: base64Str, type: typeStr, name: nameStr, key: 'rmv_cr', vehicleNo: formData.vehicleNo } }); 
                  if (result && result.success) { formData.crBookUrl = result.url; } else { throw new Error("Failed to upload CR Book"); }
                } else { throw new Error("CR Book is required!"); }
                
                rbtn.innerText = "Saving Request to Database...";
                const serverRes = await apiCall('submitRmvRequest', { data: formData });
                if(serverRes.success) { Swal.fire("Success", serverRes.msg, "success"); e.target.reset(); loadDashboardStats(); switchView('dashboard', null); } 
                else { Swal.fire("System Error", serverRes.msg, "error"); }
                rbtn.innerText = "Submit Request & Capture Location 📍"; rbtn.disabled = false;
              } catch (error) { Swal.fire("Upload Error", error.message, "error"); rbtn.innerText = "Submit Request & Capture Location 📍"; rbtn.disabled = false; }
            };
            if (navigator.geolocation) { navigator.geolocation.getCurrentPosition(pos => executeSubmit(pos.coords.latitude, pos.coords.longitude), err => executeSubmit("", ""), { enableHighAccuracy: true, timeout: 10000 }); } 
            else { executeSubmit("", ""); }
          };
        }
      } catch(e) { console.log(e); }
    }

    async function saveTemplateAdmin() {
      var c = document.getElementById('tpl-company').value;
      var u = document.getElementById('tpl-url').value;
      if(!c || !u) return Swal.fire("Required", "Please fill both Company and Template URL", "warning");
      Swal.fire({title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
      try {
         var res = await apiCall('saveTemplateSettings', {company: c, url: u});
         if(res.success) {
            Swal.fire("Saved", res.msg, "success");
            document.getElementById('tpl-company').value = '';
            document.getElementById('tpl-url').value = '';
         } else {
            Swal.fire("Error", res.error || res.msg, "error");
         }
      } catch(e) {
         Swal.fire("Error", e.message, "error");
      }
    }

    async function initVehicleData() {
      try {
        const res = await apiCall('getVehicleDropdownData', {}, 'GET'); vehicleDB = res.data;
        var types = [...new Set(vehicleDB.slice(1).map(r => r[0]).filter(Boolean))];
        var vTypeSelect = document.getElementById('vType'); vTypeSelect.innerHTML = '<option value="">-- Select Type --</option>';
        types.forEach(t => vTypeSelect.add(new Option(t, t)));
      } catch(e) {}
    }
    function updateMake() {
      var type = document.getElementById('vType').value;
      var makes = [...new Set(vehicleDB.filter(r => r[0] === type).map(r => r[1]))];
      var makeSelect = document.getElementById('make'); makeSelect.innerHTML = '<option value="">-- Select Make --</option>';
      makes.forEach(m => makeSelect.add(new Option(m, m))); makeSelect.disabled = false;
      document.getElementById('model').innerHTML = '<option value="">-- Select Model --</option>'; document.getElementById('model').disabled = true;
    }
    function updateModel() {
      var type = document.getElementById('vType').value;
      var make = document.getElementById('make').value;
      var models = [...new Set(vehicleDB.filter(r => r[0] === type && r[1] === make).map(r => r[2]))];
      var modelSelect = document.getElementById('model');
      modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
      models.forEach(m => modelSelect.add(new Option(m, m)));
      modelSelect.disabled = false;
    }
    async function loadDashboardStats() {
      if(!currentUser.role) return;
      try {
        const res = await apiCall('getHomeDashboardData', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
        const data = res.data; if(!data) return;
        
        if(document.getElementById('dash-c-tot')) document.getElementById('dash-c-tot').innerText = data.courier.total;
        if(document.getElementById('dash-c-pen')) document.getElementById('dash-c-pen').innerText = data.courier.pending;
        if(document.getElementById('dash-c-del')) document.getElementById('dash-c-del').innerText = data.courier.delivered;
        
        if(document.getElementById('dash-r-tot')) document.getElementById('dash-r-tot').innerText = data.rmv.total;
        if(document.getElementById('dash-r-pen')) document.getElementById('dash-r-pen').innerText = data.rmv.pending;
        if(document.getElementById('dash-r-app')) document.getElementById('dash-r-app').innerText = data.rmv.approved;
        if(document.getElementById('dash-r-rej')) document.getElementById('dash-r-rej').innerText = data.rmv.rejected;
        
        if(document.getElementById('dash-v-tot')) document.getElementById('dash-v-tot').innerText = data.valuation.total;
        if(document.getElementById('dash-v-pen')) document.getElementById('dash-v-pen').innerText = data.valuation.pending;
        if(document.getElementById('dash-v-app')) document.getElementById('dash-v-app').innerText = data.valuation.approved;
        if(document.getElementById('dash-v-rej')) document.getElementById('dash-v-rej').innerText = data.valuation.rejected;

        var cTbody = document.querySelector("#dashMasterTable tbody");
        if(cTbody) {
            cTbody.innerHTML = "";
            if(data.courier.list.length === 0) cTbody.innerHTML = "<tr><td colspan='10' style='text-align:center;'>No Recent Activity</td></tr>";
            data.courier.list.forEach(r => {
              var badge = r.status.toLowerCase() === 'pending' ? '<span class="badge-pending">Pending</span>' : '<span class="badge-accepted">Delivered</span>';
              cTbody.innerHTML += `<tr><td><b style="color:#e67e22;">${r.company}</b></td><td>${r.id}</td><td>${r.type}</td><td>${r.route}</td><td>${r.vehicle}</td><td>${r.sentDate}</td><td>${r.recDate}</td><td>${r.sender}</td><td>${r.receiver}</td><td>${badge}</td></tr>`;
            });
        }

        var rTbody = document.querySelector("#dashRmvTable tbody");
        if(rTbody) {
            rTbody.innerHTML = "";
            if(data.rmv.list.length === 0) rTbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No Recent Activity</td></tr>";
            data.rmv.list.forEach(r => {
              var badge = r.status.toLowerCase() === 'pending' ? '<span class="badge-pending">Pending</span>' : (r.status.toLowerCase() === 'approved' ? '<span class="badge-accepted">Approved</span>' : '<span class="badge-rejected">Rejected</span>');
              var fileLink = r.fileUrl !== "No File" ? `<a href="${r.fileUrl}" target="_blank">View CR</a>` : "-";
              rTbody.innerHTML += `<tr><td><b style="color:#e67e22;">${r.company}</b></td><td>${r.date}</td><td>${r.id}</td><td>${r.vehicle}</td><td>${r.branch}</td><td>${r.approvedBy}</td><td>${badge}</td><td>${fileLink}</td></tr>`;
            });
        }

        var vTbody = document.querySelector("#dashValTable tbody");
        if(vTbody) {
            vTbody.innerHTML = "";
            globalDashValData = data.valuation.list; 
            if(data.valuation.list.length === 0) vTbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No Recent Activity</td></tr>";
            
            data.valuation.list.forEach((r, idx) => {
              var badge = r.status.toLowerCase().includes('pending') ? '<span class="badge-pending">Pending Approval</span>' : (r.status.toLowerCase() === 'approved' ? '<span class="badge-accepted">Approved</span>' : '<span class="badge-rejected">Rejected</span>');
              var viewBtn = `<button onclick="openValViewModal(${idx}, 'dash')" style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; margin-right:5px; font-size:13px;">View</button>`;
              var pdfBtn = r.pdf ? `<a href="${r.pdf}" target="_blank" style="background:#0d6efd; color:white; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:13px; font-weight:bold; display:inline-block;">PDF</a>` : "";
              
              vTbody.innerHTML += `<tr><td><b style="color:#e67e22;">${r.company}</b></td><td>${r.date}</td><td><b>${r.vehNo}</b></td><td>${r.makeModel}</td><td>${r.marketVal}</td><td>${r.saleVal}</td><td>${badge}</td><td>${viewBtn}${pdfBtn}</td></tr>`;
            });
        }

        if(document.getElementById('dash-cru-pen') && data.crupload) document.getElementById('dash-cru-pen').innerText = data.crupload.pending;
        if(document.getElementById('dash-cru-com') && data.crupload) document.getElementById('dash-cru-com').innerText = data.crupload.completed;

      } catch(e) { console.error(e); }
    }

    // ====== NEW MODAL VIEW LOGIC ======
    function openValViewModal(index, source) {
        var d = source === 'dash' ? globalDashValData[index] : globalHistoryValData[index];
        if(!d) return;

        document.getElementById('v_mod_veh').innerText = d.vehNo;
        document.getElementById('v_mod_make').innerText = d.makeModel;
        document.getElementById('v_mod_yom').innerText = d.yom || "-";
        document.getElementById('v_mod_chassis').innerText = d.chassis || "-";
        document.getElementById('v_mod_engine').innerText = d.engine || "-";

        document.getElementById('v_mod_req').innerText = d.reqAmnt && d.reqAmnt !== "-" ? "Rs. " + Number(d.reqAmnt).toLocaleString() : "-";
        document.getElementById('v_mod_mval').innerText = d.marketVal && d.marketVal !== "-" ? "Rs. " + Number(d.marketVal).toLocaleString() : "-";
        document.getElementById('v_mod_sval').innerText = d.saleVal && d.saleVal !== "-" ? "Rs. " + Number(d.saleVal).toLocaleString() : "-";
        document.getElementById('v_mod_status').innerText = d.status;
        document.getElementById('v_mod_rem').innerText = d.adminRemarks && d.adminRemarks !== "-" ? d.adminRemarks : (d.remarks || "N/A");

        var pContainer = document.getElementById('v_mod_photos');
        pContainer.innerHTML = '';
        var errImg = "this.onerror=null; this.src='https://placehold.co/250x180?text=Image+Error';";

        const addPhoto = (url, label) => {
            if(url && url !== 'No Image') {
                pContainer.innerHTML += `
                <div style="background:#000; border-radius:8px; overflow:hidden; text-align:center; cursor:pointer; border:1px solid #ddd;" onclick="openModal('${getImgUrl(url)}')">
                    <img src="${getImgUrl(url)}" onerror="${errImg}" style="width:100%; height:150px; object-fit:contain; background:#333; display:block;">
                    <div style="background:#eee; padding:8px; font-weight:bold; font-size:12px; color:#333; text-transform:uppercase;">${label}</div>
                </div>`;
            }
        };

        addPhoto(d.imgFront, "Front View");
        addPhoto(d.imgBack, "Rear View");
        addPhoto(d.imgCr, "CR Copy");
        addPhoto(d.imgChassis, "Chassis");
        addPhoto(d.imgEngine, "Engine Bay");
        addPhoto(d.imgMeter, "Meter");
        addPhoto(d.imgSheet, "Inspection Sheet");
        addPhoto(d.imgInside, "Office View");
        addPhoto(d.imgTyre, "Tyres");
        addPhoto(d.imgCustomer, "Customer View");

        document.getElementById('val-view-modal').style.display = 'block';
    }

    async function loadRMVData() {
      var tbody = document.querySelector("#rmvTable tbody");
      if(!tbody) return;
      tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:20px;'>Loading data...</td></tr>";
      try {
        const res = await apiCall('getRMVData', {}, 'GET');
        var myRole = currentUser.role.toLowerCase(); 
        var myBranch = currentUser.branch.toLowerCase();
        
        globalRmvData = res.data;
        
        tbody.innerHTML = "";
        if (!globalRmvData || globalRmvData.length === 0) { 
            tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:20px;'>No RMV requests found.</td></tr>"; 
            return; 
        }
        
        for (var i = 0; i < globalRmvData.length; i++) {
          var row = globalRmvData[i]; 
          var statusBadge = "";
          if(row.status === 'Pending') statusBadge = '<span class="badge-pending">Pending</span>';
          else if(row.status === 'Approved') statusBadge = '<span class="badge-accepted">Approved</span>';
          else statusBadge = '<span class="badge-rejected">Rejected</span>';
          
          var actionBtn = "-";
          if (myRole === 'super admin' || myRole === 'system owner' || myRole === 'rmv approval' || myBranch === "rmv") { 
              actionBtn = `<button onclick="openRmvModal(${i})" style="background:#0d6efd; color:#fff; padding:6px 12px; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">View & Confirm</button>`; 
          }
          var actByText = (row.approvedBy && row.approvedBy !== "-") ? row.approvedBy : '<span style="color:#999;font-size:12px;">Pending</span>';
          
          tbody.innerHTML += `<tr style="border-bottom:1px solid #eee;"><td><b style="color:#e67e22;">${row.company}</b></td><td>${row.date}</td><td><b>${row.reqId}</b></td><td><span style="background:#2d2d2d; color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold;">${row.vehicleNo}</span></td><td>${row.branch}</td><td>${actByText}</td><td>${statusBadge}</td><td>${actionBtn}</td></tr>`;
        }
        
        // ඩේටා ලෝඩ් වුණාට පස්සේ ඔටෝම Pending ෆිල්ටර් එක වැඩ කරන්න මේක දාන්න
        filterRmvTable();

      } catch(e) { console.error(e); }
    }
    function filterRmvTable() {
      var input = document.getElementById("rmvSearch").value.toLowerCase();
      var status = document.getElementById("rmvStatusFilter").value.toLowerCase();
      var fDate = document.getElementById("rmvFromDate").value;
      var tDate = document.getElementById("rmvToDate").value;
      var tr = document.getElementById("rmvTable").getElementsByTagName("tr");
      for (var i = 1; i < tr.length; i++) {
        var tdDate = tr[i].getElementsByTagName("td")[1]; var tdId = tr[i].getElementsByTagName("td")[2]; var tdVeh = tr[i].getElementsByTagName("td")[3]; var tdStatus = tr[i].getElementsByTagName("td")[6]; 
        if (tdDate && tdId && tdVeh && tdStatus) {
          var rowDaTestr = tdDate.textContent || tdDate.innerText; var rowDate = new Date(rowDaTestr.split(" ")[0]);
          var matchSearch = (tdId.innerText.toLowerCase().indexOf(input) > -1) || (tdVeh.innerText.toLowerCase().indexOf(input) > -1);
          var matchStatus = (status === "" || status === "all statuses" || tdStatus.innerText.toLowerCase().indexOf(status) > -1);
          var matchDate = true;
          if(fDate) { if(rowDate < new Date(fDate)) matchDate = false; }
          if(tDate) { if(rowDate > new Date(tDate)) matchDate = false; }
          tr[i].style.display = (matchSearch && matchStatus && matchDate) ? "" : "none";
        }
      }
    }
    function clearRmvFilters() { document.getElementById("rmvSearch").value = ""; document.getElementById("rmvStatusFilter").value = "Pending"; document.getElementById("rmvFromDate").value = ""; document.getElementById("rmvToDate").value = ""; filterRmvTable(); }    
    var rmvScale = 1, rmvRotate = 0, rmvPanning = false, rmvPx = 0, rmvPy = 0, rmvSx = 0, rmvSy = 0;
    var rContainer = document.getElementById("img_container"); var rImg = document.getElementById("mod_img");

    function applyRmvTransform() { rImg.style.transform = `translate(${rmvPx}px, ${rmvPy}px) scale(${rmvScale}) rotate(${rmvRotate}deg)`; }
    function zoomRmvImg() { rmvScale += 0.5; if(rmvScale > 4) rmvScale = 1; applyRmvTransform(); }
    function rotateRmvImg() { rmvRotate += 90; if(rmvRotate >= 360) rmvRotate = 0; applyRmvTransform(); }
    function resetRmvImg() { rmvScale = 1; rmvRotate = 0; rmvPx = 0; rmvPy = 0; applyRmvTransform(); }

    if (rContainer && rImg) {
      rContainer.onwheel = function(e) { e.preventDefault(); var delta = -e.deltaY; if (delta > 0) rmvScale = Math.min(rmvScale + 0.15, 5); else rmvScale = Math.max(rmvScale - 0.15, 1); if (rmvScale === 1) { rmvPx = 0; rmvPy = 0; } applyRmvTransform(); };
      rContainer.onmousedown = function(e) { if(e.target !== rImg && e.target !== rContainer) return; if(rmvScale <= 1) return; e.preventDefault(); rmvSx = e.clientX - rmvPx; rmvSy = e.clientY - rmvPy; rmvPanning = true; rImg.style.cursor = "grabbing"; };
      window.addEventListener('mouseup', function() { if(!rmvPanning) return; rmvPanning = false; rImg.style.cursor = "grab"; });
      rContainer.onmousemove = function(e) { if(!rmvPanning) return; rmvPx = e.clientX - rmvSx; rmvPy = e.clientY - rmvSy; applyRmvTransform(); };
    }

    function handleImgError(imgElem) { 
      imgElem.style.display = 'none'; 
      var iframe = document.getElementById('mod_frame'); var item = globalRmvData[currentRmvIndex]; if(!item) return;
      var url = item.fileUrl; var fileIdMatch = url ? url.match(/[-\w]{25,}/) : null; 
      if(fileIdMatch) iframe.src = `https://drive.google.com/file/d/${fileIdMatch[0]}/preview`; else iframe.src = url || ""; 
      iframe.style.display = 'block'; document.getElementById('zoomRotateControls').style.display = 'none'; 
    }

    function openRmvModal(index) {
      currentRmvIndex = index; var item = globalRmvData[index];
      document.getElementById('mod_id').innerText = item.reqId; document.getElementById('mod_veh').innerText = item.vehicleNo;
      var badgeColor = item.status === 'Pending' ? '#ffc107' : (item.status === 'Approved' ? '#198754' : '#dc3545'); var textColor = item.status === 'Pending' ? '#000' : '#fff';
      document.getElementById('mod_status').innerText = item.status; document.getElementById('mod_status').style.background = badgeColor; document.getElementById('mod_status').style.color = textColor;
      document.getElementById('mod_action_by').innerText = item.approvedBy && item.approvedBy !== "-" ? item.approvedBy : "Not Actioned Yet";
      if(item.status === 'Pending') document.getElementById('mod_action_btns').style.display = 'block'; else document.getElementById('mod_action_btns').style.display = 'none';
      resetRmvImg();
      
      var url = item.fileUrl; var fileIdMatch = url ? url.match(/[-\w]{25,}/) : null;
      if (fileIdMatch) { rImg.src = `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}`; rImg.style.display = 'block'; document.getElementById('mod_frame').style.display = 'none'; document.getElementById('zoomRotateControls').style.display = 'flex'; }
      else { document.getElementById('mod_frame').src = url || ""; document.getElementById('mod_frame').style.display = 'block'; rImg.style.display = 'none'; document.getElementById('zoomRotateControls').style.display = 'none'; }
      document.getElementById('rmv-approval-modal').style.display = 'block';
    }

    function processRmvApproval(status) {
      var item = globalRmvData[currentRmvIndex];
      Swal.fire({ title: 'Confirm Action', text: `Mark this request as ${status}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: status === 'Approved' ? '#198754' : '#dc3545', confirmButtonText: `Yes, ${status} it!` }).then(async function(result) {
        if (result.isConfirmed) {
          document.getElementById('mod_action_btns').style.display = 'none'; Swal.fire({title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
          try {
             const res = await apiCall('updateRMVStatus', { reqId: item.reqId, actionBy: currentUser.user, status: status });
             globalRmvData[currentRmvIndex].status = status; globalRmvData[currentRmvIndex].approvedBy = currentUser.user; 
             var nextIndex = -1; for(var i = 0; i < globalRmvData.length; i++) { if(globalRmvData[i].status === 'Pending') { nextIndex = i; break; } }
             if(nextIndex !== -1) { 
                 Swal.fire({title: "Success", text: (res.data || res.success) + " Loading next...", icon: "success", timer: 1200, showConfirmButton: false});
                 setTimeout(() => openRmvModal(nextIndex), 1200); 
             } else { 
                 Swal.fire("All Done!", "No more pending RMV requests.", "success");
                 document.getElementById('rmv-approval-modal').style.display = 'none'; loadRMVData(); loadDashboardStats();
             }
          } catch(e) { Swal.fire("Error", "Could not update status", "error"); }
        }
      });
    }

    async function createUserAdmin() {
      var c = document.getElementById('new-user-company').value;
      if (!c || c === "") { c = currentUser.company; }
      
      var b = document.getElementById('new-user-branch').value; 
      var r = document.getElementById('new-user-role').value; 
      var n = document.getElementById('new-user-name').value; 
      var u = document.getElementById('new-user-uname').value; 
      var e = document.getElementById('new-user-email').value;
      
      if(!b || !n || !u || !e) { Swal.fire("Required", "Please fill all fields!", "warning"); return; }
      Swal.fire({title: 'Creating User...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const res = await apiCall('createNewSystemUser', { company: c, branch: b, name: n, username: u, email: e, role: r });
        if(res.success) { 
          Swal.fire("Success!", res.msg, "success"); 
          
          document.getElementById('new-user-company').value = ""; 
          document.getElementById('new-user-branch').value = ""; 
          document.getElementById('new-user-role').value = "User"; 
          document.getElementById('new-user-name').value = ""; 
          document.getElementById('new-user-uname').value = ""; 
          document.getElementById('new-user-email').value = ""; 
          
          apiCall('getUsernamesList', {}, 'GET').then(res2 => { 
              if(res2.data){
                  systemUsersData = res2.data;
                  populateUserDatalists(document.getElementById('perm-company-filter') ? document.getElementById('perm-company-filter').value : 'ALL');
              }
          }); 
        } else { Swal.fire("Error", res.msg || res.error || "Failed", "error"); }
      } catch(error) { Swal.fire("Error", "Server Error", "error"); }
    }

    async function createCompanyBranch() {
      var c = document.getElementById('new-cb-company').value; 
      var b = document.getElementById('new-cb-branch').value; 
      var code = document.getElementById('new-cb-code').value; 
      if(!c || !b || !code) { Swal.fire("Required", "Please fill all fields!", "warning"); return; }
      Swal.fire({title: 'Adding...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const res = await apiCall('addCompanyBranch', { company: c, branch: b, code: code });
        if(res.success) { 
          Swal.fire("Success!", res.msg, "success"); 
          document.getElementById('new-cb-company').value = ""; document.getElementById('new-cb-branch').value = ""; document.getElementById('new-cb-code').value = "";
          
          apiCall('getBranchListFull', {}, 'GET').then(res2 => { 
            if(res2.data){ 
                globalBranchesFull = res2.data;
                var comp = currentUser.role.toLowerCase() === 'system owner' ? '' : currentUser.company;
                filterBranchDropdown(comp, 'new-user-branch');
                filterBranchDropdown(comp, 'target_branch');
            } 
          });
        } else { Swal.fire("Error", res.error || res.msg || "Failed", "error"); }
      } catch(error) { Swal.fire("Error", "Server Error", "error"); }
    }

    async function resetPasswordAdmin() {
      var u = document.getElementById('reset-uname-input').value;
      if(!u) { Swal.fire("Required", "Select a username first!", "warning"); return; }
      Swal.fire({title: 'Resetting Password...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
      try {
        const res = await apiCall('resetSystemUserPassword', { username: u });
        if(res.success) { Swal.fire("Success!", res.msg, "success"); } else { Swal.fire("Error", res.msg || res.error || "Failed", "error"); }
      } catch(error) { Swal.fire("Error", "Server Error", "error"); }
    }

    // ========================================================
    // NEW: USER PERMISSIONS & ACCESS MANAGEMENT LOGIC
    // ========================================================
    
    function toggleSub(mainId, subClass) {
        let isChecked = document.getElementById(mainId).checked;
        document.querySelectorAll('.' + subClass).forEach(chk => {
            chk.checked = isChecked;
        });
    }

    function toggleBranchSelect() {
      var scope = document.querySelector('input[name="data_scope"]:checked').value;
      var branchDiv = document.getElementById('selected-branches-div');
      if(scope === 'SELECTED') {
         branchDiv.style.display = 'block';
      } else {
         branchDiv.style.display = 'none';
      }
    }

    async function loadUserPermDetails() {
      var user = document.getElementById('perm-user-search').value;
      var section = document.getElementById('perm-details-section');
      
      var isUserValid = systemUsersData.some(u => u.username === user);
      if(!user || !isUserValid) {
         section.style.display = 'none';
         return;
      }
      
      section.style.display = 'block';
      document.getElementById('perm-status-badge').innerText = "Loading...";
      document.getElementById('perm-status-badge').style.background = "#6c757d";
      
      try {
        const res = await apiCall('getUserPermDetails', { username: user }, 'GET');
        
        document.querySelectorAll('.perm-label input[type="checkbox"]').forEach(chk => chk.checked = false);
        document.querySelector('input[name="data_scope"][value="OWN"]').checked = true;
        
        if (res.success && res.data) {
           var m = res.data.modules;
           if (m.includes("Dashboard")) document.getElementById('chk_dash').checked = true;
           
           if (m.includes("Courier-Send")) document.getElementById('chk_courier_send').checked = true;
           if (m.includes("Courier-Action")) document.getElementById('chk_courier_action').checked = true;
           if (m.includes("Courier-Send") && m.includes("Courier-Action")) document.getElementById('chk_courier_main').checked = true;
           
           if (m.includes("RMV-Request")) document.getElementById('chk_rmv_req').checked = true;
           if (m.includes("RMV-Action")) document.getElementById('chk_rmv_action').checked = true;
           if (m.includes("RMV-Request") && m.includes("RMV-Action")) document.getElementById('chk_rmv_main').checked = true;
           
           if (m.includes("Valuation-New")) document.getElementById('chk_val_new').checked = true;
           if (m.includes("Valuation-Pending")) document.getElementById('chk_val_pend').checked = true;
           if (m.includes("Valuation-History")) document.getElementById('chk_val_hist').checked = true;
           if (m.includes("Valuation-New") && m.includes("Valuation-Pending") && m.includes("Valuation-History")) document.getElementById('chk_val_main').checked = true;
           
           if (m.includes("CR-New")) document.getElementById('chk_cr_new').checked = true;
           if (m.includes("CR-Pending")) document.getElementById('chk_cr_pend').checked = true;
           if (m.includes("CR-History")) document.getElementById('chk_cr_hist').checked = true;
           if (m.includes("CR-New") && m.includes("CR-Pending") && m.includes("CR-History")) document.getElementById('chk_cr_main').checked = true;
           
           if (m.includes("Print-Add")) document.getElementById('chk_print_add').checked = true;
           if (m.includes("Print-Paper")) document.getElementById('chk_print_paper').checked = true;
           if (m.includes("Print-Box")) document.getElementById('chk_print_box').checked = true;
           if (m.includes("Print-Add") && m.includes("Print-Paper") && m.includes("Print-Box")) document.getElementById('chk_print_main').checked = true;
           
           if (m.includes("Admin-UserMgt")) document.getElementById('chk_admin_user').checked = true;
           if (m.includes("Admin-Map")) document.getElementById('chk_admin_map').checked = true;
           if (m.includes("Admin-UserMgt") && m.includes("Admin-Map")) document.getElementById('chk_admin_main').checked = true;
           
           if (res.data.scope) {
              let scopeRadio = document.querySelector(`input[name="data_scope"][value="${res.data.scope}"]`);
              if(scopeRadio) scopeRadio.checked = true;
           }
           
           if (res.data.scope === 'SELECTED' && res.data.branches) {
              var allowedBranches = res.data.branches.split(",");
              var selectObj = document.getElementById('perm-branch-select');
              for (var i = 0; i < selectObj.options.length; i++) {
                 selectObj.options[i].selected = allowedBranches.includes(selectObj.options[i].value);
              }
           }

           document.getElementById('perm-status-badge').innerText = res.data.status;
           document.getElementById('perm-status-badge').style.background = res.data.status === "Active" ? "#28a745" : "#dc3545";
           
           var btn = document.getElementById('btn-revoke-grant');
           btn.innerText = res.data.status === "Active" ? "Revoke Complete Access" : "Grant Access";
           btn.style.background = res.data.status === "Active" ? "#dc3545" : "#28a745";
        }
        toggleBranchSelect();
      } catch (e) {
         document.getElementById('perm-status-badge').innerText = "Error Loading Data";
      }
    }

    function saveUserPermissions() {
       var user = document.getElementById('perm-user-search').value;
       if(!user) return Swal.fire("Required", "Please select a user to update.", "warning");
       
       var modules = [];
       const checkSub = (id, name) => { if(document.getElementById(id).checked) modules.push(name); };
       
       if(document.getElementById('chk_dash').checked) modules.push("Dashboard");
       
       checkSub('chk_courier_send', "Courier-Send"); checkSub('chk_courier_action', "Courier-Action");
       checkSub('chk_rmv_req', "RMV-Request"); checkSub('chk_rmv_action', "RMV-Action");
       checkSub('chk_val_new', "Valuation-New"); checkSub('chk_val_pend', "Valuation-Pending"); checkSub('chk_val_hist', "Valuation-History");
       checkSub('chk_cr_new', "CR-New"); checkSub('chk_cr_pend', "CR-Pending"); checkSub('chk_cr_hist', "CR-History");
       checkSub('chk_print_add', "Print-Add"); checkSub('chk_print_paper', "Print-Paper"); checkSub('chk_print_box', "Print-Box");
       checkSub('chk_admin_user', "Admin-UserMgt"); checkSub('chk_admin_map', "Admin-Map");
       
       var scope = document.querySelector('input[name="data_scope"]:checked').value;
       var branches = [];
       if(scope === 'SELECTED') {
          var selectObj = document.getElementById('perm-branch-select');
          for (var i = 0; i < selectObj.options.length; i++) {
             if (selectObj.options[i].selected) branches.push(selectObj.options[i].value);
          }
       }
       
       Swal.fire({ title: "Updating Permissions...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
       
       apiCall('saveUserPermissions', {
          username: user,
          modules: modules.join(","),
          scope: scope,
          branches: branches.join(",")
       }).then(res => {
          if(res.success) { Swal.fire("Saved!", res.msg, "success"); } 
          else { Swal.fire("Error", res.error || res.msg || "Failed", "error"); }
       }).catch(e => Swal.fire("Error", "Network Error", "error"));
    }

    function toggleAccountStatus() {
       var user = document.getElementById('perm-user-search').value;
       if(!user) return;
       var badge = document.getElementById('perm-status-badge');
       var isCurrentlyActive = badge.innerText === "Active";
       var actionName = isCurrentlyActive ? "Revoke" : "Grant";
       var newStatus = isCurrentlyActive ? "Revoked" : "Active";
       
       Swal.fire({
          title: `${actionName} Access?`,
          text: `Are you sure you want to ${actionName.toLowerCase()} login access for ${user}?`,
          icon: isCurrentlyActive ? "warning" : "info",
          showCancelButton: true,
          confirmButtonColor: isCurrentlyActive ? "#dc3545" : "#28a745",
          confirmButtonText: `Yes, ${actionName}`
       }).then((result) => {
          if(result.isConfirmed) {
             Swal.fire({ title: "Updating...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
             apiCall('toggleUserAccess', { username: user, status: newStatus }).then(res => {
                if (res.success) {
                   Swal.fire("Success!", res.msg, "success");
                   loadUserPermDetails(); 
                } else { Swal.fire("Error", res.error || res.msg, "error"); }
             }).catch(e => Swal.fire("Error", "Network Error", "error"));
          }
       });
    }

    function initMap() { if (!rmvMap && document.getElementById('map')) { var streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'); var satelliteMap = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {maxZoom: 20}); rmvMap = L.map('map', { center: [7.8731, 80.7718], zoom: 7, layers: [streetMap] }); L.control.layers({"Street Map 🗺️": streetMap, "Satellite Map 🌍": satelliteMap}).addTo(rmvMap); } loadMapData(); }
    async function loadMapData() { 
      try {
          const res = await apiCall('getHomeDashboardData', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
          mapMarkers.forEach(m => rmvMap.removeLayer(m)); mapMarkers = []; 
          res.data.courier.list.forEach(row => { 
              if (row.lat && row.lng) { 
                  var color = row.status.toLowerCase() === 'pending' ? '#0d6efd' : '#20c997'; 
                  var marker = L.marker([parseFloat(row.lat) + (Math.random()-0.5)*0.0003, parseFloat(row.lng) + (Math.random()-0.5)*0.0003], {icon: L.divIcon({className: 'custom-pin', html: `<div style="background-color:${color}; width:16px; height:16px; border-radius:3px; border:2px solid white;"></div>`, iconSize: [16, 16]})}).addTo(rmvMap); 
                  marker.bindPopup(`<b>📦 Courier: ${row.type}</b><br>ID: ${row.id}<br>Status: <b>${row.status}</b>`); mapMarkers.push(marker); 
              } 
          }); 
      } catch(e) { console.error("Map Error", e); }
    }

    async function logout() {
      try { await apiCall('logout',{},'POST'); } catch(e) {}
      Session.clear(); currentUser={};
      document.getElementById('app-container').style.display='none';
      document.getElementById('login-container').style.display='flex';
      document.getElementById('username').value=''; document.getElementById('password').value='';
    }

    function toggleSidebar() { document.getElementById('main-sidebar').classList.toggle('closed'); }
    function toggleSubMenu(id, el) { var sub = document.getElementById(id); if(!sub) return; sub.classList.toggle('open'); var icon = el.querySelector('.arrow'); if(sub.classList.contains('open')) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); } else { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); } }
    
    function switchView(viewId, element) {
      document.querySelectorAll('.menu-item').forEach(el => { el.classList.remove('active'); var ic = el.getAttribute('data-icon'); if(ic) el.querySelector('i').className = ic; });
      if(element) { element.classList.add('active'); element.querySelector('i').className = 'fas fa-check-circle'; }
      document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
      var view = document.getElementById('view-' + viewId); if(view) view.style.display = 'block';
      if(viewId === 'dashboard') loadDashboardStats();
      if(viewId === 'courier-new') { generateAutoId(); }
      if(viewId === 'courier-admin') loadCourierData();
      if(viewId === 'rmv-admin') { loadRMVData(); }
      if(viewId === 'val-admin') { loadPendingValuations(); }
      if(viewId === 'val-history') { loadValuationHistory(); }
      if(viewId === 'live-map') { setTimeout(() => { if(typeof initMap === 'function') initMap(); else { if(rmvMap) rmvMap.invalidateSize(); loadMapData(); } }, 300); }
      if(viewId === 'cr-upload-new') { loadPendingCRList(); }
      if(viewId === 'cr-upload-history') { loadCRHistory(); }
      if(viewId === 'cr-upload-pending') { loadPendingCRTable(); }
    }

    var modal = document.getElementById("imgModal"), img = document.getElementById("fullImage"), container = document.getElementById("modalContainer"); 
    var scale = 1, rotateDeg = 0, panning = false, pointX = 0, pointY = 0, startX = 0, startY = 0;
    function openModal(src) { if(!modal) return; modal.style.display = "block"; img.src = src; scale = 1; rotateDeg = 0; pointX = 0; pointY = 0; updateTransform(); document.body.style.overflow="hidden"; } 
    function closeModal() { if(!modal) return; modal.style.display = "none"; img.src = ""; document.body.style.overflow="auto"; } 
    function rotateImage(e) { e.stopPropagation(); rotateDeg += 90; if (rotateDeg >= 360) rotateDeg = 0; if(scale<1) scale=1; updateTransform(); } 
    function updateTransform() { if(!img) return; img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale}) rotate(${rotateDeg}deg)`; } 
    if(container) container.onwheel = function(e) { e.preventDefault(); var delta = -e.deltaY; if (delta > 0) scale = Math.min(scale + 0.15, 5); else scale = Math.max(scale - 0.15, 1); if (scale === 1) { pointX = 0; pointY = 0; } updateTransform(); } 
    if(container) container.onmousedown = function(e) { if(e.target !== img && e.target !== container) return; if(scale <= 1) return; e.preventDefault(); startX = e.clientX - pointX; startY = e.clientY - pointY; panning = true; modal.style.cursor = "grabbing"; } 
    window.onmouseup = function() { if(!panning) return; panning = false; if(modal) modal.style.cursor = "grab"; } 
    if(container) container.onmousemove = function(e) { if(!panning) return; pointX = e.clientX - startX; pointY = e.clientY - startY; updateTransform(); } 
    window.addEventListener('keydown', function(e) { if(modal && modal.style.display === "block" && e.key === "Escape") closeModal(); });

    async function generateAutoId() {
      var idInput = document.getElementById('p_id');
      if(idInput) {
        idInput.value = "Generating ID...";
        try { const res = await apiCall('generateAutoId', { branch: currentUser.branch }, 'GET'); idInput.value = res.data; } catch(e) { idInput.value = "Error"; }
      }
    }

    function saveCourierData() {
      var id = document.getElementById('p_id').value; var type = document.getElementById('p_type').value; var branch = document.getElementById('target_branch').value; var vehicle = document.getElementById('p_vehicle').value; var remarks = document.getElementById('p_remarks').value;
      if(!branch) return Swal.fire("Required", "Please select Target Branch!", "warning");
      var btn = document.getElementById('sendBtn'); btn.disabled = true; btn.innerText = "Getting Location & Dispatching... 📍";

      const executeCourierSubmit = async function(lat, lng) {
         var data = { id: id, type: type, toBranch: branch, vehicle: vehicle, remarks: remarks, fromBranch: currentUser.branch, sender: currentUser.user, email: currentUser.email, lat: lat, lng: lng };
         try {
             const res = await apiCall('submitCourier', { data: data });
             if(res.success) { 
                 var emailMsg = res.email === "Sent" ? " & Email Sent!" : " (No Email Sent)";
                 Swal.fire("Success", "Package Dispatched" + emailMsg, "success");
                 document.getElementById('p_vehicle').value = ""; document.getElementById('p_remarks').value = "";
                 generateAutoId(); loadDashboardStats(); loadCourierData();
             } else { Swal.fire("Error", res.msg || "Failed", "error"); }
         } catch(e) { Swal.fire("Error", "Network Error", "error"); }
         btn.disabled = false; btn.innerText = "Dispatch Package";
      };

      if (navigator.geolocation) { navigator.geolocation.getCurrentPosition( pos => executeCourierSubmit(pos.coords.latitude, pos.coords.longitude), err => { Swal.fire("Location Blocked", "Saving without GPS location.", "info"); executeCourierSubmit("Location Blocked", "Location Blocked"); }, { enableHighAccuracy: true, timeout: 8000 } ); } 
      else { executeCourierSubmit("Not Supported", "Not Supported"); }
    }

    async function loadCourierData() {
      var tbody = document.querySelector("#parcelTable tbody");
      if(!tbody) return;
      tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Loading data...</td></tr>";
      try {
        const res = await apiCall('getCourierData', {}, 'GET'); const data = res.data; tbody.innerHTML = "";
        if(!data || data.length === 0) { tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No Data Found</td></tr>"; return; }
        
        var hasData = false;
        data.forEach(row => {
          if(row[0] === "Error") { tbody.innerHTML += `<tr><td colspan='8' style='color:red; text-align:center;'><b>System Error:</b> ${row[1]}</td></tr>`; hasData = true; return; }
          hasData = true; var status = row[8] ? String(row[8]).trim() : "Pending";
          var badge = status.toLowerCase() === 'pending' ? '<span class="badge-pending">Pending</span>' : '<span class="badge-accepted">Delivered</span>';
          
          var toBr = row[5] ? String(row[5]).trim().toLowerCase() : "";
          var myRole = currentUser.role ? currentUser.role.trim().toLowerCase() : "";
          var btn = (status.toLowerCase() === 'pending' && (currentUser.branch.toLowerCase() === toBr || myRole === 'super admin' || myRole === 'system owner' || (toBr === 'rmv' && (myRole === 'rmv approval' || myRole === 'rmv branch')))) ? `<button onclick="receiveCourier('${row[2]}')" style="background:#198754;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Mark Received</button>` : "-";
          
          tbody.innerHTML += `<tr><td><b style="color:#e67e22;">${row[0]}</b></td><td>${row[1]}</td><td><b>${row[2]}</b></td><td>${row[3]}</td><td>${row[4]} ➔ ${row[5]}</td><td>${row[6]}<br><small>${row[7]}</small></td><td>${badge}</td><td>${btn}</td></tr>`;
        });
        
        if(!hasData) { tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No Couriers Found for your branch.</td></tr>"; }
        
        // ඩේටා ලෝඩ් වුණාට පස්සේ ඔටෝම Pending ෆිල්ටර් එක වැඩ කරන්න මේක දාන්න
        filterCourierTable(); 
        
      } catch(e) { 
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;color:red;'>Error Loading Data</td></tr>"; 
      }
    }
    function receiveCourier(id) {
        Swal.fire({ title: 'Receive Package?', text: `Mark package ${id} as delivered?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, Received!' }).then(async result => {
          if(result.isConfirmed) {
              try {
                  const res = await apiCall('updateCourierStatus', { id: id, receiverName: currentUser.user });
                  if(res.success) { Swal.fire("Success", "Package Marked as Received!", "success"); loadCourierData(); loadDashboardStats(); } 
                  else { Swal.fire("Error", res.msg || "Failed", "error"); }
              } catch(e) { Swal.fire("Error", "Network Error", "error"); }
          }
        });
    }

    function previewImage(input) {
      var box = input.parentElement; var file = input.files[0]; var clearBtn = box.querySelector('.clear-btn');
      if (file) { if(file.type === 'application/pdf') { box.style.backgroundImage = "url('https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg')"; } else { var reader = new FileReader(); reader.onload = e => box.style.backgroundImage = `url('${e.target.result}')`; reader.readAsDataURL(file); } if(clearBtn) clearBtn.style.display = 'block'; }
    }

    function clearImage(btn) { var box = btn.parentElement; var input = box.querySelector('input[type="file"]'); input.value = ""; box.style.backgroundImage = "none"; btn.style.display = 'none'; }
    function extractCRData() { Swal.fire("Info", "Auto-Fill with AI is under development.", "info"); }

    function compressImage(file, maxWidth, quality) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = event => {
          const img = new Image(); img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality); resolve({ data: dataUrl.split(',')[1], type: 'image/jpeg', name: file.name });
          };
        };
        reader.onerror = error => reject(error);
      });
    }

    async function getSealImageBase64() {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(220, 53, 69, 0.4)"; 
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 8); 
      ctx.strokeStyle = "rgba(220, 53, 69, 0.4)";
      ctx.lineWidth = 4;
      ctx.strokeRect(-360, -80, 720, 170);
      ctx.fillText("මෙය වාහනය ලියාපදිංචි සහතිකයේ සත්‍ය පිටපතකි.", 0, -35);
      ctx.fillText("අදායම් බලපත්‍රය ලබාගැනීමට /", 0, 10);
      ctx.fillText("දුම් වාර්තාව ලබාගැනීමට පමණි", 0, 50);
      return canvas.toDataURL('image/png');
    }

    async function watermarkPDF(file) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      const sealDataUrl = await getSealImageBase64();
      const sealImage = await pdfDoc.embedPng(sealDataUrl);
      const { width: sealWidth, height: sealHeight } = sealImage.scale(0.8); 
      const pages = pdfDoc.getPages();
      for(let i = 0; i < pages.length; i++) {
         const page = pages[i];
         const { width, height } = page.getSize();
         page.drawImage(sealImage, {
            x: (width / 2) - (sealWidth / 2),
            y: (height / 2) - (sealHeight / 2),
            width: sealWidth,
            height: sealHeight
         });
      }
      const pdfBytes = await pdfDoc.save();
      let binary = '';
      const bytes = new Uint8Array(pdfBytes);
      for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
      return window.btoa(binary);
    }

    function compressAndWatermarkImage(file, maxWidth, quality) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = event => {
          const img = new Image(); img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, width, height); 
            ctx.save();
            ctx.fillStyle = "rgba(220, 53, 69, 0.4)"; 
            let fontSize = Math.floor(width / 28); 
            ctx.font = "bold " + fontSize + "px sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.translate(width / 2, height / 2); ctx.rotate(-Math.PI / 6); 
            ctx.fillText("මෙය වාහනය ලියාපදිංචි සහතිකයේ සත්‍ය පිටපතකි.", 0, -fontSize * 1.5);
            ctx.fillText("අදායම් බලපත්‍රය ලබාගැනීමට /", 0, 0);
            ctx.fillText("දුම් වාර්තාව ලබාගැනීමට පමණි", 0, fontSize * 1.5);
            ctx.restore();
            const dataUrl = canvas.toDataURL('image/jpeg', quality); 
            resolve({ data: dataUrl.split(',')[1], type: 'image/jpeg', name: file.name });
          };
        };
        reader.onerror = error => reject(error);
      });
    }

    async function loadPendingValuations() {
      var container = document.getElementById("admin-req-list"); if(!container) return;
      container.innerHTML = "<div style='text-align:center; padding:20px;'>Loading pending requests...</div>";
      try {
        const res = await apiCall('getPendingValuations', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
        const data = res.data; container.innerHTML = "";
        if(!data || data.length === 0) { container.innerHTML = "<div style='text-align:center; padding:20px; background:#fff; border-radius:8px;'>No pending valuations found.</div>"; return; }
        
        var isAdmin = String(currentUser.role || "").toLowerCase().includes('admin') || String(currentUser.role || "").toLowerCase().includes('approval') || String(currentUser.role || "").toLowerCase().includes('owner');
        data.forEach(req => {
          var imgHtml = ''; var errImg = "this.onerror=null; this.src='https://placehold.co/250x180?text=Image+Error';";
          if(req.imgFront !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgFront)}')"><img src="${getImgUrl(req.imgFront)}" onerror="${errImg}"><div class="admin-photo-label">Front View</div></div>`;
          if(req.imgBack !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgBack)}')"><img src="${getImgUrl(req.imgBack)}" onerror="${errImg}"><div class="admin-photo-label">Back View</div></div>`;
          if(req.imgCr !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgCr)}')"><img src="${getImgUrl(req.imgCr)}" onerror="${errImg}"><div class="admin-photo-label">CR Copy</div></div>`;
          if(req.imgChassis !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgChassis)}')"><img src="${getImgUrl(req.imgChassis)}" onerror="${errImg}"><div class="admin-photo-label">Chassis</div></div>`;
          if(req.imgEngine !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgEngine)}')"><img src="${getImgUrl(req.imgEngine)}" onerror="${errImg}"><div class="admin-photo-label">Engine</div></div>`;
          if(req.imgMeter !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgMeter)}')"><img src="${getImgUrl(req.imgMeter)}" onerror="${errImg}"><div class="admin-photo-label">Meter</div></div>`;
          if(req.imgSheet !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgSheet)}')"><img src="${getImgUrl(req.imgSheet)}" onerror="${errImg}"><div class="admin-photo-label">Inspection Sheet</div></div>`;
          if(req.imgInside !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgInside)}')"><img src="${getImgUrl(req.imgInside)}" onerror="${errImg}"><div class="admin-photo-label">Office View</div></div>`;
          if(req.imgTyre !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgTyre)}')"><img src="${getImgUrl(req.imgTyre)}" onerror="${errImg}"><div class="admin-photo-label">Tyre Condition</div></div>`;
          if(req.imgCustomer !== 'No Image') imgHtml += `<div class="admin-photo-item" onclick="openModal('${getImgUrl(req.imgCustomer)}')"><img src="${getImgUrl(req.imgCustomer)}" onerror="${errImg}"><div class="admin-photo-label">Customer View</div></div>`;

          var actionHtml = '';
          if (isAdmin) {
             actionHtml = `<div class="admin-valuation-form"><h4 style="margin-bottom:15px; color:#c62828;">Inspector Assessment <span style="font-size:12px; color:#555;">(${req.company})</span></h4><div class="admin-input-row"><div><label>Market Value (LKR)</label><input type="number" id="mVal_${req.row}" class="admin-input" value="${req.defaultMarket || ''}"></div><div><label>Forced Sale Value (LKR)</label><input type="number" id="sVal_${req.row}" class="admin-input" value="${req.defaultSale || ''}"></div></div><label>Remarks</label><input type="text" id="rem_${req.row}" class="admin-input" placeholder="Add any comments..."><div style="display:flex; gap:10px; margin-top:10px;"><button onclick="processValuation(${req.row}, 'Approved')" style="flex:1; background:#198754; color:white; padding:12px; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Approve & Generate PDF</button><button onclick="processValuation(${req.row}, 'Rejected')" style="flex:1; background:#dc3545; color:white; padding:12px; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Reject Request</button></div></div>`;
          } else { actionHtml = '<div style="background:#fff3cd; padding:15px; border-radius:5px; text-align:center; font-weight:bold; color:#856404; border:1px solid #ffeeba; margin-top:15px;">Status: Pending Admin Approval ⏳</div>'; }

          var card = `<div class="admin-req-card"><div class="info-grid"><div class="info-box"><strong>Vehicle No</strong><span>${req.vehNo}</span></div><div class="info-box"><strong>Make & Model</strong><span>${req.make} ${req.model}</span></div><div class="info-box"><strong>YOM</strong><span>${req.yom}</span></div><div class="info-box"><strong>Requested By</strong><span>${req.reqName} (${req.reqBranch})</span></div><div class="info-box"><strong>Req Amount</strong><span>Rs. ${req.reqAmount}</span></div><div class="info-box"><strong>Chassis No</strong><span>${req.chassisNo}</span></div></div><div class="admin-photo-grid">${imgHtml}</div>${actionHtml}</div>`;
          container.innerHTML += card;
        });
      } catch(e) { container.innerHTML = "<div style='color:red;'>Error Loading Valuations</div>"; }
    }

    async function processValuation(row, status) {
      var mVal = document.getElementById(`mVal_${row}`).value; var sVal = document.getElementById(`sVal_${row}`).value; var rem = document.getElementById(`rem_${row}`).value;
      if(status === 'Approved' && (!mVal || !sVal)) { Swal.fire("Required", "Please enter Market and Sale values to approve!", "warning"); return; }
      Swal.fire({title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
      try {
        const res = await apiCall('approveValuationRequest', { row: row, marketValue: mVal, saleValue: sVal, adminRemarks: rem, status: status });
        if(res.success) { Swal.fire("Success", res.result, "success"); loadPendingValuations(); loadDashboardStats(); } 
        else { Swal.fire("Error", res.error || "Failed", "error"); }
      } catch(e) { Swal.fire("Error", "Server Error", "error"); }
    }

    async function loadValuationHistory() {
      var tbody = document.getElementById("valHistoryBody"); if(!tbody) return;
      tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Loading...</td></tr>";
      try {
        const res = await apiCall('getValuationSummary', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
        const data = res.data; tbody.innerHTML = "";
        globalHistoryValData = data; 
        
        if(!data || data.length === 0) { tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>No History Found</td></tr>"; return; }
        data.forEach((row, idx) => {
          var statusBadge = row.status.toLowerCase() === 'approved' ? '<span class="badge-accepted">Approved</span>' : (row.status.toLowerCase() === 'rejected' ? '<span class="badge-rejected">Rejected</span>' : '<span class="badge-pending">Pending Approval</span>');
          var viewBtn = `<button onclick="openValViewModal(${idx}, 'history')" style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; margin-right:5px; font-size:13px;">View</button>`;
          var pdfLink = row.pdf ? `<a href="${row.pdf}" target="_blank" style="background:#0d6efd; color:white; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:13px; font-weight:bold; display:inline-block;">PDF</a>` : "";
          tbody.innerHTML += `<tr><td><b style="color:#e67e22;">${row.company}</b></td><td>${row.date}</td><td><b>${row.reqName}</b><br><small style="color:#777;">${row.branch}</small></td><td><b>${row.vehNo}</b></td><td>${row.makeModel}</td><td>${statusBadge}</td><td>${viewBtn}${pdfLink}</td></tr>`;
        });
      } catch(e) { tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;color:red;'>Error Loading History</td></tr>"; }
    }

    function filterValHistoryTable() {
      var fDate = document.getElementById("valFromDate").value; var tDate = document.getElementById("valToDate").value; var search = document.getElementById("valSearch").value.toLowerCase(); var tr = document.getElementById("valHistoryTable").getElementsByTagName("tr");
      for (var i = 1; i < tr.length; i++) {
        var tdDate = tr[i].getElementsByTagName("td")[1]; var tdVeh = tr[i].getElementsByTagName("td")[3];
        if (tdDate && tdVeh) {
          var rowDaTestr = tdDate.textContent || tdDate.innerText; var rowDate = new Date(rowDaTestr); var matchSearch = tdVeh.innerText.toLowerCase().indexOf(search) > -1; var matchDate = true;
          if (fDate) { if (rowDate < new Date(fDate)) matchDate = false; }
          if (tDate) { var toDateObj = new Date(tDate); toDateObj.setHours(23, 59, 59, 999); if (rowDate > toDateObj) matchDate = false; }
          tr[i].style.display = (matchSearch && matchDate) ? "" : "none";
        }
      }
    }

    function clearValFilters() { document.getElementById("valFromDate").value = ""; document.getElementById("valToDate").value = ""; document.getElementById("valSearch").value = ""; filterValHistoryTable(); }

    function filterDashboardTables() {
        var fDate = document.getElementById("dashFromDate").value; var tDate = document.getElementById("dashToDate").value; var search = document.getElementById("dashSearch").value.toLowerCase();
        
        var tables = [ {id: "dashMasterTable", dateCol: 5, searchCols: [1, 4]}, {id: "dashRmvTable", dateCol: 1, searchCols: [2, 3]}, {id: "dashValTable", dateCol: 1, searchCols: [2]} ];
        tables.forEach(tbl => {
            var tbody = document.querySelector("#" + tbl.id + " tbody"); if(!tbody) return; var tr = tbody.getElementsByTagName("tr");
            for (var i = 0; i < tr.length; i++) {
                var tds = tr[i].getElementsByTagName("td");
                if (tds.length > 1) { 
                    var rowDaTestr = tds[tbl.dateCol].textContent || tds[tbl.dateCol].innerText; var rowDate = new Date(rowDaTestr.split(" ")[0]); var matchSearch = false;
                    tbl.searchCols.forEach(colIdx => { if (tds[colIdx] && tds[colIdx].innerText.toLowerCase().indexOf(search) > -1) { matchSearch = true; } });
                    var matchDate = true; if (fDate) { if (rowDate < new Date(fDate)) matchDate = false; } if (tDate) { var toDateObj = new Date(tDate); toDateObj.setHours(23, 59, 59, 999); if (rowDate > toDateObj) matchDate = false; }
                    tr[i].style.display = (matchSearch && matchDate) ? "" : "none";
                }
            }
        });
    }
    
    function clearDashFilters() { document.getElementById("dashFromDate").value = ""; document.getElementById("dashToDate").value = ""; document.getElementById("dashSearch").value = ""; filterDashboardTables(); }

    function filterCourierTable() {
        var fDate = document.getElementById("courierFromDate").value; var tDate = document.getElementById("courierToDate").value; var search = document.getElementById("courierSearch").value.toLowerCase(); var status = document.getElementById("courierStatusFilter").value.toLowerCase(); var tr = document.getElementById("parcelTable").getElementsByTagName("tr");
        for (var i = 1; i < tr.length; i++) {
            var tdDate = tr[i].getElementsByTagName("td")[1]; var tdId = tr[i].getElementsByTagName("td")[2]; var tdVeh = tr[i].getElementsByTagName("td")[5]; var tdStatus = tr[i].getElementsByTagName("td")[6];
            if (tdDate && tdId && tdVeh && tdStatus) {
                var rowDaTestr = tdDate.textContent || tdDate.innerText; var rowDate = new Date(rowDaTestr.split(" ")[0]);
                var matchSearch = (tdId.innerText.toLowerCase().indexOf(search) > -1) || (tdVeh.innerText.toLowerCase().indexOf(search) > -1);
                var matchStatus = (status === "" || status === "all statuses" || tdStatus.innerText.toLowerCase().indexOf(status) > -1); var matchDate = true;
                if (fDate) { if (rowDate < new Date(fDate)) matchDate = false; } if (tDate) { var toDateObj = new Date(tDate); toDateObj.setHours(23, 59, 59, 999); if (rowDate > toDateObj) matchDate = false; }
                tr[i].style.display = (matchSearch && matchStatus && matchDate) ? "" : "none";
            }
        }
    }
    function clearCourierFilters() { document.getElementById("courierFromDate").value = ""; document.getElementById("courierToDate").value = ""; document.getElementById("courierSearch").value = ""; document.getElementById("courierStatusFilter").value = "Pending"; filterCourierTable(); }  
    // ==========================================
    // CR UPLOAD MODULE FRONTEND LOGIC
    // ==========================================
    
    var globalPendingCR = [];

    async function loadPendingCRList() {
      try {
        const res = await apiCall('getPendingCRUploads', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
        globalPendingCR = res.data || [];
        var datalist = document.getElementById('pending_cr_list');
        datalist.innerHTML = "";
        
        globalPendingCR.forEach(item => {
          var option = document.createElement('option');
          option.value = item.vehNo;
          option.text = `Ref: ${item.refNo} | Branch: ${item.branch} | Comp: ${item.company}`;
          datalist.appendChild(option);
        });
      } catch (error) { console.error("Error loading pending CRs", error); }
    }

    function loadCRDetails() {
      var searchVal = document.getElementById('cr_search_input').value;
      var selected = globalPendingCR.find(x => x.vehNo === searchVal || x.refNo === searchVal);
      
      var detailsBox = document.getElementById('cr_details_box');
      var uploadSec = document.getElementById('cr_upload_section');
      
      if (selected) {
        document.getElementById('lbl_cr_ref').innerText = selected.refNo;
        document.getElementById('lbl_cr_veh').innerText = selected.vehNo;
        document.getElementById('lbl_cr_make').innerText = selected.makeModel;
        document.getElementById('lbl_cr_appdate').innerText = selected.appDate;
        document.getElementById('lbl_cr_branch').innerText = selected.branch;
        document.getElementById('lbl_cr_user').innerText = selected.reqUser;
        document.getElementById('cr_row_index').value = selected.row;
        
        detailsBox.style.display = 'block';
        uploadSec.style.display = 'block';
      } else {
        detailsBox.style.display = 'none';
        uploadSec.style.display = 'none';
      }
    }

    async function submitFinalCR() {
      var fileInput = document.getElementById('final_cr_file');
      var rowIndex = document.getElementById('cr_row_index').value;
      var vehNo = document.getElementById('lbl_cr_veh').innerText;
      var refNo = document.getElementById('lbl_cr_ref').innerText;

      if (fileInput.files.length === 0) {
        return Swal.fire("Required", "Please select a CR document to upload!", "warning");
      }

      var btn = document.getElementById('crSubmitBtn');
      btn.disabled = true;
      btn.innerText = "Processing File... ⏳";

      try {
        let f = fileInput.files[0];
        let base64Str, typeStr, nameStr;

        if (f.type === "application/pdf") { 
          btn.innerText = "Applying Seal to PDF... ⏳";
          base64Str = await watermarkPDF(f);
          typeStr = 'application/pdf'; 
          nameStr = f.name; 
        } else { 
          btn.innerText = "Applying Seal to Image... ⏳";
          let compressed = await compressAndWatermarkImage(f, 1000, 0.7); 
          base64Str = compressed.data; 
          typeStr = compressed.type; 
          nameStr = compressed.name; 
        }

        btn.innerText = "Uploading to Drive & Saving to Sheet... 🚀";
        
        var payload = {
          row: rowIndex,
          vehNo: vehNo,
          refNo: refNo,
          uploadedBy: currentUser.user,
          fileData: { base64: base64Str, type: typeStr, name: nameStr }
        };

        const serverRes = await apiCall('uploadFinalCR', payload);
        
        if (serverRes.success) {
          Swal.fire("Success", "Final CR Uploaded Successfully!", "success");
          document.getElementById('cr_search_input').value = "";
          document.getElementById('final_cr_file').value = "";
          document.getElementById('cr_details_box').style.display = 'none';
          document.getElementById('cr_upload_section').style.display = 'none';
          loadPendingCRList(); 
          loadDashboardStats(); 
        } else {
          Swal.fire("Error", serverRes.error, "error");
        }
      } catch (error) {
        Swal.fire("Error", error.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerText = "Upload & Save CR";
      }
    }

    async function loadCRHistory() {
      var tbody = document.querySelector("#crHistoryTable tbody");
      if(!tbody) return;
      tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Loading data...</td></tr>";
      
      try {
        const res = await apiCall('getCRUploadHistory', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
        tbody.innerHTML = "";
        if (!res.data || res.data.length === 0) {
          tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>No CR Upload History found.</td></tr>";
          return;
        }
        
        res.data.forEach(r => {
          var fileLink = `<a href="${r.crUrl}" target="_blank" style="background:#28a745; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold;">View Document</a>`;
          tbody.innerHTML += `<tr><td><b style="color:#e67e22;">${r.company}</b></td><td>${r.uploadDate}</td><td><b>${r.refNo}</b></td><td><span style="color:#0d6efd;font-weight:bold;">${r.vehNo}</span></td><td>${r.makeModel}</td><td>${r.uploadedBy}</td><td>${fileLink}</td></tr>`;
        });
      } catch(e) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; color:red;'>Error Loading Report</td></tr>";
      }
    }

    async function loadPendingCRTable() {
      var tbody = document.querySelector("#crPendingTable tbody");
      if(!tbody) return;
      tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Loading data...</td></tr>";
      
      try {
        const res = await apiCall('getPendingCRUploads', { role: currentUser.role, branch: currentUser.branch, email: currentUser.email }, 'GET');
        tbody.innerHTML = "";
        if (!res.data || res.data.length === 0) {
          tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No Pending CRs found.</td></tr>";
          return;
        }
        
        res.data.forEach(r => {
          var daysColor = r.pendingDays > 14 ? "color:red; font-weight:bold;" : "color:black;";
          tbody.innerHTML += `<tr><td><b style="color:#e67e22;">${r.company}</b></td><td>${r.valDate}</td><td><span style="color:#0d6efd;font-weight:bold;">${r.vehNo}</span></td><td>${r.branch}</td><td>${r.reqUser}</td><td style="${daysColor}">${r.pendingDays} Days</td></tr>`;
        });
      } catch(e) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error Loading Pending List</td></tr>";
      }
    }
window.addEventListener('DOMContentLoaded', async () => {
  const saved = Session.user();
  if (!saved || !saved.authToken) {
    document.getElementById('login-container').style.display='flex';
    document.getElementById('app-container').style.display='none';
    return;
  }
  try {
    const res = await apiCall('validateSession', {}, 'POST');
    if (res && res.user) { Session.set(Object.assign({}, saved, res)); proceedToDashboard(Session.user()); }
    else throw new Error('Invalid session');
  } catch(e) {
    Session.clear();
    document.getElementById('login-container').style.display='flex';
    document.getElementById('app-container').style.display='none';
  }
});
