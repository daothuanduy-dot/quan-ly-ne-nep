/* QLNN V3.0.5.25.10 - Bao vang - standalone module */
var BV25 = (function(){
  var root = null;
  var roster = [];
  var students = [];
  var selectedGrade = '';
  var selectedClass = '';
  var reportDate = '';
  var sessionName = 'Sáng';
  var autoSession = 'Sáng';
  var manualSession = false;

  function app(){ return window.App || {}; }
  function sb(){ return app().supabase; }
  function cfg(){ return app().appConfig || {namHoc:''}; }
  function esc(v){
    if (app().esc) return app().esc(v);
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function toast(msg,type){ if(app().toast) app().toast(msg,type || ''); else alert(msg); }
  function norm(v){ return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function gradeKey(v){ var m=String(v == null ? '' : v).match(/(?:khoi|khối)?\s*(10|11|12)/i); return m ? m[1] : String(v == null ? '' : v).replace(/[^0-9]/g,''); }
  function gradeLabel(v){ var k=gradeKey(v); return k ? 'Khối ' + k : String(v == null ? '' : v).trim(); }
  function sameGrade(a,b){ var x=gradeKey(a), y=gradeKey(b); return !!x && x === y; }
  function active(r){ var s=norm(r && r.trang_thai); return !s || s==='active' || s==='dang hoc' || s==='hoc' || s==='true' || s==='1'; }
  function dateLocal(d){ var y=d.getFullYear(); var m=String(d.getMonth()+1); var day=String(d.getDate()); if(m.length<2)m='0'+m; if(day.length<2)day='0'+day; return y+'-'+m+'-'+day; }
  function dateText(v){ if(!v)return ''; var m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(v); }
  function sortText(a,b){ return String(a).localeCompare(String(b),'vi',{numeric:true,sensitivity:'base'}); }
  function showError(msg){ if(root){ var box=root.querySelector('#absRows'); if(box)box.innerHTML='<div class="danger-box">'+esc(msg)+'</div>'; } }
  function reject(title,msg){ toast(title+': '+msg,'err'); }

  async function allRows(factory){
    var out=[], from=0, size=1000;
    while(true){
      var q=await factory().range(from,from+size-1);
      if(q.error) throw q.error;
      var rows=q.data || [];
      out=out.concat(rows);
      if(rows.length < size) break;
      from += size;
    }
    return out;
  }

  async function currentSession(now){
    var minutes=now.getHours()*60+now.getMinutes();
    try{
      var q=await sb().from('cai_dat_thoi_gian').select('buoi,gio_bat_dau_diem_danh,gio_ket_thuc_diem_danh').eq('nam_hoc',cfg().namHoc).eq('trang_thai','Học');
      if(!q.error){
        for(var i=0;i<(q.data||[]).length;i++){
          var r=q.data[i];
          var a=String(r.gio_bat_dau_diem_danh||'').slice(0,5);
          var b=String(r.gio_ket_thuc_diem_danh||'').slice(0,5);
          if(a && b){
            var ap=Number(a.slice(0,2))*60+Number(a.slice(3,5));
            var bp=Number(b.slice(0,2))*60+Number(b.slice(3,5));
            if(minutes>=ap && minutes<=bp) return r.buoi || 'Sáng';
          }
        }
      }
    }catch(e){}
    if(minutes>=840 && minutes<=1110) return 'Chiều';
    return minutes<840 ? 'Sáng' : 'Chiều';
  }

  function classList(){
    var m={}, out=[];
    for(var i=0;i<roster.length;i++){
      var r=roster[i];
      if(!active(r) || !r.lop) continue;
      var lop=String(r.lop).trim();
      if(!m[lop]) m[lop]={lop:lop,khoi:gradeLabel(r.khoi || lop)};
    }
    Object.keys(m).forEach(function(k){out.push(m[k]);});
    return out;
  }

  async function init(el){
    root=el;
    reportDate=dateLocal(new Date());
    autoSession=await currentSession(new Date());
    sessionName=autoSession;
    selectedGrade=''; selectedClass=''; students=[]; manualSession=false;
    render();
    await loadRoster();
    renderGrades();
  }

  function render(){
    root.innerHTML =
      '<div class="page-head"><div><h2>Báo Vắng Học Sinh</h2><p>Chọn ngày → buổi → khối → lớp → số học sinh vắng. Lớp có học nhưng vắng 0 vẫn phải được ghi nhận.</p></div><span class="badge ok">Năm học '+esc(cfg().namHoc)+'</span></div>'+
      '<div class="absence-top-grid">'+
      '<div class="absence-box"><div class="selector-title">📅 Thời gian báo vắng</div><div class="absence-inline"><label>Ngày<input id="bvDate" type="date" value="'+esc(reportDate)+'"></label></div><div class="auto-session-line"><b>Buổi hệ thống:</b> <span id="bvAuto">'+esc(autoSession)+'</span> <span class="badge">Tự động</span></div><div class="selector-hint">Buổi chiều bắt đầu từ 14:00, tiết 2. Có thể chọn báo bổ sung.</div><label class="manual-session-toggle"><input id="bvManual" type="checkbox"> Báo bổ sung / chọn lại buổi</label><select id="bvSession" disabled><option value="Sáng">Sáng</option><option value="Chiều">Chiều</option></select></div>'+ 
      '<div class="absence-box"><div class="selector-title">👥 Chọn khối</div><div id="bvGrades" class="absence-grade-grid"><span class="class-empty">Đang tải...</span></div></div>'+ 
      '<div class="absence-box"><div class="selector-title">🏫 Chọn lớp</div><div id="bvClasses" class="absence-class-grid"><span class="class-empty">Hãy chọn khối trước.</span></div></div>'+ 
      '<div class="absence-box"><div class="selector-title">👤 Số vắng</div><select id="bvCount" disabled><option value="">-- Chọn lớp trước --</option></select><div id="bvInfo" class="selector-hint">Chưa chọn lớp.</div></div></div>'+ 
      '<div id="absRows"><div class="empty">Hãy chọn khối, lớp và số học sinh vắng.</div></div>';

    root.querySelector('#bvDate').onchange=function(e){reportDate=e.target.value;};
    root.querySelector('#bvManual').onchange=function(e){
      manualSession=e.target.checked;
      var s=root.querySelector('#bvSession');
      s.disabled=!manualSession;
      if(manualSession)s.value=sessionName; else {sessionName=autoSession;s.value=autoSession;}
      checkScheduleNotice();
    };
    root.querySelector('#bvSession').onchange=function(e){sessionName=e.target.value;checkScheduleNotice();};
    root.querySelector('#bvCount').onchange=renderRows;
  }

  async function loadRoster(){
    try{
      roster=await allRows(function(){return sb().from('danh_sach').select('ma_hs,ho_ten,khoi,lop,ngay_sinh,trang_thai').not('lop','is',null).order('lop');});
      roster=roster.filter(active);
    }catch(e){showError('Không tải được danh sách học sinh: '+(e.message || e));}
  }

  function renderGrades(){
    var keys={};
    for(var i=0;i<roster.length;i++){var k=gradeKey(roster[i].khoi || roster[i].lop);if(k)keys[k]=true;}
    var arr=Object.keys(keys).sort(function(a,b){return Number(a)-Number(b);});
    var box=root.querySelector('#bvGrades');
    box.innerHTML=arr.map(function(k){return '<label class="absence-grade"><input type="radio" name="bvGrade" value="Khối '+k+'"><span>Khối '+k+'</span></label>';}).join('') || '<span class="class-empty">Không tìm thấy học sinh đang học.</span>';
    root.querySelectorAll('input[name="bvGrade"]').forEach(function(r){r.onchange=function(){selectGrade(r.value);};});
  }

  function selectGrade(g){
    selectedGrade=gradeLabel(g); selectedClass=''; students=[];
    var arr=classList().filter(function(x){return sameGrade(x.khoi,selectedGrade);});
    var scope=app().managedClasses ? app().managedClasses(app().Auth ? app().Auth.currentUser : null) : [];
    if(scope!==null && scope!==undefined) arr=arr.filter(function(x){return scope.indexOf(x.lop)>=0;});
    arr.sort(function(a,b){return sortText(a.lop,b.lop);});
    var box=root.querySelector('#bvClasses');
    box.innerHTML=arr.map(function(x){return '<label class="absence-class"><input type="radio" name="bvClass" value="'+esc(x.lop)+'"><span>'+esc(x.lop)+'</span></label>';}).join('') || '<span class="class-empty">Không có lớp trong phạm vi tài khoản.</span>';
    root.querySelector('#bvCount').disabled=true;
    root.querySelector('#bvCount').innerHTML='<option value="">-- Chọn lớp trước --</option>';
    root.querySelector('#absRows').innerHTML='';
    root.querySelectorAll('input[name="bvClass"]').forEach(function(r){r.onchange=function(){selectClass(r.value);};});
  }

  async function selectClass(cls){
    selectedClass=cls;
    students=roster.filter(function(s){return active(s) && String(s.lop||'').trim()===String(cls).trim() && sameGrade(s.khoi||s.lop,selectedGrade);});
    students.sort(function(a,b){return sortText(a.ho_ten||'',b.ho_ten||'');});
    var c=root.querySelector('#bvCount');
    c.disabled=false;
    var html='<option value="">-- Chọn số học sinh vắng --</option>';
    for(var i=0;i<=students.length;i++)html+='<option value="'+i+'">'+i+'</option>';
    c.innerHTML=html;
    root.querySelector('#bvInfo').innerHTML='<b>'+esc(cls)+'</b> · '+students.length+' học sinh · Chọn 0 nếu không có học sinh vắng.';
    await checkScheduleNotice();
    root.querySelector('#absRows').innerHTML='<div class="empty">Chọn số vắng. Chọn 0 để xác nhận lớp đã báo.</div>';
  }

  async function checkScheduleNotice(){
    if(!selectedClass)return;
    var ok=await hasSchedule(selectedClass,reportDate,sessionName);
    var info=root.querySelector('#bvInfo');
    if(info){
      info.innerHTML='<b>'+esc(selectedClass)+'</b> · '+students.length+' học sinh · '+(ok?'<span class="badge ok">Có lịch học</span>':'<span class="badge warn">Chưa có lịch học</span>');
    }
  }

  function row(i){
    var opts='<option value="">-- Chọn học sinh --</option>';
    for(var j=0;j<students.length;j++)opts+='<option value="'+j+'">'+esc(students[j].ho_ten)+' — '+esc(students[j].ngay_sinh || '')+'</option>';
    return '<div class="absence-row" data-row="'+i+'"><div class="absence-index">'+(i+1)+'</div><div class="absence-student-wrap"><label>Học sinh<select class="absence-student">'+opts+'</select></label></div><div class="absence-status"><span class="status-label">Trạng thái</span><label><input type="radio" name="bvStatus_'+i+'" value="Vắng có phép"> ✓ Có phép</label><label><input type="radio" name="bvStatus_'+i+'" value="Vắng không phép"> ✕ Không phép</label></div></div>';
  }

  function renderRows(){
    var c=root.querySelector('#bvCount'); var box=root.querySelector('#absRows');
    if(c.value===''){box.innerHTML='<div class="empty">Hãy chọn số học sinh vắng.</div>';return;}
    var n=Number(c.value||0);
    if(n===0){
      box.innerHTML='<div class="absence-panel zero-report"><h3>Không có học sinh vắng</h3><p>Lớp <b>'+esc(selectedClass)+'</b> sẽ được ghi nhận vắng 0 cho '+esc(sessionName)+' ngày '+dateText(reportDate)+'.</p><button id="bvSaveZero" class="btn primary">💾 Xác nhận lớp không có học sinh vắng</button></div>';
      root.querySelector('#bvSaveZero').onclick=saveZero;
      return;
    }
    var html='<div class="absence-panel"><h3>Danh sách học sinh vắng — '+esc(selectedClass)+'</h3><p>'+n+' học sinh cần xác nhận trạng thái.</p><div class="absence-list">';
    for(var i=0;i<n;i++)html+=row(i);
    html+='</div><div class="action-row"><button id="bvSave" class="btn primary">💾 Ghi nhận '+n+' học sinh vắng</button></div></div>';
    box.innerHTML=html;
    root.querySelectorAll('.absence-student').forEach(function(s){s.onchange=disableDuplicates;});
    root.querySelector('#bvSave').onclick=save;
  }

  function disableDuplicates(){
    var sels=Array.prototype.slice.call(root.querySelectorAll('.absence-student')); var chosen={};
    sels.forEach(function(s){if(s.value)chosen[s.value]=true;});
    sels.forEach(function(s){Array.prototype.forEach.call(s.options,function(o){if(o.value)o.disabled=!!chosen[o.value] && o.value!==s.value;});});
  }

  async function hasSchedule(cls,day,session){
    var d=new Date(day+'T12:00:00'); var dow=d.getDay(); var thu=dow===0?8:dow+1;
    var q=await sb().from('thoi_khoa_bieu').select('lop,khoi,thu,buoi,trang_thai').eq('nam_hoc',cfg().namHoc).eq('thu',thu).eq('buoi',session);
    if(q.error){toast('Không kiểm tra được TKB: '+q.error.message,'err');return false;}
    var rows=q.data || [];
    for(var i=0;i<rows.length;i++){
      var r=rows[i]; var st=norm(r.trang_thai);
      if(st && st!=='hoat dong' && st!=='active' && st!=='true' && st!=='1')continue;
      var lop=String(r.lop||'').trim(); var khoi=String(r.khoi||'').trim();
      if(lop && lop===String(cls).trim())return true;
      if(!lop && khoi && sameGrade(khoi,selectedGrade))return true;
      if(!lop && !khoi)return true;
    }
    return false;
  }

  function canReport(){
    var u=app().Auth ? app().Auth.currentUser : null;
    return app().canManageAbsence ? app().canManageAbsence(u,selectedClass) : false;
  }

  async function save(){
    if(!canReport()){reject('Không được phép báo vắng','Tài khoản hiện tại không có quyền báo vắng cho lớp '+selectedClass+'. Không ghi dữ liệu.');return;}
    if(!(await hasSchedule(selectedClass,reportDate,sessionName))){reject('Không ghi báo vắng','Lớp '+selectedClass+' chưa có lịch học '+sessionName+' ngày '+dateText(reportDate)+' trong TKB. Không ghi dữ liệu.');return;}
    var rows=Array.prototype.slice.call(root.querySelectorAll('.absence-row')); var payload=[];
    for(var i=0;i<rows.length;i++){
      var idx=rows[i].querySelector('.absence-student').value; var radio=rows[i].querySelector('input[type="radio"]:checked');
      if(idx===''){toast('Dòng '+(i+1)+': chưa chọn học sinh.','err');return;}
      if(!radio){toast('Dòng '+(i+1)+': chưa chọn Có phép/Không phép.','err');return;}
      var s=students[Number(idx)];
      payload.push({ma_hs:s.ma_hs,ho_ten:s.ho_ten,khoi:s.khoi,lop:s.lop,ngay_diem_danh:reportDate,buoi:sessionName,trang_thai:radio.value,chi_tiet:null,diem:0,ma_nguoi_cap_nhat:app().Auth && app().Auth.currentUser ? app().Auth.currentUser.ma_cb : null,ten_nguoi_cap_nhat:app().Auth && app().Auth.currentUser ? app().Auth.currentUser.ho_ten : null});
    }
    var q=await sb().from('diem_danh_master').insert(payload);
    if(q.error){toast('Không ghi được học sinh vắng: '+q.error.message,'err');return;}
    var e=await saveClassReport(payload.length);
    if(e){toast('Đã ghi học sinh nhưng chưa cập nhật trạng thái lớp: '+e,'err');return;}
    toast('Đã ghi nhận '+payload.length+' học sinh vắng.','ok');
  }

  async function saveZero(){
    if(!canReport()){reject('Không được phép báo vắng','Tài khoản hiện tại không có quyền báo vắng cho lớp '+selectedClass+'. Không ghi dữ liệu.');return;}
    if(!(await hasSchedule(selectedClass,reportDate,sessionName))){reject('Không ghi báo vắng','Lớp '+selectedClass+' chưa có lịch học '+sessionName+' ngày '+dateText(reportDate)+' trong TKB. Không ghi dữ liệu.');return;}
    var e=await saveClassReport(0);
    if(e){toast('Không ghi được trạng thái lớp: '+e,'err');return;}
    toast('Đã xác nhận '+selectedClass+': vắng 0.','ok');
  }

  async function saveClassReport(count){
    var base={nam_hoc:cfg().namHoc,ngay_bao:reportDate,buoi:sessionName,khoi:selectedGrade,lop:selectedClass,so_vang:count};
    var q=await sb().from('bao_vang_lop').select('nam_hoc,ngay_bao,buoi,lop,so_vang').eq('nam_hoc',cfg().namHoc).eq('ngay_bao',reportDate).eq('buoi',sessionName).eq('lop',selectedClass).limit(1);
    if(q.error)return q.error.message;
    if(q.data && q.data.length){var u=await sb().from('bao_vang_lop').update(base).eq('nam_hoc',cfg().namHoc).eq('ngay_bao',reportDate).eq('buoi',sessionName).eq('lop',selectedClass);return u.error ? u.error.message : null;}
    var i=await sb().from('bao_vang_lop').insert(base);return i.error ? i.error.message : null;
  }

  return {init:init};
})();
export async function init(el){ return BV25.init(el); }
